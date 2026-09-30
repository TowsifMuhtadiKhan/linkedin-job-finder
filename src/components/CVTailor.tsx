import { useState } from 'react'
import { downloadCV, makePDFCV, makeWordCV, tailorCVText } from '../lib/cvExport'

export default function CVTailor({ cv, description, source, userId, reviewId }: { cv: string; description: string; source: string; userId: string; reviewId: string }) {
  const storageKey = reviewId ? `cv-draft-v1:${userId}:${reviewId}` : ''
  const [draft, setDraft] = useState<string | null>(() => { try { return storageKey ? localStorage.getItem(storageKey) : null } catch { return null } })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [reviewed, setReviewed] = useState(false)

  function update(text: string) {
    setDraft(text); setReviewed(false); setError('')
    if (storageKey) {
      try { localStorage.setItem(storageKey, text) }
      catch { setError('Your draft could not be saved on this browser. Download it before leaving.') }
    }
  }
  async function exportFile(format: 'pdf' | 'docx') {
    if (!draft?.trim() || !reviewed) return
    setBusy(format); setError('')
    try {
      const blob = await (format === 'pdf' ? makePDFCV(draft) : makeWordCV(draft))
      const name = (source || 'My-CV').replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]/g, '-')
      downloadCV(blob, `${name}-tailored.${format}`)
    } catch { setError('Could not create the document. Your draft is still available; please try again.') }
    finally { setBusy('') }
  }
  return <section className="card p-5 sm:p-6 space-y-4">
    <div><h2 className="text-lg font-semibold">Tailor and download your CV</h2><p className="text-sm text-gray-500 mt-1">Keep your section order and existing facts. Prioritize skills already in your CV, then edit your wording before exporting.</p></div>
    <p className="text-xs text-gray-500">Downloads use a clean text layout. Original columns, graphics, fonts, and page breaks are not preserved. Word downloads use .docx.</p>
    {draft === null ? <button type="button" className="btn-primary" onClick={() => { const tailored = tailorCVText(cv, description); update(tailored.text); setNotice(tailored.changes ? `Prioritized relevant skills in ${tailored.changes} list(s). All other text is unchanged.` : 'Draft ready. No skill lists needed reordering; edit the text below to tailor your wording.') }}>Create editable draft</button> : <>
      {notice && <p role="status" className="text-sm text-[#0A66C2]">{notice}</p>}
      <label htmlFor="tailored-cv" className="block text-sm font-medium">Review and edit your CV</label>
      <textarea id="tailored-cv" rows={18} maxLength={60000} value={draft} disabled={!!busy} onChange={event => update(event.target.value)} className="w-full border border-gray-200 rounded-xl p-4 text-sm leading-relaxed" />
      <details><summary className="text-xs text-gray-500 cursor-pointer">Compare with original text</summary><pre className="whitespace-pre-wrap text-xs p-3 bg-gray-50 rounded-lg mt-2">{cv}</pre></details>
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={reviewed} disabled={!!busy} onChange={event => setReviewed(event.target.checked)} className="mt-1" />I reviewed this draft and confirmed the experience, skills, and achievements are accurate.</label>
      <div className="flex flex-wrap gap-3">{(['docx', 'pdf'] as const).map(format => <button key={format} type="button" disabled={!reviewed || !draft.trim() || !!busy} onClick={() => void exportFile(format)} className="btn-primary disabled:opacity-50">{busy === format ? 'Creating file...' : format === 'pdf' ? 'Download PDF' : 'Download Word (.docx)'}</button>)}</div>
      <p className="text-xs text-gray-500">Edits are saved with this review on this browser. The uploaded CV is unchanged.</p>
    </>}
    {error && <p role="alert" className="text-sm text-amber-700">{error}</p>}
  </section>
}
