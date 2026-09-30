import { isProviderPortal, searchKeywords } from '../lib/jobPortals'
import type { SearchCriteria, SearchResult, LinkedInProfile, Job } from '../types'
import { supabase } from '../lib/supabase'
import { searchLocalLinkedIn } from '../lib/linkedinSearch'

// Use the existing server-side LinkedIn guest search proxy.
export async function searchJobs(criteria: SearchCriteria, token: string, page = 1, nextPageToken?: string): Promise<SearchResult> {
  if (isProviderPortal(criteria.source)) {
    if (!supabase) throw new Error('Configure Supabase to search this portal.')
    if (page > 1 && !nextPageToken) throw new Error('Please start a new search to load this portal?s results.')
    const { data, error } = await supabase.functions.invoke<SearchResult & { error?: string }>('search-portals', {
      body: { criteria, nextPageToken },
    })
    if (error) {
      const detail = error.context instanceof Response ? await error.context.json().catch(() => null) : null
      throw new Error(detail?.error || 'This portal?s search service is not available yet. The site owner must deploy and configure search-portals.')
    }
    if (data?.error) throw new Error(data.error)
    if (!Array.isArray(data?.jobs)) throw new Error('The portal returned an invalid response.')
    return data
  }
  if (criteria.source === 'bdjobs') {
    if (!supabase) throw new Error('Configure Supabase to search Bdjobs.')
    const keywords = (Array.isArray(criteria.keywords) ? criteria.keywords : [criteria.keywords])
      .map(k => k.trim()).filter(Boolean)
      .map(k => [k, criteria.workAuthorization].filter(Boolean).join(' '))
    const { data, error } = await supabase.functions.invoke('search-bdjobs', { body: { keywords, page } })
    if (error) {
      const detail = error.context instanceof Response ? await error.context.json().catch(() => null) : null
      throw new Error(detail?.error || 'Bdjobs search failed. Please try again.')
    }
    if (!Array.isArray(data?.jobs)) throw new Error('Bdjobs returned an invalid result.')
    const jobs = (data.jobs as Job[]).map((job) => ({
      ...job,
      source: 'bdjobs' as const,
    }))
    return { ...data, jobs }
  }
  const locations = [...new Set((criteria.location || '').split(',').map((value) => value.trim()).filter(Boolean))]
  const locList = locations.length ? locations : ['']
  const results: SearchResult[] = []
  let lastError: unknown = null

  for (let i = 0; i < locList.length; i++) {
    const location = locList[i]
    const remote = criteria.remote || location.toLowerCase() === 'remote'

    if (i > 0) {
      // Throttle multiple location requests to avoid triggering LinkedIn 429 rate limit
      await new Promise((resolve) => setTimeout(resolve, 600))
    }

    try {
      const res = await searchLocation(
        { ...criteria, remote, location: location.toLowerCase() === 'remote' ? '' : location },
        token,
        page
      )
      results.push(res)
    } catch (err) {
      lastError = err
    }
  }

  // If all locations failed, bubble up the error
  if (results.length === 0 && lastError) {
    throw lastError
  }

  const jobs = [
    ...new Map(
      results
        .flatMap((result) => result.jobs)
        .map((job) => [job.id, { ...job, source: (job.source || 'linkedin') as 'linkedin' | 'bdjobs' }])
    ).values(),
  ]
  return { jobs, total: jobs.length, hasMore: results.some((result) => result.hasMore) }
}

async function searchLocation(criteria: SearchCriteria, token: string, page: number): Promise<SearchResult> {
  const keywords = searchKeywords(criteria)
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
