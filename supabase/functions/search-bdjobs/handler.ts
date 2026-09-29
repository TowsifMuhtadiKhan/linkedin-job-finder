const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
interface Listing { Jobid: string; jobTitle: string; companyName?: string; location?: string; publishDate?: string; logoUrl?: string }
export function createHandler(request: typeof fetch = fetch) {
  return async (req: Request) => {
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    try {
      const { keywords, page = 1 } = await req.json()
      if (!Array.isArray(keywords) || !keywords.length || keywords.length > 10 || keywords.some(k => typeof k !== 'string' || !k.trim() || k.length > 100) || !Number.isInteger(page) || page < 1 || page > 1000) return reply({ error: 'Use 1–10 keywords, each up to 100 characters.' }, 400)
      const jobs = new Map()
      let hasMore = false
      for (const keyword of [...new Set(keywords)]) {
        const params = new URLSearchParams({ keyword, pg: String(page), rpp: '10', isPro: '0', ToggleJobs: 'true' })
        const result = await request(`https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch?${params}`, { signal: AbortSignal.timeout(20000) })
        if (!result.ok) return reply({ error: 'Bdjobs search is temporarily unavailable. Please try again.' }, 502)
        const data = await result.json()
        if (data.statuscode !== '1' || !Array.isArray(data.data) || !Array.isArray(data.premiumData)) return reply({ error: 'Bdjobs returned an unexpected response. Please try again later.' }, 502)
        hasMore ||= page < Number(data.common?.totalpages || 0)
        for (const row of [...data.premiumData, ...data.data] as Listing[]) {
          if (!/^\d+$/.test(String(row.Jobid)) || !row.jobTitle) continue
          const id = `bdjobs:${row.Jobid}`
          jobs.set(id, { id, title: row.jobTitle, company: row.companyName || '', location: row.location || '', postedDate: row.publishDate || null,
            logo: row.logoUrl?.startsWith('https://') ? row.logoUrl : null, url: `https://bdjobs.com/h/details/${row.Jobid}` })
        }
      }
      return reply({ jobs: [...jobs.values()], total: jobs.size, hasMore })
    } catch { return reply({ error: 'Could not search Bdjobs. Please try again.' }, 502) }
  }
}
