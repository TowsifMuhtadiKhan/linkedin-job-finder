import type { SearchCriteria, SearchResult, LinkedInProfile } from '../types'
import { supabase } from '../lib/supabase'
import { searchLocalLinkedIn } from '../lib/linkedinSearch'

// Use the existing server-side LinkedIn guest search proxy.
export async function searchJobs(criteria: SearchCriteria, token: string, page = 1): Promise<SearchResult> {
  const locations = [...new Set((criteria.location || '').split(',').map((value) => value.trim()).filter(Boolean))]
  const results = []
  for (const location of locations.length ? locations : ['']) {
    const remote = criteria.remote || location.toLowerCase() === 'remote'
    results.push(await searchLocation({ ...criteria, remote, location: location.toLowerCase() === 'remote' ? '' : location }, token, page))
  }
  const jobs = [...new Map(results.flatMap((result) => result.jobs).map((job) => [job.id, job])).values()]
  return { jobs, total: jobs.length, hasMore: results.some((result) => result.hasMore) }
}

async function searchLocation(criteria: SearchCriteria, token: string, page: number): Promise<SearchResult> {
  const keywords = Array.isArray(criteria.keywords)
    ? criteria.keywords.map((keyword) => keyword.trim()).filter(Boolean).join(' OR ')
    : (criteria.keywords || '').trim()
  if (!keywords) throw new Error('Please add at least one keyword.')
  if (import.meta.env.DEV) return searchLocalLinkedIn(criteria, keywords, page)
  if (!supabase) throw new Error('Configure Supabase to search for jobs.')

  const { data, error } = await supabase.functions.invoke<SearchResult & { error?: string }>('search-jobs', {
    body: { criteria: { ...criteria, keywords }, token, start: (page - 1) * 10 },
  })
  if (error) {
    if (error.context?.status === 404) {
      throw new Error('The search service is not deployed yet. Please deploy the search-jobs Supabase function.')
    }
    let detail
    try { detail = await error.context?.json() } catch { /* Non-JSON network error */ }
    throw new Error(detail?.error || detail?.message || error.message || 'Search failed. Please try again.')
  }
  if (data?.error) throw new Error(data.error)
  if (!Array.isArray(data?.jobs)) throw new Error('The search service returned an invalid response.')
  return { ...data, hasMore: data.hasMore ?? data.jobs.length > 0 }
}

/**
 * Fetch LinkedIn profile info using the provided access token.
 */
export async function fetchLinkedInProfile(token: string): Promise<LinkedInProfile | null> {
  if (!token) return null
  try {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      email: data.email,
      picture: data.picture,
    }
  } catch {
    return null
  }
}
