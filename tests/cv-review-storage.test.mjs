import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saveReview, readReviews, jobIdentity } from '../src/lib/cvReviewStorage.ts'

const input = { url: 'https://www.linkedin.com/jobs/view/developer-123?utm_source=test', cv: 'CV A', description: 'Job A', source: 'cv.pdf', cvId: 'file-a', result: { matchScore: 50 } }
function memory() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }

test('restores full analysis and isolates accounts', async () => {
  const storage = memory()
  await saveReview('alice', input, storage)
  const restored = readReviews('alice', storage)[0]
  assert.equal(restored.cv, input.cv)
  assert.equal(restored.description, input.description)
  assert.deepEqual(restored.result, input.result)
  assert.deepEqual(readReviews('bob', storage), [])
})

test('keeps distinct jobs, CVs, and edited versions; deduplicates repeat analysis', async () => {
  const storage = memory()
  await saveReview('alice', input, storage)
  await saveReview('alice', { ...input, url: 'https://www.linkedin.com/jobs/view/123' }, storage)
  assert.equal(readReviews('alice', storage).length, 1)
  await saveReview('alice', { ...input, cv: 'CV B' }, storage)
  await saveReview('alice', { ...input, url: 'https://www.linkedin.com/jobs/view/456' }, storage)
  assert.equal(readReviews('alice', storage).length, 3)
  assert.equal(jobIdentity(input.url), 'linkedin:123')
})

test('storage failures propagate so the UI never reports a false save', async () => {
  await assert.rejects(saveReview('alice', input, { getItem: () => null, setItem: () => { throw Error('Quota exceeded') } }))
  assert.throws(() => readReviews('alice', { getItem: () => '{broken' }))
})
