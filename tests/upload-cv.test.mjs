import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../supabase/functions/upload-cv/handler.ts'

const environment = (name) => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'test', GOOGLE_DRIVE_CLIENT_ID: 'owner', GOOGLE_DRIVE_CLIENT_SECRET: 'secret', GOOGLE_DRIVE_REFRESH_TOKEN: 'refresh' })[name]
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })
function upload(name = 'cv.pdf', bytes = '%PDF-1.7 sample', authenticated = true) {
  const body = new FormData()
  body.append('file', new File([bytes], name))
  return new Request('https://example.test/upload-cv', { method: 'POST', headers: authenticated ? { Authorization: 'Bearer user-token' } : {}, body })
}
function backend({ authStatus = 200, driveStatus = 200, driveError, tokenStatus = 200, env = environment } = {}) {
  const calls = []
  const handler = createHandler(env, async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/auth/v1/user')) return response({ id: 'user-123', email: 'person@example.test' }, authStatus)
    if (url.includes('oauth2.googleapis.com')) return response({ access_token: 'owner-access' }, tokenStatus)
    if (url.includes('upload/drive')) return response(driveError || { id: 'new-cv' }, driveStatus)
    throw new Error('Unexpected request')
  })
  return { handler, calls }
}

test('all users upload into the fixed owner folder with server-verified identity', async () => {
  const { handler, calls } = backend()
  const result = await handler(upload())
  assert.equal(result.status, 201)
  assert.deepEqual(await result.json(), { id: 'new-cv' })
  assert.equal(calls[2].options.headers.Authorization, 'Bearer owner-access')
  const body = await calls[2].options.body.text()
  assert.ok(body.includes('"parents":["1wao-YqO_31acRc-U4xsxQJGZgW65AFFc"]'))
  assert.ok(body.includes('person@example.test'))
  assert.ok(body.includes('%PDF-1.7 sample'))
})
test('rejects signed-out and expired sessions before contacting Google', async () => {
  const first = backend()
  assert.equal((await first.handler(upload('cv.pdf', '%PDF-', false))).status, 401)
  assert.equal(first.calls.length, 0)
  const expired = backend({ authStatus: 401 })
  assert.equal((await expired.handler(upload())).status, 401)
  assert.equal(expired.calls.length, 1)
})
test('rejects invalid extensions, disguised files, empty files and oversized streams', async () => {
  for (const [name, bytes, status] of [
    ['cv.exe', '%PDF-hello', 400], ['cv.pdf', 'not a pdf', 400], ['cv.docx', '', 400],
    ['cv.pdf', new Uint8Array(5 * 1024 * 1024 + 1), 413],
    ['cv.pdf', new Uint8Array(6 * 1024 * 1024), 413],
  ]) {
    const { handler, calls } = backend()
    assert.equal((await handler(upload(name, bytes))).status, status)
    assert.equal(calls.length, 1)
  }
})
test('missing owner configuration returns a useful unavailable response', async () => {
  const { handler, calls } = backend({ env: name => name.startsWith('GOOGLE_') ? undefined : environment(name) })
  assert.equal((await handler(upload())).status, 503)
  assert.equal(calls.length, 1)
})
test('Google failures never produce a success receipt', async () => {
  assert.equal((await backend({ tokenStatus: 400 }).handler(upload())).status, 503)
  assert.equal((await backend({ driveStatus: 403 }).handler(upload())).status, 502)
})
test('preflight is allowed and other methods are rejected', async () => {
  const { handler, calls } = backend()
  assert.equal((await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status, 200)
  assert.equal((await handler(new Request('https://example.test', { method: 'DELETE' }))).status, 405)
  assert.equal(calls.length, 0)
})

test('CV listing is scoped to the verified user and fixed folder', async () => {
  const handler = createHandler(environment, async (url) => {
    if (url.endsWith('/auth/v1/user')) return response({ id: 'user-123', email: 'person@example.test' })
    if (url.includes('oauth2.googleapis.com')) return response({ access_token: 'owner-access' })
    const query = new URL(url).searchParams.get('q')
    assert.ok(query.includes("value='user-123'"))
    assert.ok(query.includes("'1wao-YqO_31acRc-U4xsxQJGZgW65AFFc' in parents"))
    return response({ files: [{ id: 'cv', name: 'user-123_123456_cv.pdf' }] })
  })
  const result = await handler(new Request('https://example.test', { headers: { Authorization: 'Bearer test' } }))
  assert.equal(result.status, 200)
  assert.equal((await result.json()).files[0].name, 'cv.pdf')
})

test('preview rejects other users, other folders and trashed files before downloading', async () => {
  for (const meta of [
    { parents: ['1wao-YqO_31acRc-U4xsxQJGZgW65AFFc'], appProperties: { submittedBy: 'other-user' } },
    { parents: ['other-folder'], appProperties: { submittedBy: 'user-123' } },
    { parents: ['1wao-YqO_31acRc-U4xsxQJGZgW65AFFc'], appProperties: { submittedBy: 'user-123' }, trashed: true },
  ]) {
    const handler = createHandler(environment, async (url) => {
      if (url.endsWith('/auth/v1/user')) return response({ id: 'user-123', email: 'person@example.test' })
      if (url.includes('oauth2.googleapis.com')) return response({ access_token: 'owner-access' })
      assert.ok(!url.includes('alt=media'))
      return response(meta)
    })
    assert.equal((await handler(new Request('https://example.test?fileId=cv', { headers: { Authorization: 'Bearer test' } }))).status, 404)
  }
})

test('owner can load a private PDF without exposing the Google access token', async () => {
  const handler = createHandler(environment, async (url) => {
    if (url.endsWith('/auth/v1/user')) return response({ id: 'user-123', email: 'person@example.test' })
    if (url.includes('oauth2.googleapis.com')) return response({ access_token: 'owner-access' })
    if (url.includes('alt=media')) return new Response('%PDF-1.7 test')
    return response({ parents: ['1wao-YqO_31acRc-U4xsxQJGZgW65AFFc'], appProperties: { submittedBy: 'user-123' }, mimeType: 'application/pdf' })
  })
  const result = await handler(new Request('https://example.test?fileId=cv', { headers: { Authorization: 'Bearer test' } }))
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('content-type'), 'application/pdf')
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.equal(await result.text(), '%PDF-1.7 test')
})

test('Drive setup errors return actionable messages without raw upstream details', async () => {
  for (const reason of ['accessNotConfigured', 'insufficientFilePermissions', 'storageQuotaExceeded', 'notFound']) {
    const { handler } = backend({ driveStatus: 403, driveError: { error: {
      message: 'private upstream detail', errors: [{ reason }],
    } } })
    const result = await handler(upload())
    assert.equal(result.status, 502)
    const body = await result.json()
    assert.equal(body.code, reason)
    assert.ok(!body.error.includes('private upstream detail'))
    assert.ok(!body.error.includes('unknown'))
  }
})
