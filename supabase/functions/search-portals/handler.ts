const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const portals = { indeed: 'indeed.com', glassdoor: 'glassdoor.com', handshake: 'joinhandshake.com', ziprecruiter: 'ziprecruiter.com' }
type Portal = keyof typeof portals

function portalLink(value: unknown, source: Portal): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const domain = portals[source]
    if (url.protocol !== 'https:' || url.username || url.password || !(url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return null
    return url.toString()
  } catch { return null }
}

export function createHandler(getKey: () => string | undefined, request: typeof fetch = fetch) {
  return async (req: Request) => {
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    if (req.method === 'OPTIONS') return reply(null)
    if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    let body
    try { body = await req.json() } catch { return reply({ error: 'Invalid search request.' }, 400) }
    const { criteria, nextPageToken } = body || {}
    if (!criteria || !Object.hasOwn(portals, criteria.source)) return reply({ error: 'Unsupported job portal.' }, 400)
    const source = criteria.source as Portal
    const keywords = Array.isArray(criteria.keywords) ? criteria.keywords : [criteria.keywords]
    if (!keywords.length || keywords.length > 10 || keywords.some((k: unknown) => typeof k !== 'string' || !k.trim() || k.length > 100)
      || (criteria.location !== undefined && (typeof criteria.location !== 'string' || criteria.location.length > 250))
      || (criteria.workAuthorization && !['OPT', 'CPT', 'STEM OPT', 'H1B'].includes(criteria.workAuthorization))
      || (nextPageToken !== undefined && (typeof nextPageToken !== 'string' || nextPageToken.length > 10000))) {
      return reply({ error: 'Use 1–10 keywords (up to 100 characters each) and a valid location.' }, 400)
    }
    const key = getKey()
    if (!key) return reply({ error: 'This portal’s in-app search is not connected yet. The site owner must configure the job-data service.', code: 'PROVIDER_NOT_CONFIGURED' }, 503)
    const authorization = criteria.workAuthorization === 'H1B' ? '(H1B OR "H-1B")' : criteria.workAuthorization ? `"${criteria.workAuthorization}"` : ''
    const query = [`(${keywords.map((k: string) => k.trim()).join(' OR ')})`, authorization, source].filter(Boolean).join(' ')
    const params = new URLSearchParams({ engine: 'google_jobs', q: query, hl: 'en' })
    if (criteria.location?.trim()) params.set('location', criteria.location.trim())
    if (nextPageToken) params.set('next_page_token', nextPageToken)
    try {
      const response = await request(`https://www.searchapi.io/api/v1/search?${params}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(25000) })
      if (!response.ok) return reply({ error: 'The job-data service is unavailable. Please try again later.' }, 502)
      const data = await response.json()
      if (data.error || !Array.isArray(data.jobs)) {
        if (!data.error && data.search_information?.jobs_results_state === 'Fully empty') return reply({ jobs: [], total: 0, hasMore: false })
        return reply({ error: 'The job-data service could not complete this search.' }, 502)
      }
      const jobs = new Map()
      for (const row of data.jobs) {
        if (!row || typeof row.title !== 'string' || !row.title.trim()) continue
        const links = Array.isArray(row.apply_links) ? row.apply_links : []
        const url = [...links.map((option: { link?: unknown } | null) => portalLink(option?.link, source)), portalLink(row.apply_link, source)].find(Boolean)
        if (!url) continue
        const canonical = new URL(url)
        for (const name of [...canonical.searchParams.keys()]) if (name.startsWith('utm_')) canonical.searchParams.delete(name)
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical.toString()))
        const id = `${source}:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`
        jobs.set(id, { id, title: row.title, company: typeof row.company_name === 'string' ? row.company_name : null,
          location: typeof row.location === 'string' ? row.location : null, url, source,
          postedDate: null, logo: null,
          description: typeof row.description === 'string' ? row.description : null })
      }
      const next = typeof data.pagination?.next_page_token === 'string' ? data.pagination.next_page_token : undefined
      return reply({ jobs: [...jobs.values()], total: jobs.size, hasMore: !!next, nextPageToken: next })
    } catch { return reply({ error: 'The job-data service timed out or returned an invalid response. Please try again.' }, 502) }
  }
}
