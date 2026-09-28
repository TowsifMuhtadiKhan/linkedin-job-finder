// ── JSearch (RapidAPI) job search ──────────────────────────────────────────
// JSearch indexes LinkedIn, Indeed, Glassdoor etc. and returns direct LinkedIn URLs.
// Free tier: 500 requests/month — https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

const JSEARCH_HOST = 'jsearch.p.rapidapi.com'

// Map our criteria values to JSearch params
const EMPLOYMENT_TYPE_MAP = {
  'full-time': 'FULLTIME',
  'part-time': 'PARTTIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
}

const DATE_POSTED_MAP = {
  '24h': 'today',
  week: 'week',
  month: 'month',
}

const EXPERIENCE_MAP = {
  internship: 'no_experience',
  entry: 'under_3_years_experience',
  associate: 'under_3_years_experience',
  'mid-senior': 'more_than_3_years_experience',
  director: 'more_than_3_years_experience',
  executive: 'more_than_3_years_experience',
}

/** Join keyword array into search query string */
function buildQuery(criteria) {
  const keywords = Array.isArray(criteria.keywords)
    ? criteria.keywords.join(' ')
    : (criteria.keywords || '')

  const location =
    criteria.remote ? 'remote' : criteria.location || ''

  return location ? `${keywords} ${location}`.trim() : keywords
}

/** Map JSearch API response item → our Job format */
function mapJob(item) {
  const location = [item.job_city, item.job_state, item.job_country]
    .filter(Boolean)
    .join(', ')

  return {
    id: item.job_id || Math.random().toString(36).slice(2),
    title: item.job_title || 'Unknown Role',
    company: item.employer_name || '',
    location,
    postedDate: item.job_posted_at_datetime_utc || '',
    url: item.job_apply_link || item.job_url || '#',
    logo: item.employer_logo || null,
    isRemote: item.job_is_remote || false,
    employmentType: item.job_employment_type || '',
    source: item.job_publisher || 'LinkedIn',
  }
}

/**
 * Search jobs via JSearch API (RapidAPI).
 * Called directly from the browser — no backend needed.
 */
export async function searchJobs(criteria, _linkedinToken, rapidApiKey, page = 1) {
  if (!rapidApiKey) {
    throw new Error('NO_API_KEY')
  }

  const query = buildQuery(criteria)
  if (!query.trim()) throw new Error('Please add at least one keyword.')

  const params = new URLSearchParams({
    query,
    page: String(page),
    num_pages: '1',
  })

  if (criteria.remote) {
    params.set('remote_jobs_only', 'true')
  }

  if (criteria.jobType && EMPLOYMENT_TYPE_MAP[criteria.jobType]) {
    params.set('employment_types', EMPLOYMENT_TYPE_MAP[criteria.jobType])
  }

  if (criteria.datePosted && DATE_POSTED_MAP[criteria.datePosted]) {
    params.set('date_posted', DATE_POSTED_MAP[criteria.datePosted])
  }

  if (criteria.experience && EXPERIENCE_MAP[criteria.experience]) {
    params.set('job_requirements', EXPERIENCE_MAP[criteria.experience])
  }

  const res = await fetch(`https://${JSEARCH_HOST}/search?${params}`, {
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': JSEARCH_HOST,
    },
  })

  if (res.status === 403 || res.status === 401) {
    throw new Error('Invalid RapidAPI key. Please check your key and try again.')
  }
  if (res.status === 429) {
    throw new Error('API rate limit reached. You have used your free tier quota for this month.')
  }
  if (!res.ok) {
    throw new Error(`Search failed (${res.status}). Please try again.`)
  }

  const data = await res.json()
  const jobs = (data.data || []).map(mapJob)

  return {
    jobs,
    total: data.status === 'OK' ? jobs.length : 0,
    hasMore: jobs.length === 10,
  }
}

/**
 * Fetch LinkedIn profile info using the provided access token.
 */
export async function fetchLinkedInProfile(token) {
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
