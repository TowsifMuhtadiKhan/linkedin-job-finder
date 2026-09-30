import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../supabase/functions/search-portals/handler.ts'

const request = (criteria = {}, extra = {}) => new Request('https://local.test', {
  method: 'POST', body: JSON.stringify({ criteria: { source: 'indeed', keywords: ['React'], location: 'New York', ...criteria }, ...extra }),
})

test('missing provider is explicit and never returns fake or redirected listings', async () => {
  const handler = createHandler(() => undefined, () => { throw new Error('Must not fetch') })
  const response = await handler(request())
  assert.equal(response.status, 503)
  assert.equal((await response.json()).code, 'PROVIDER_NOT_CONFIGURED')
})

test('normalizes all four sources, excludes other boards and unsafe or deceptive URLs', async () => {
  for (const [source, host] of [['indeed', 'www.indeed.com'], ['glassdoor', 'www.glassdoor.com'], ['handshake', 'app.joinhandshake.com'], ['ziprecruiter', 'www.ziprecruiter.com']]) {
    const handler = createHandler(() => 'test-key', async () => Response.json({ jobs: [
      { title: 'Developer', company_name: 'Example', location: 'NY', description: 'Build software', apply_links: [{ link: `https://${host}/job/1?utm_source=google` }] },
      { title: 'Duplicate', apply_links: [{ link: `https://${host}/job/1?utm_source=other` }] },
      ...['https://linkedin.com/jobs/1', `https://${host}.evil.test/job`, 'javascript:alert(1)', `http://${host}/job`].map(link => ({ title: 'Wrong', apply_links: [{ link }] })),
    ] }))
    const response = await handler(request({ source }))
    const data = await response.json()
    assert.equal(data.jobs.length, 1)
    assert.equal(data.jobs[0].source, source)
    assert.ok(data.jobs[0].id.startsWith(source + ':'))
    assert.equal(data.jobs[0].postedDate, null)
    assert.equal(data.hasMore, false)
  }
})

test('forwards query and opaque pagination token without following provider URLs', async () => {
  const handler = createHandler(() => 'test-key', async (value, options) => {
    const url = new URL(value)
    assert.equal(url.origin, 'https://www.searchapi.io')
    assert.equal(url.pathname, '/api/v1/search')
    assert.equal(url.searchParams.has('api_key'), false)
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.equal(url.searchParams.get('next_page_token'), 'cursor+&123')
    assert.equal(url.searchParams.get('location'), 'New York')
    assert.match(url.searchParams.get('q'), /STEM OPT/)
    return Response.json({ jobs: [], pagination: { next_page_token: 'next', next: 'https://evil.test' } })
  })
  const data = await (await handler(request({ workAuthorization: 'STEM OPT' }, { nextPageToken: 'cursor+&123' }))).json()
  assert.deepEqual(data.jobs, [])
  assert.equal(data.hasMore, true)
  assert.equal(data.nextPageToken, 'next')
})

test('invalid requests do not spend provider quota', async () => {
  const handler = createHandler(() => 'key', () => { throw new Error('Must not fetch') })
  for (const criteria of [{ source: 'unknown' }, { keywords: [] }, { keywords: [null] }, { location: {} }, { workAuthorization: 'unknown' }]) {
    assert.equal((await handler(request(criteria))).status, 400)
  }
})

test('provider errors do not disclose API credentials', async () => {
  for (const body of [{ error: 'secret-key invalid' }, { jobs: {} }]) {
    const response = await createHandler(() => 'secret-key', async () => Response.json(body))(request())
    assert.equal(response.status, 502)
    assert.equal((await response.text()).includes('secret-key'), false)
  }
})
