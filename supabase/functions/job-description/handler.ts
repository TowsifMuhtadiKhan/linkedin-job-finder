const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
export function createHandler(env: (name: string) => string | undefined, request: typeof fetch = fetch) {
return async (req: Request) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
  try {
    const auth = await request(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { Authorization: req.headers.get('authorization') || '', apikey: env('SUPABASE_ANON_KEY') || '' } })
    if (!auth.ok) return reply({ error: 'Please sign in to retrieve a job description.' }, 401)
    if (Number(req.headers.get('content-length')) > 4096) return reply({ error: 'Invalid request.' }, 400)
    const { url } = await req.json()
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && ['bdjobs.com', 'www.bdjobs.com', 'jobs.bdjobs.com'].includes(parsed.hostname)) {
      const jobId = parsed.pathname.match(/^\/h\/details\/(\d+)\/?$/)?.[1] || (parsed.pathname.toLowerCase() === '/jobdetails.asp' ? parsed.searchParams.get('id') : null)
      if (!jobId || !/^\d+$/.test(jobId)) return reply({ error: 'Use a Bdjobs job details URL.' }, 400)
      const response = await request(`https://gateway.bdjobs.com/jobapply/api/JobSubsystem/Job-Details?jobId=${jobId}&ln=1&IsCorporate=false`, { redirect: 'error', signal: AbortSignal.timeout(20000) })
      if (!response.ok) return reply({ error: 'Bdjobs could not provide this description. Paste it below.' }, 502)
      const data = await response.json()
      const job = data.data?.[0]
      if (!job || job.JobFound !== 'True' || !job.JobDescription) return reply({ error: 'The Bdjobs description is unavailable. Paste it below.' }, 404)
      return reply({ html: `<div class="description__text">${[job.JobDescription, job.EducationRequirements, job.SkillsRequired, job.experience, job.AdditionJobRequirements].filter(v => typeof v === 'string').join('\n')}</div>` })
    }
    const id = parsed.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/)?.[1]
    if (parsed.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(parsed.hostname) || !id) return reply({ error: 'Use a LinkedIn or Bdjobs job URL, or paste the description.' }, 400)
    const result = await request(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`, { redirect: 'error', signal: AbortSignal.timeout(20000) })
    if (!result.ok) return reply({ error: 'LinkedIn could not provide this description. Paste it from the original listing below.' }, 502)
    const html = await result.text()
    return reply({ html: html.slice(0, 500000) })
  } catch { return reply({ error: 'Could not retrieve the description. Paste it from the job listing below.' }, 502) }
}
}
