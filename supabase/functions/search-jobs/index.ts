// Supabase Edge Function: search-jobs
// Proxies LinkedIn job search to avoid CORS and keeps API calls server-side.
// Deploy with: supabase functions deploy search-jobs
// Set secret: supabase secrets set LINKEDIN_TOKEN=<optional>

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── LinkedIn code maps ──────────────────────────────────────────────────────

const JOB_TYPE_CODES: Record<string, string> = {
  'full-time': 'F',
  'part-time': 'P',
  contract: 'C',
  temporary: 'T',
  internship: 'I',
  volunteer: 'V',
}

const EXPERIENCE_CODES: Record<string, string> = {
  internship: '1',
  entry: '2',
  associate: '3',
  'mid-senior': '4',
  director: '5',
  executive: '6',
}

const DATE_POSTED_CODES: Record<string, string> = {
  '24h': 'r86400',
  week: 'r604800',
  month: 'r2592000',
}

// ── HTML parser ─────────────────────────────────────────────────────────────

interface Job {
  id: string
  title: string
  company: string
  location: string
  postedDate: string
  url: string
  logo: string | null
}

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseLinkedInHTML(html: string): Job[] {
  if (!html) return []

  const jobs: Job[] = []
  const liBlocks = html.split(/<\/li>/).filter(Boolean)

  for (const block of liBlocks) {
    try {
      const urlMatch = block.match(
        /href="((?:https:\/\/[a-z0-9-]+\.linkedin\.com)?\/jobs\/view\/[^"?]+)/
      )
      if (!urlMatch) continue

      let url = urlMatch[1]
      if (url.startsWith('/')) {
        url = `https://www.linkedin.com${url}`
      } else {
        url = url.replace(/^https:\/\/[a-z0-9-]+\.linkedin\.com/, 'https://www.linkedin.com')
      }
      const idMatch = url.match(/\/jobs\/view\/[^/]+-(\d+)$/)
      const id = idMatch ? idMatch[1] : crypto.randomUUID()

      const titleMatch = block.match(
        /class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/
      )
      const title = titleMatch ? stripTags(titleMatch[1]) : ''
      if (!title) continue

      const companyMatch = block.match(
        /class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/
      )
      const company = companyMatch ? stripTags(companyMatch[1]) : ''

      const locationMatch = block.match(
        /class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/
      )
      const location = locationMatch ? stripTags(locationMatch[1]) : ''

      const dateMatch = block.match(/datetime="([^"]+)"/)
      const postedDate = dateMatch ? dateMatch[1] : ''

      const logoMatch = block.match(/data-delayed-url="([^"]+)"/)
      const logo = logoMatch ? logoMatch[1] : null

      jobs.push({ id, title, company, location, postedDate, url, logo, source: 'linkedin' })
    } catch {
      // skip malformed blocks
    }
  }

  return jobs
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { criteria, token, start = 0 } = await req.json()

    // ── Build LinkedIn guest API params ─────────────────────────────────────
    const params = new URLSearchParams({
      keywords: criteria.keywords || '',
      location: criteria.location || '',
      start: String(start),
    })

    if (criteria.remote) params.set('f_WT', '2')
    if (criteria.jobType && JOB_TYPE_CODES[criteria.jobType]) {
      params.set('f_JT', JOB_TYPE_CODES[criteria.jobType])
    }
    if (criteria.experience && EXPERIENCE_CODES[criteria.experience]) {
      params.set('f_E', EXPERIENCE_CODES[criteria.experience])
    }
    if (criteria.datePosted && DATE_POSTED_CODES[criteria.datePosted]) {
      params.set('f_TPR', DATE_POSTED_CODES[criteria.datePosted])
    }

    // ── Fetch from LinkedIn guest API ───────────────────────────────────────
    const linkedinUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`

    const linkedinRes = await fetch(linkedinUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!linkedinRes.ok) {
      throw new Error(`LinkedIn returned ${linkedinRes.status}`)
    }

    const html = await linkedinRes.text()
    const jobs = parseLinkedInHTML(html)

    // ── Optionally verify LinkedIn token & get profile ──────────────────────
    let profile = null
    const bearerToken = token || Deno.env.get('LINKEDIN_TOKEN')

    if (bearerToken) {
      try {
        const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${bearerToken}` },
        })
        if (profileRes.ok) {
          const data = await profileRes.json()
          profile = {
            name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
            email: data.email,
            picture: data.picture,
          }
        }
      } catch {
        // Token verification is optional — ignore failures
      }
    }

    return new Response(
      JSON.stringify({ jobs, total: jobs.length, profile }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message, jobs: [], total: 0 }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
