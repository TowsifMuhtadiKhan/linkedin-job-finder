import { useEffect, useId, useState } from 'react'
import { extractCV } from '../lib/extractCV'
import { getCV } from '../lib/cvStorage'
import { parseCVDetails } from '../lib/cvDetails'

export default function CVExtraction({ file, stored }: { file?: File; stored?: { id: string; name: string } }) {
  const [text, setText] = useState('')
  const [details, setDetails] = useState<ReturnType<typeof parseCVDetails> | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const id = useId()
  const name = file?.name || stored?.name || 'CV'
  const storedId = stored?.id
  useEffect(() => {
    let active = true
    setBusy(true); setText(''); setDetails(null); setError('')
    async function read() {
      if (!file && !storedId) return
      const blob = file || await (await getCV(`?fileId=${encodeURIComponent(storedId!)}`)).blob()
      const extracted = await extractCV(blob, name)
      if (!extracted.trim()) throw new Error('No readable text found. Paste your CV text below.')
      if (active) { setText(extracted); setDetails(parseCVDetails(extracted)) }
    }
    void read().catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not extract this CV. Paste its text below.') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [file, storedId, name])

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ fileName: name, ...details, text }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = name.replace(/\.[^.]+$/, '') + '-extracted.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-4" aria-label="CV extraction">
    <div><h3 className="font-semibold text-sm">Extracted CV details</h3>
      <p className="text-xs text-gray-500 mt-1">Review and correct the detected details. Extraction runs in your browser. Edits here do not change your uploaded file or account profile.</p></div>
    {busy && <p role="status" className="text-sm text-gray-500">Reading your CV...</p>}
    {error && <p role="alert" className="text-sm text-amber-700">{error}</p>}
    {details && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(details).map(([field, value]) => <label key={field} className={`block text-xs font-medium text-gray-700 ${['experience', 'education', 'projects', 'summary'].includes(field) ? 'sm:col-span-2' : ''}`}>
        <span className="capitalize">{field === 'name' ? 'Name (suggested)' : field}</span>
        <textarea rows={['name', 'email', 'phone'].includes(field) ? 1 : 3} value={value} placeholder="Not detected — add or correct here"
          onChange={event => setDetails(previous => previous && ({ ...previous, [field]: event.target.value }))}
          className="mt-1 block w-full rounded-lg border border-gray-200 bg-white p-2 text-sm font-normal" />
      </label>)}
    </div>}
    <label htmlFor={id} className="block text-xs font-medium text-gray-700">Full CV text / paste text</label>
    <textarea id={id} rows={7} value={text} disabled={busy} onChange={event => setText(event.target.value)}
      placeholder="Paste text here if the document could not be read." className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm" />
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || !text.trim()} onClick={() => { setDetails(parseCVDetails(text)); setError('') }} className="btn-primary text-xs disabled:opacity-50">Extract details from text</button>
      {details && <button type="button" onClick={download} className="text-xs font-semibold text-[#0A66C2]">Download extracted data</button>}
    </div>
  </section>
}
