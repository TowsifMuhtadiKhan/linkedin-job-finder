import { supabase } from './supabase'

const POPULAR_KEYWORDS = [
  'React',
  'Node.js',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Engineer',
  'Python',
  'JavaScript',
  'TypeScript',
  'DevOps Engineer',
  'Next.js',
  'Golang',
  'Java',
  'Flutter',
  'Mobile Developer',
  'Data Analyst',
  'UI/UX Designer',
  'QA Engineer',
  'Product Manager',
  'Machine Learning',
  'AWS',
  'PostgreSQL',
  'Docker',
]

const POPULAR_LOCATIONS = [
  'Bangladesh',
  'Dhaka',
  'Remote',
  'London',
  'New York',
  'Toronto',
  'Berlin',
  'Singapore',
  'Sydney',
  'Dubai',
  'India',
  'United States',
  'United Kingdom',
  'Germany',
  'Canada',
]

const CACHE_KEY = 'app_search_keywords_cache_v1'

interface CachedItem {
  keyword: string
  category: 'keyword' | 'location'
  count: number
}

function getLocalCache(): CachedItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalCache(items: CachedItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(0, 200)))
  } catch {
    // Ignore storage quota
  }
}

let isRemoteTableAvailable: boolean | null = null
let checkingPromise: Promise<boolean> | null = null

async function checkRemoteTable(): Promise<boolean> {
  if (isRemoteTableAvailable !== null) return isRemoteTableAvailable
  if (!supabase) {
    isRemoteTableAvailable = false
    return false
  }
  if (checkingPromise) return checkingPromise

  checkingPromise = (async () => {
    try {
      const { error } = await supabase.from('search_keywords').select('id').limit(1)
      if (error) {
        // Table not created yet or inaccessible
        isRemoteTableAvailable = false
        return false
      }
      isRemoteTableAvailable = true
      return true
    } catch {
      isRemoteTableAvailable = false
      return false
    } finally {
      checkingPromise = null
    }
  })()

  return checkingPromise
}

/**
 * Record searched keywords or locations into the general database (Supabase)
 * and update local cache for instant suggestions.
 */
export async function recordSearchKeywords(
  rawInput: string[] | string | undefined,
  category: 'keyword' | 'location' = 'keyword'
): Promise<void> {
  if (!rawInput) return

  const list = (Array.isArray(rawInput) ? rawInput : rawInput.split(','))
    .map((k) => k.trim())
    .filter((k) => k.length >= 2 && k.length <= 80)

  if (!list.length) return

  // 1. Update local cache immediately
  const cache = getLocalCache()
  for (const item of list) {
    const existingIndex = cache.findIndex(
      (c) => c.category === category && c.keyword.toLowerCase() === item.toLowerCase()
    )
    if (existingIndex >= 0) {
      cache[existingIndex].count += 1
    } else {
      cache.unshift({ keyword: item, category, count: 1 })
    }
  }
  setLocalCache(cache)

  // 2. Persist to shared Supabase search_keywords table in the background if table exists
  const hasRemoteTable = await checkRemoteTable()
  if (!hasRemoteTable || !supabase) return

  try {
    for (const item of list) {
      const { data: existing } = await supabase
        .from('search_keywords')
        .select('id, search_count')
        .eq('category', category)
        .ilike('keyword', item)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('search_keywords')
          .update({
            search_count: (existing.search_count || 1) + 1,
            last_searched_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('search_keywords').insert({
          keyword: item,
          category,
          search_count: 1,
          last_searched_at: new Date().toISOString(),
        })
      }
    }
  } catch {
    // Gracefully ignore database errors
  }
}

/**
 * Fetch keyword/location suggestions combining preset popular items,
 * local cached history, and shared Supabase database entries.
 */
export async function fetchKeywordSuggestions(
  query: string,
  category: 'keyword' | 'location' = 'keyword'
): Promise<string[]> {
  const cleanQuery = query.trim().toLowerCase()
  const presets = category === 'keyword' ? POPULAR_KEYWORDS : POPULAR_LOCATIONS
  const cache = getLocalCache().filter((c) => c.category === category)

  const candidates = new Map<string, number>()

  // Add presets with base score
  presets.forEach((p, idx) => {
    candidates.set(p, 50 - idx)
  })

  // Add local cache with recorded counts
  cache.forEach((c) => {
    const current = candidates.get(c.keyword) || 0
    candidates.set(c.keyword, current + c.count * 10)
  })

  // Fetch live from Supabase search_keywords if available
  const hasRemoteTable = await checkRemoteTable()
  if (hasRemoteTable && supabase) {
    try {
      let req = supabase
        .from('search_keywords')
        .select('keyword, search_count')
        .eq('category', category)
        .order('search_count', { ascending: false })
        .limit(15)

      if (cleanQuery) {
        req = req.ilike('keyword', `%${cleanQuery}%`)
      }

      const { data } = await req
      if (Array.isArray(data)) {
        for (const row of data) {
          if (row.keyword) {
            const current = candidates.get(row.keyword) || 0
            candidates.set(row.keyword, Math.max(current, (row.search_count || 1) * 20))
          }
        }
      }
    } catch {
      // Fallback silently
    }
  }

  // Filter and rank suggestions
  const sorted = Array.from(candidates.entries())
    .filter(([kw]) => {
      if (!cleanQuery) return true
      return kw.toLowerCase().includes(cleanQuery)
    })
    .sort(([aKw, aScore], [bKw, bScore]) => {
      const aLower = aKw.toLowerCase()
      const bLower = bKw.toLowerCase()

      const aPrefix = cleanQuery ? aLower.startsWith(cleanQuery) : false
      const bPrefix = cleanQuery ? bLower.startsWith(cleanQuery) : false

      if (aPrefix && !bPrefix) return -1
      if (!aPrefix && bPrefix) return 1

      return bScore - aScore
    })
    .map(([kw]) => kw)

  return sorted.slice(0, 8)
}
