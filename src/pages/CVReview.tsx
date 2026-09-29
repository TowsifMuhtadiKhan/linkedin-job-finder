import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getCV } from '../lib/cvStorage'
import { extractCV } from '../lib/extractCV'
import { analyzeCV } from '../lib/cvAnalysis'

interface StoredCV { id: string; name: string }
export default function CVReview() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  // Reset private document state when the signed-in account changes.
  if (loading) return <p role="status">Loading your account…</p>
  if (!user) return <div className="card p-6">Sign in to compare your CV with a job. <Link to="/auth" className="text-[#0077B5]">Sign in</Link></div>
  return <ReviewForm key={`${user.id}-${params.get('job') || ''}`} initialUrl={params.get('job') || ''} />
}

function ReviewForm({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl)
  const [description, setDescription] = useState('')
  const [cv, setCV] = useState('')
  const [files, setFiles] = useState<StoredCV[]>([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [source, setSource] = useState('')
  const [result, setResult] = useState<ReturnType<typeof analyzeCV> | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const all: StoredCV[] = []
      let next = ''
      do {
        const response = await getCV(next ? `?pageToken=${encodeURIComponent(next)}` : '')
        const data = await response.json()
        all.push(...data.files)
        next = data.nextPageToken || ''
      } while (next && active)
      if (active) { setFiles(all); setSelected(all[0]?.id || '') }
    }
    void load().catch(err => { if (active) setListError(err.message) })
    return () => { active = false }
  }, [])

  async function fetchDescription() {
    setBusy('description'); setError(''); setResult(null)
    try {
      const { data, error } = await supabase!.functions.invoke('job-description', { body: { url } })
      if (error) {
        const detail = error.context instanceof Response ? await error.context.json().catch(() => null) : null
        throw new Error(detail?.error || 'Could not retrieve the description. Paste it below instead.')
      }
      const document = new DOMParser().parseFromString(data.html, 'text/html')
      const section = document.querySelector('.show-more-less-html__markup, .description__text')
      if (!section) throw new Error('The job site did not return a readable description. Paste it below instead.')
      section.querySelectorAll('script,style').forEach(node => node.remove())
      section.querySelectorAll('br').forEach(node => node.replaceWith('\n'))
      section.querySelectorAll('p,li,h2,h3').forEach(node => node.append('\n'))
      const text = section.textContent?.trim() || ''
      if (text.length < 100) throw new Error('The retrieved description is incomplete. Paste the full description below.')
      setDescription(text.slice(0, 40000))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not retrieve this job.') }
    finally { setBusy('') }
  }

  async function loadDocument(file?: File) {
    setBusy('cv'); setError(''); setResult(null)
    try {
      const stored = files.find(f => f.id === selected)
      if (!file && !stored) throw new Error('Choose a CV first.')
      const blob = file || await (await getCV(`?fileId=${encodeURIComponent(selected)}`)).blob()
      const name = file?.name || stored!.name
      const text = await extractCV(blob, name)
      if (text.trim().length < 100) throw new Error('Not enough readable CV text. Paste the full CV below.')
      setCV(text.slice(0, 60000)); setSource(name)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not read this CV. Paste its text below.') }
    finally { setBusy('') }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 p-3 text-sm disabled:opacity-50'
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">CV & job match</h1><p className="text-sm text-gray-500 mt-2">Compare your CV with a job description and get practical, free feedback.</p></div>
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">1. Job description</h2>
        <label className="block text-sm" htmlFor="job-url">LinkedIn or Bdjobs job URL</label>
        <div className="flex flex-wrap gap-2"><input id="job-url" type="url" value={url} onChange={e => setUrl(e.target.value)} disabled={!!busy} className={`${inputClass} flex-1 min-w-0`} placeholder="https://www.linkedin.com/jobs/view/…" />
          <button type="button" disabled={!!busy || !url} onClick={() => void fetchDescription()} className="btn-primary disabled:opacity-50">{busy === 'description' ? 'Fetching…' : 'Get description'}</button></div>
        <label htmlFor="job-description" className="block text-sm">Review the fetched description, or paste it here</label>
        <textarea id="job-description" rows={8} maxLength={40000} value={description} disabled={!!busy} onChange={e => { setDescription(e.target.value); setResult(null) }} className={inputClass} placeholder="Include responsibilities, required skills, and qualifications." />
      </div>
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">2. Your CV</h2>
        {listError && <p role="alert" className="text-sm text-amber-700">{listError} You can still select a local file or paste your CV.</p>}
        {files.length > 0 && <div className="flex flex-wrap gap-2"><label htmlFor="stored-cv" className="w-full text-sm">Choose an uploaded CV</label><select id="stored-cv" value={selected} disabled={!!busy} onChange={e => setSelected(e.target.value)} className={`${inputClass} flex-1 min-w-0`}>{files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <button type="button" onClick={() => void loadDocument()} disabled={!!busy || !selected} className="btn-primary disabled:opacity-50">Use this CV</button></div>}
        <label htmlFor="review-file" className="block text-sm">Or choose a PDF or DOCX from your device (up to 5 MB)</label>
        <input id="review-file" type="file" accept=".pdf,.docx" disabled={!!busy} className="text-sm max-w-full" onChange={e => { const file = e.target.files?.[0]; if (file) void loadDocument(file); e.target.value = '' }} />
        <p className="text-xs text-gray-500">Local files are read in your browser and are not uploaded. Scanned PDFs and older DOC files need pasted text.</p>
        {busy === 'cv' && <p role="status" className="text-sm">Reading CV text…</p>}
        <label htmlFor="cv-text" className="block text-sm">CV text{source ? ` — loaded from ${source}` : ''}</label>
        <textarea id="cv-text" value={cv} rows={10} maxLength={60000} disabled={!!busy} onChange={e => { setCV(e.target.value); setResult(null) }} className={inputClass} placeholder="Load a CV above or paste its text. Check the reading order before analyzing." />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="button" disabled={!!busy || cv.trim().length < 100 || description.trim().length < 100} className="btn-primary disabled:opacity-50" onClick={() => {
        setError(''); try { setResult(analyzeCV(cv, description)) } catch (err) { setError(err instanceof Error ? err.message : 'Could not analyze this CV.') }
      }}>Analyze my CV</button>
      <p className="text-xs text-gray-500">English-language, rule-based estimates—not an employer ATS score or a prediction of hiring success. Analysis stays in your browser.</p>
      {result && <div className="card p-6 space-y-6" aria-live="polite">
        <h2 className="text-xl font-semibold">Your CV feedback</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-blue-50 p-5"><p className="text-sm">Job keyword coverage</p><p className="text-3xl font-bold mt-1">{result.matchScore}%</p><p className="text-xs mt-2">{result.matched.length} of {result.matched.length + result.missing.length} distinct description terms found in your CV.</p></div>
          <div className="rounded-xl bg-gray-50 p-5"><p className="text-sm">CV text structure</p><p className="text-3xl font-bold mt-1">{result.structureScore}/100</p><p className="text-xs mt-2">{result.checks.filter(c => c.pass).length} of {result.checks.length} text checks passed.</p></div>
        </div>
        <p className="text-xs text-gray-500">Keyword coverage uses unique English terms after removing common words. It does not understand synonyms, negation, or required versus optional skills. Repeating keywords does not improve the score. Text checks cannot certify columns, tables, fonts, or ATS compatibility.</p>
        <div><h3 className="font-semibold mb-2">Terms found</h3><p className="text-sm text-green-700 break-words">{result.matched.join(', ') || 'No matching terms found.'}</p></div>
        <div><h3 className="font-semibold mb-2">Terms to review</h3><p className="text-sm text-amber-800 break-words">{result.missing.join(', ') || 'All selected terms appear in your CV.'}</p></div>
        <div><h3 className="font-semibold mb-2">Structure checks</h3><ul className="space-y-2 text-sm">{result.checks.map(c => <li key={c.label}>{c.pass ? '✓' : '○'} {c.label}: {c.pass ? 'Detected' : 'Not detected'}</li>)}</ul></div>
        <div><h3 className="font-semibold mb-2">What to change</h3><ol className="list-decimal pl-5 space-y-3 text-sm text-gray-700">{result.suggestions.map(t => <li key={t}>{t}</li>)}</ol></div>
      </div>}
    </section>
  )
}
