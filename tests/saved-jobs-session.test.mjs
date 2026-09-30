import { test } from 'node:test'
import assert from 'node:assert/strict'

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
}
globalThis.window = { localStorage: globalThis.localStorage }
const job = id => ({ id, title: id, company: null, location: null, postedDate: null, url: 'https://linkedin.com/jobs/view/1', logo: null })
localStorage.setItem('linkedin-job-finder-v2', JSON.stringify({ version: 0, state: { savedJobs: [job('legacy')] } }))
const { default: store } = await import('../src/store/useAppStore.ts')

test('legacy unowned cache is preserved without being shown to guests', () => {
  assert.deepEqual(store.getState().savedJobs, [])
  assert.equal(store.getState().legacySavedJobs[0].id, 'legacy')
})

test('sign-out restores guest jobs and account switching clears account data', () => {
  store.getState().saveJob(job('guest'))
  store.getState().setSavedJobsOwner('account-a')
  assert.deepEqual(store.getState().savedJobs, [])
  store.getState().setSavedJobs([job('private-a')])
  const epoch = store.getState().savedJobsEpoch
  store.getState().setSavedJobsOwner('account-b')
  assert.ok(store.getState().savedJobsEpoch > epoch)
  assert.deepEqual(store.getState().savedJobs, [])
  store.getState().setSavedJobs([job('private-b')])
  store.getState().setSavedJobsOwner(null)
  assert.deepEqual(store.getState().savedJobs.map(j => j.id), ['guest'])
})

test('only guest jobs persist and reload never restores account jobs', async () => {
  store.getState().setSavedJobsOwner('account-a')
  store.getState().setSavedJobs([job('private-a')])
  const persisted = JSON.parse(localStorage.getItem('linkedin-job-finder-v2')).state
  assert.equal(persisted.savedJobs, undefined)
  assert.deepEqual(persisted.guestJobs.map(j => j.id), ['guest'])
  await store.persist.rehydrate()
  assert.equal(store.getState().savedJobsOwner, null)
  assert.deepEqual(store.getState().savedJobs.map(j => j.id), ['guest'])
})
