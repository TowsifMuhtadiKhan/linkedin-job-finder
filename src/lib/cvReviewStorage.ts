import type { analyzeCV } from './cvAnalysis'

export interface SavedReview {
  id: string
  url: string
  description: string
  cv: string
  source: string
  cvId: string
  savedAt: string
  result: ReturnType<typeof analyzeCV>
}

export function jobIdentity(value: string): string {
  try {
    const url = new URL(value)
    if (url.hostname.endsWith('linkedin.com')) {
      const id = url.pathname.match(/\/jobs\/view\/(?:.*-)?(\d+)\/?$/)?.[1]
      if (id) return `linkedin:${id}`
    }
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_') || ['trackingId', 'refId'].includes(key)) url.searchParams.delete(key)
    return url.toString()
  } catch { return value.trim() }
}

export function readReviews(userId: string, storage: Pick<Storage, 'getItem'> = localStorage): SavedReview[] {
  const raw = storage.getItem(`cv-reviews-v1:${userId}`)
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Saved reviews could not be read.')
  return parsed.filter((entry): entry is SavedReview => entry && ['id', 'url', 'description', 'cv', 'source', 'cvId', 'savedAt'].every(key => typeof entry[key] === 'string'))
}

export async function saveReview(userId: string, input: Omit<SavedReview, 'id' | 'savedAt'>, storage: Storage = localStorage): Promise<SavedReview[]> {
  const identity = JSON.stringify([jobIdentity(input.url), input.cvId, input.cv, input.description])
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
  const id = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  const entry = { ...input, id, savedAt: new Date().toISOString() }
  const reviews = [entry, ...readReviews(userId, storage).filter(review => review.id !== id)]
  storage.setItem(`cv-reviews-v1:${userId}`, JSON.stringify(reviews))
  return reviews
}
