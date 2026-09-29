import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../supabase/functions/search-bdjobs/handler.ts'
import { createHandler as descriptionHandler } from '../supabase/functions/job-description/handler.ts'
test('search merges keywords and featured listings without ID collisions', async () => {
  const handler = createHandler(async url => {
    const params = new URL(url).searchParams
    assert.equal(params.get('isPro'), '0')
    assert.equal(params.get('pg'), '2')
    return Response.json({ statuscode: '1', data: [{ Jobid: '123', jobTitle: 'Developer' }], premiumData: [{ Jobid: '123', jobTitle: 'Developer' }], common: { totalpages: 3 } })
  })
  const result = await handler(new Request('https://local.test', { method: 'POST', body: JSON.stringify({ keywords: ['react', 'typescript'], page: 2 }) }))
  const data = await result.json()
  assert.equal(data.jobs.length, 1)
  assert.equal(data.jobs[0].id, 'bdjobs:123')
  assert.equal(data.jobs[0].url, 'https://bdjobs.com/h/details/123')
  assert.equal(data.hasMore, true)
})
test('invalid keyword batches never reach Bdjobs', async () => {
  const handler = createHandler(async () => { throw new Error('Must not fetch') })
  assert.equal((await handler(new Request('https://local.test', { method: 'POST', body: JSON.stringify({ keywords: [] }) }))).status, 400)
})
test('Bdjobs descriptions include responsibilities and education', async () => {
  const handler = descriptionHandler(() => 'https://auth.test', async url => {
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'user' })
    assert.ok(url.startsWith('https://gateway.bdjobs.com/jobapply/api/JobSubsystem/Job-Details?jobId=123&'))
    return Response.json({ data: [{ JobFound: 'True', JobDescription: '<p>Build applications</p>', EducationRequirements: '<p>Relevant degree</p>' }] })
  })
  const result = await handler(new Request('https://local.test', { method: 'POST', body: JSON.stringify({ url: 'https://bdjobs.com/h/details/123' }) }))
  const data = await result.json()
  assert.ok(data.html.includes('Build applications'))
  assert.ok(data.html.includes('Relevant degree'))
})
