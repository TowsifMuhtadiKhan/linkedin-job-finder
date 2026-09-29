import type { Job, SearchCriteria, SearchResult } from '../types'

const jobTypes: Record<string, string> = { 'full-time': 'F', 'part-time': 'P', contract: 'C', temporary: 'T', internship: 'I', volunteer: 'V' }
const experienceLevels: Record<string, string> = { internship: '1', entry: '2', associate: '3', 'mid-senior': '4', director: '5', executive: '6' }
const dates: Record<string, string> = { '24h': 'r86400', week: 'r604800', month: 'r2592000' }

export async function searchLocalLinkedIn(criteria: SearchCriteria, keywords: string, page: number): Promise<SearchResult> {
  const params = new URLSearchParams({ keywords, location: criteria.location || '', start: String((page - 1) * 10) })
  if (criteria.remote) params.set('f_WT', '2')
  if (jobTypes[criteria.jobType]) params.set('f_JT', jobTypes[criteria.jobType])
  if (experienceLevels[criteria.experience]) params.set('f_E', experienceLevels[criteria.experience])
  if (dates[criteria.datePosted]) params.set('f_TPR', dates[criteria.datePosted])

  let response = await fetch(`/linkedin-proxy/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`, { signal: AbortSignal.timeout(30000) })
  if (response.status === 429) {
    // Wait briefly and retry once if LinkedIn rate limits
    await new Promise((resolve) => setTimeout(resolve, 1500))
    response = await fetch(`/linkedin-proxy/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`, { signal: AbortSignal.timeout(30000) })
  }

  if (!response.ok) throw new Error(`LinkedIn search returned ${response.status}. Please try again shortly.`)
  const document = new DOMParser().parseFromString(await response.text(), 'text/html')
  if (document.querySelector('form[action*="login"], form[action*="checkpoint"]')) {
    throw new Error('LinkedIn temporarily blocked this search. Please try again later.')
  }
  const jobs: Job[] = []
  for (const card of document.querySelectorAll('li')) {
    const link = card.querySelector<HTMLAnchorElement>('a[href*="/jobs/view/"]')
    const title =
      card.querySelector('.base-search-card__title')?.textContent?.trim() ||
      card.querySelector('.base-card__full-link .sr-only')?.textContent?.trim() ||
      link?.textContent?.trim()
    if (!link || !title) continue

    const rawHref = link.getAttribute('href') || link.href
    let url: URL
    try {
      url = new URL(rawHref, 'https://www.linkedin.com')
    } catch {
      continue
    }

    // Match linkedin.com as well as country subdomains like bd.linkedin.com, uk.linkedin.com, etc.
    if (!url.hostname.endsWith('linkedin.com')) continue
    url.protocol = 'https:'
    url.hostname = 'www.linkedin.com'
    url.search = ''

    jobs.push({
      id: url.pathname.match(/(\d+)\/?$/)?.[1] || url.href,
      title,
      company:
        card.querySelector('.base-search-card__subtitle')?.textContent?.trim() ||
        card.querySelector('.job-search-card__subtitle')?.textContent?.trim() ||
        '',
      location:
        card.querySelector('.job-search-card__location')?.textContent?.trim() ||
        card.querySelector('.base-search-card__metadata .job-search-card__location')?.textContent?.trim() ||
        '',
      postedDate:
        card.querySelector('time')?.getAttribute('datetime') ||
        card.querySelector('time')?.textContent?.trim() ||
        '',
      logo:
        card.querySelector('img')?.getAttribute('data-delayed-url') ||
        card.querySelector('img')?.getAttribute('src') ||
        null,
      url: url.href,
      source: 'linkedin',
    })
  }
  return { jobs, total: jobs.length, hasMore: jobs.length > 0 }
}
