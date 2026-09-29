import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../supabase/functions/job-description/handler.ts'
const env = name => name === 'SUPABASE_URL' ? 'https://auth.test' : 'key'
const req = url => new Request('https://function.test', { method: 'POST', body: JSON.stringify({ url }) })
test('rejects unauthenticated callers before retrieving LinkedIn content', async () => {
  const handler = createHandler(env, async () => new Response('{}', { status: 401 }))
  assert.equal((await handler(req('https://www.linkedin.com/jobs/view/123'))).status, 401)
})
test('blocks arbitrary hosts and only fetches a constructed LinkedIn endpoint', async () => {
  const calls = []
  const handler = createHandler(env, async url => {
    calls.push(url)
    return new Response(url.includes('/auth/v1/user') ? '{}' : '<div>description</div>')
  })
  assert.equal((await handler(req('https://evil.test/jobs/view/123'))).status, 400)
  assert.equal(calls.length, 1)
  const result = await handler(req('https://www.linkedin.com/jobs/view/software-engineer-123456'))
  assert.equal(result.status, 200)
  assert.equal(calls.at(-1), 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/123456')
})
test('blocked LinkedIn responses instruct users to paste the description', async () => {
  const handler = createHandler(env, async url => new Response('{}', { status: url.includes('/auth/v1/user') ? 200 : 429 }))
  const result = await handler(req('https://www.linkedin.com/jobs/view/123'))
  assert.equal(result.status, 502)
  assert.match((await result.json()).error, /Paste/)
})
