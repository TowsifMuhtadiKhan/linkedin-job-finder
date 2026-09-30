import CVTailor from '../components/CVTailor'
import { jobIdentity, readReviews, saveReview } from '../lib/cvReviewStorage'
import type { SavedReview } from '../lib/cvReviewStorage'
import { useEffect, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import CVFeedback from '../components/CVFeedback'
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
  if (!user) return <div className="card p-6">Sign in to compare your CV with a job. <Link to="/auth" className="text-[#0A66C2]">Sign in</Link></div>
  return <ReviewForm key={`${user.id}-${params.get('job') || ''}-${params.get('review') || ''}`} initialReviewId={params.get('review') || ''} initialUrl={params.get('job') || ''} userId={user.id} />
}

function ReviewForm({ initialUrl, userId, initialReviewId }: { initialUrl: string; userId: string; initialReviewId: string }) {
  const [, setReviewParams] = useSearchParams()
  const [cache] = useState(() => {
    try { return { reviews: readReviews(userId), error: '' } }
    catch { return { reviews: [] as SavedReview[], error: 'Saved reviews could not be read from this browser.' } }
  })
  const [reviews, setReviews] = useState(cache.reviews)
  const [restored] = useState(() => cache.reviews.find(review => review.id === initialReviewId && (!initialUrl || jobIdentity(review.url) === jobIdentity(initialUrl))) || (initialUrl ? cache.reviews.find(review => jobIdentity(review.url) === jobIdentity(initialUrl)) : cache.reviews[0]))
  const [saveStatus, setSaveStatus] = useState(restored ? 'Restored saved analysis from this browser.' : '')
  const [storageError, setStorageError] = useState(cache.error)
  const [cvId, setCvId] = useState(restored?.cvId || '')
  const [url, setUrl] = useState(restored?.url || initialUrl)
  const route = useLocation()
  const [description, setDescription] = useState(restored?.description || (typeof route.state?.description === 'string' ? route.state.description : ''))
  const [cv, setCV] = useState(restored?.cv || '')
  const [files, setFiles] = useState<StoredCV[]>([])
  const [selected, setSelected] = useState(restored?.cvId || '')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [source, setSource] = useState(restored?.source || '')
  const [result, setResult] = useState<ReturnType<typeof analyzeCV> | null>(() => { try { return restored ? analyzeCV(restored.cv, restored.description) : null } catch { return null } })

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
      if (active) { setFiles(all); setSelected(previous => all.some(file => file.id === previous) ? previous : all[0]?.id || '') }
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
      setCV(text.slice(0, 60000)); setSource(name); setCvId(file ? '' : selected); setSaveStatus('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not read this CV. Paste its text below.') }
    finally { setBusy('') }
  }

  function restoreReview(review: SavedReview) {
    setUrl(review.url); setDescription(review.description); setCV(review.cv)
    setSource(review.source); setCvId(review.cvId); setSelected(review.cvId)
    setReviewParams({ ...(review.url ? { job: review.url } : {}), review: review.id }, { replace: true })
    setError(''); setSaveStatus('Restored saved analysis from this browser.')
    try { setResult(analyzeCV(review.cv, review.description)) } catch { setResult(null) }
  }

  async function analyzeAndSave() {
    setError(''); setStorageError(''); setSaveStatus(''); setBusy('analysis')
    try {
      const analysis = analyzeCV(cv, description)
      setResult(analysis)
      try {
        const saved = await saveReview(userId, { url, description, cv, source, cvId, result: analysis })
        setReviews(saved); setSaveStatus('Analysis saved on this browser for this job and CV.')
        setReviewParams({ ...(url ? { job: url } : {}), review: saved[0].id }, { replace: true })
      } catch { setStorageError('Analysis completed, but could not be saved. Browser storage may be full or unavailable; reloading may lose these changes.') }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not analyze this CV.') }
    finally { setBusy('') }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 p-3 text-sm disabled:opacity-50'
  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">CV & job match</h1><p className="text-sm text-gray-500 mt-2">Compare your CV with a job description and get practical, free feedback.</p></div>
      {reviews.length > 0 && <div className="card p-4 space-y-2">
        <label htmlFor="saved-review" className="block text-sm font-semibold">Saved CV / job analyses</label>
        <select id="saved-review" value="" disabled={!!busy} onChange={event => { const review = reviews.find(item => item.id === event.target.value); if (review) restoreReview(review) }} className={inputClass}>
          <option value="">Open a saved comparison ({reviews.length})</option>
          {reviews.map(review => <option key={review.id} value={review.id}>{review.source || 'Pasted CV'} ? {review.url || review.description.slice(0, 60)} ? {new Date(review.savedAt).toLocaleString()}</option>)}
        </select>
        <p className="text-xs text-gray-500">Saved for your account on this browser, including CV text and feedback. Clearing browser data removes these reviews.</p>
      </div>}
      {saveStatus && <p role="status" className="text-sm text-emerald-700">{saveStatus}</p>}
      {storageError && <p role="alert" className="text-sm text-amber-700">{storageError}</p>}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">1. Job description</h2>
        <label className="block text-sm" htmlFor="job-url">Job URL (automatic fetch supports LinkedIn and Bdjobs)</label>
        <div className="flex flex-wrap gap-2"><input id="job-url" type="url" value={url} onChange={e => { setUrl(e.target.value); setResult(null); setSaveStatus('') }} disabled={!!busy} className={`${inputClass} flex-1 min-w-0`} placeholder="https://www.linkedin.com/jobs/view/…" />
          <button type="button" disabled={!!busy || !url} onClick={() => void fetchDescription()} className="btn-primary disabled:opacity-50">{busy === 'description' ? 'Fetching…' : 'Get description'}</button></div>
        <label htmlFor="job-description" className="block text-sm">Review the fetched description, or paste it here</label>
        <textarea id="job-description" rows={8} maxLength={40000} value={description} disabled={!!busy} onChange={e => { setDescription(e.target.value); setResult(null); setSaveStatus('') }} className={inputClass} placeholder="Include responsibilities, required skills, and qualifications." />
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
      <button type="button" disabled={!!busy || cv.trim().length < 100 || description.trim().length < 100} className="btn-primary disabled:opacity-50" onClick={() => void analyzeAndSave()}>Analyze & save my CV review</button>
      <p className="text-xs text-gray-500">English-language, rule-based estimates—not an employer ATS score or a prediction of hiring success. Analysis stays in your browser.</p>
      {result && <><CVFeedback result={result} /><CVTailor key={initialReviewId + cv + description} cv={cv} description={description} source={source} userId={userId} reviewId={initialReviewId} /></>}
    </section>
  )
}
