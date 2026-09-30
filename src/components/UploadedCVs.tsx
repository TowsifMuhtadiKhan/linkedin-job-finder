import CVExtraction from './CVExtraction'
import { useEffect, useState } from 'react'
import { getCV } from '../lib/cvStorage'

interface CV { id: string; name: string; mimeType: string; size?: string; createdTime: string }

export default function UploadedCVs({ revision }: { revision: number }) {
  const [files, setFiles] = useState<CV[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [pageToken, setPageToken] = useState('')
  const [page, setPage] = useState('')
  const [selected, setSelected] = useState<CV | null>(null)
  const [preview, setPreview] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [extracting, setExtracting] = useState<CV | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getCV(page ? `?pageToken=${encodeURIComponent(page)}` : '').then(r => r.json()).then(data => {
      if (!active) return
      setFiles(previous => page ? [...previous, ...data.files.filter((f: CV) => !previous.some(p => p.id === f.id))] : data.files)
      setPageToken(data.nextPageToken || '')
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision, retry, page])

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setPreview('')
    setPreviewError('')
    if (selected) {
      getCV(`?fileId=${encodeURIComponent(selected.id)}`).then(r => r.blob()).then(blob => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreview(objectUrl)
      }).catch(err => { if (active) setPreviewError(err.message) })
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [selected])

  return (
    <section className="card p-6 mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Your uploaded CVs</h2>
        <button type="button" className="text-sm text-[#0077B5] disabled:opacity-50" disabled={loading}
          onClick={() => { setPage(''); setRetry(value => value + 1) }}>Refresh</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
      {!loading && !error && files.length === 0 && <p className="text-sm text-gray-500 mt-4">No CVs uploaded yet. Your successful uploads will appear here.</p>}
      <ul className="divide-y divide-gray-100 mt-3">
        {files.map(cv => <li key={cv.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="min-w-0"><p className="font-medium text-sm break-all">{cv.name}</p>
            <p className="text-xs text-gray-500 mt-1">{new Date(cv.createdTime).toLocaleString()}{cv.size ? ` · ${(Number(cv.size) / 1024).toFixed(0)} KB` : ''}</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => setExtracting(cv)} className="text-sm text-[#0077B5] border border-[#0077B5] rounded-full px-3 py-1.5">Extract data</button>
          <button type="button" onClick={() => setSelected(cv)} className="shrink-0 text-sm text-[#0077B5] border border-[#0077B5] rounded-full px-3 py-1.5">View CV</button></div>
        </li>)}
      </ul>
      {loading && <p role="status" className="text-sm text-gray-500 mt-3">Loading your CVs…</p>}
      {!loading && pageToken && <button type="button" onClick={() => setPage(pageToken)} className="text-sm text-[#0077B5] mt-3">Load more</button>}
      {extracting && <div><button type="button" onClick={() => setExtracting(null)} className="text-xs text-gray-500 mt-4">Close extraction</button><CVExtraction key={extracting.id} stored={extracting} /></div>}
      {selected && <div className="mt-5 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between gap-3 mb-3"><h3 className="font-semibold text-sm break-all">{selected.name}</h3>
          <button type="button" onClick={() => setSelected(null)} className="text-sm text-gray-500">Close</button></div>
        {previewError ? <p role="alert" className="text-red-600 text-sm">{previewError}</p> : !preview ? <p role="status" className="text-sm text-gray-500">Loading preview…</p> : <>
          <a href={preview} download={selected.name} className="inline-block text-sm text-[#0077B5] mb-3">Download CV</a>
          {selected.mimeType === 'application/pdf' ? <iframe title={`Preview of ${selected.name}`} src={preview} className="w-full h-[600px] rounded border border-gray-200" /> :
            <p className="text-sm text-gray-500">This Word document is ready to download. Upload a PDF for an inline preview.</p>}
        </>}
      </div>}
    </section>
  )
}
