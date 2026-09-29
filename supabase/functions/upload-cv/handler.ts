type Environment = (name: string) => string | undefined
const folderId = '1wao-YqO_31acRc-U4xsxQJGZgW65AFFc'
const maxFileSize = 5 * 1024 * 1024
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function createHandler(env: Environment, request: typeof fetch = fetch) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Method not allowed.' }, 405)
    const authorization = req.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in to upload your CV.' }, 401)
    try {
      // Validate the user's token with Auth, never trust client-supplied identity.
      const authResponse = await request(`${env('SUPABASE_URL')}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: env('SUPABASE_ANON_KEY') || '' },
        signal: AbortSignal.timeout(15000),
      })
      if (!authResponse.ok) return json({ error: 'Your session expired. Please sign in again.' }, 401)
      const user = await authResponse.json()
      if (!user.id || !user.email || user.is_anonymous) return json({ error: 'Please sign in with your email account.' }, 401)
      const clientId = env('GOOGLE_DRIVE_CLIENT_ID')
      const clientSecret = env('GOOGLE_DRIVE_CLIENT_SECRET')
      const refreshToken = env('GOOGLE_DRIVE_REFRESH_TOKEN')
      if (!clientId || !clientSecret || !refreshToken) {
        return json({ error: 'CV uploads are not available yet. Please contact the portal administrator.' }, 503)
      }
      if (req.method === 'GET') {
        const refreshed = await request('https://oauth2.googleapis.com/token', {
          method: 'POST', body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
          signal: AbortSignal.timeout(15000),
        })
        const token = await refreshed.json()
        if (!refreshed.ok || !token.access_token) return json({ error: 'CV storage is unavailable. Please contact the portal administrator.' }, 503)
        const headers = { Authorization: `Bearer ${token.access_token}` }
        const url = new URL(req.url)
        const id = url.searchParams.get('fileId')
        if (id) {
          if (!/^[\w-]+$/.test(id)) return json({ error: 'Invalid file.' }, 400)
          const metaResponse = await request(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,mimeType,parents,appProperties,trashed&supportsAllDrives=true`, { headers })
          if (!metaResponse.ok) return json({ error: 'CV not found.' }, 404)
          const meta = await metaResponse.json()
          if (meta.trashed || !meta.parents?.includes(folderId) || meta.appProperties?.submittedBy !== user.id) return json({ error: 'CV not found.' }, 404)
          const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          if (!allowed.includes(meta.mimeType)) return json({ error: 'Unsupported CV format.' }, 400)
          const media = await request(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers, signal: AbortSignal.timeout(60000) })
          if (!media.ok) return json({ error: 'Could not load this CV. Please try again.' }, 502)
          return new Response(media.body, { headers: { ...cors, 'Content-Type': meta.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
        }
        const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        const params = new URLSearchParams({
          q: `'${folderId}' in parents and trashed = false and appProperties has { key='submittedBy' and value='${escape(user.id)}' }`,
          fields: 'files(id,name,mimeType,size,createdTime),nextPageToken', orderBy: 'createdTime desc', pageSize: '100',
        })
        if (url.searchParams.get('pageToken')) params.set('pageToken', url.searchParams.get('pageToken')!)
        const listed = await request(`https://www.googleapis.com/drive/v3/files?${params}`, { headers, signal: AbortSignal.timeout(15000) })
        if (!listed.ok) return json({ error: 'Could not load uploaded CVs. Check the Google Drive connection and try again.' }, 502)
        const result = await listed.json()
        return json({ files: (result.files || []).map((file: { name: string }) => ({ ...file, name: file.name.replace(new RegExp(`^${user.id}_\\d+_`), '') })), nextPageToken: result.nextPageToken })
      }
      const contentType = req.headers.get('content-type') || ''
      if (!contentType.startsWith('multipart/form-data')) return json({ error: 'Choose a CV file to upload.' }, 400)
      // Bound the actual stream, including requests without Content-Length.
      const reader = req.body?.getReader()
      if (!reader) return json({ error: 'Choose a CV file to upload.' }, 400)
      const chunks: Uint8Array[] = []
      let length = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > maxFileSize + 64 * 1024) {
          await reader.cancel()
          return json({ error: 'Your CV must be 5 MB or smaller.' }, 413)
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      let form: FormData
      try {
        form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData()
      } catch { return json({ error: 'Invalid upload. Please choose your file again.' }, 400) }
      const file = form.get('file')
      if (!(file instanceof File) || form.getAll('file').length !== 1 || file.size === 0) {
        return json({ error: 'Choose one non-empty CV file.' }, 400)
      }
      if (file.size > maxFileSize) return json({ error: 'Your CV must be 5 MB or smaller.' }, 413)
      const ext = file.name.split('.').pop()?.toLowerCase()
      const signatures: Record<string, { type: string; magic: number[] }> = {
        pdf: { type: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },
        doc: { type: 'application/msword', magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
        docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [0x50, 0x4b, 0x03, 0x04] },
      }
      const format = ext ? signatures[ext] : undefined
      const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
      if (!format || !format.magic.every((byte, i) => header[i] === byte)) {
        return json({ error: 'Please upload a valid PDF, DOC, or DOCX file.' }, 400)
      }
      const tokenResponse = await request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
        signal: AbortSignal.timeout(15000),
      })
      if (!tokenResponse.ok) return json({ error: 'The CV storage connection needs attention. Please contact the portal administrator.' }, 503)
      const token = await tokenResponse.json()
      if (!token.access_token) return json({ error: 'CV storage is temporarily unavailable.' }, 503)
      const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(-120)
      const metadata = {
        name: `${user.id}_${Date.now()}_${safeName}`,
        parents: [folderId],
        description: `CV submitted through LinkedIn Job Finder by ${user.email}`,
        appProperties: { submittedBy: user.id },
      }
      const boundary = `cv_${crypto.randomUUID()}`
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: ${format.type}\r\n\r\n`, file,
        `\r\n--${boundary}--\r\n`,
      ])
      const uploaded = await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id', {
        method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body, signal: AbortSignal.timeout(60000),
      })
      if (!uploaded.ok) {
        const failure = await uploaded.json().catch(() => null)
        const rawReason = failure?.error?.errors?.[0]?.reason ?? failure?.error?.details?.[0]?.reason
        const reason = typeof rawReason === 'string' && /^[a-zA-Z_]+$/.test(rawReason) ? rawReason : 'unknown'
        const messages: Record<string, string> = {
          accessNotConfigured: 'Google Drive API is not enabled for the portal. The administrator must enable it in Google Cloud and retry.',
          SERVICE_DISABLED: 'Google Drive API is not enabled for the portal. The administrator must enable it in Google Cloud and retry.',
          insufficientFilePermissions: 'The connected Google account cannot upload to the CV folder. The folder owner must grant it Editor access.',
          notFound: 'The CV folder could not be found by the connected Google account. Check the folder and its sharing permissions.',
          storageQuotaExceeded: 'The connected Google Drive account is out of storage. The administrator must free space before more CVs can be uploaded.',
          insufficientPermissions: 'The Google connection lacks permission to upload files. The administrator must reconnect with the Google Drive scope.',
          ACCESS_TOKEN_SCOPE_INSUFFICIENT: 'The Google connection lacks permission to upload files. The administrator must reconnect with the Google Drive scope.',
          rateLimitExceeded: 'Google Drive is receiving too many requests. Please try again shortly.',
          userRateLimitExceeded: 'Google Drive is receiving too many requests. Please try again shortly.',
          domainPolicy: 'The Google Workspace administrator has blocked this Drive integration.',
        }
        // Log only status and reason, never Google tokens, CV contents or user data.
        console.error('CV Drive upload rejected', { status: uploaded.status, reason })
        return json({
          error: messages[reason] || `Google Drive rejected the upload (HTTP ${uploaded.status}, ${reason}). Please contact the portal administrator.`,
          code: reason,
        }, 502)
      }
      const result = await uploaded.json()
      if (!result.id) return json({ error: 'The upload could not be confirmed. Please contact the portal administrator.' }, 502)
      return json({ id: result.id }, 201)
    } catch {
      return json({ error: 'Upload interrupted. Please try again.' }, 502)
    }
  }
}
