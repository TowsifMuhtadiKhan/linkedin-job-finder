import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import UploadedCVs from '../components/UploadedCVs'

export default function UploadCV() {
  const { user, loading } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState('')
  const [revision, setRevision] = useState(0)

  async function upload(event: React.FormEvent) {
    event.preventDefault()
    if (!file || !user || !supabase || pending) return
    setError('')
    setUploaded('')
    if (!/\.(pdf|doc|docx)$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError('Choose a PDF, DOC, or DOCX file between 1 byte and 5 MB.')
      return
    }
    setPending(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const { data, error: uploadError } = await supabase.functions.invoke('upload-cv', { body })
      if (uploadError) {
        let message = 'Upload failed. Please try again. If it continues, contact the portal administrator.'
        if (uploadError.context instanceof Response) {
          const response = await uploadError.context.json().catch(() => null)
          if (typeof response?.error === 'string') message = response.error
        }
        throw new Error(message)
      }
      if (!data?.id) throw new Error('Upload could not be confirmed. Please try again.')
      setUploaded(file.name)
      setRevision(value => value + 1)
      setFile(null)
      if (input.current) input.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <Link to="/cv-review" className="inline-block text-sm font-semibold text-[#0077B5] mt-2">Check your CV against a job description →</Link>
      <p className="text-sm text-gray-500 mt-2">Manage your CVs and check how they match your next opportunity.</p>
      <div className="card p-6 mt-6">
        {loading ? <p role="status">Loading your account…</p> : !user ? (
          <div className="text-center py-6">
            <FileText className="mx-auto text-[#0077B5] mb-3" size={32} />
            <p className="text-gray-600 mb-4">Sign in to upload your CV.</p>
            <Link to="/auth" className="inline-block rounded-full bg-[#0077B5] text-white px-5 py-2 text-sm font-semibold">Sign in</Link>
          </div>
        ) : (
          <form onSubmit={upload} className="space-y-5" aria-busy={pending}>
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6">
              <Upload size={28} className="text-[#0077B5] mb-3" />
              <label htmlFor="cv-file" className="block font-semibold text-sm text-gray-900 mb-2">Choose your CV</label>
              <input ref={input} id="cv-file" type="file" accept=".pdf,.doc,.docx" required disabled={pending}
                aria-describedby="cv-file-help" className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#E8F4FD] file:px-4 file:py-2 file:text-[#0077B5] file:font-semibold"
                onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(''); setUploaded('') }} />
              <p id="cv-file-help" className="text-xs text-gray-500 mt-3">PDF, DOC, or DOCX · Maximum 5 MB</p>
              {file && <p className="text-sm text-gray-600 mt-3 break-all">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
            </div>
            <p className="text-xs text-gray-500">By uploading, you share your CV and account email with the portal team. Your file will be stored in their Google Drive folder and accessible to people who have access to that folder.</p>
            <button type="submit" disabled={!file || pending} className="w-full flex items-center justify-center gap-2 bg-[#0077B5] text-white font-semibold text-sm rounded-full px-5 py-3 hover:bg-[#004182] disabled:opacity-50">
              {pending ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
              {pending ? 'Uploading…' : 'Upload CV'}
            </button>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {uploaded && <div role="status" className="flex gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 size={20} className="shrink-0" /><p className="break-all">{uploaded} was uploaded successfully. The portal team has received your CV.</p></div>}
          </form>
        )}
      </div>
      {user && <UploadedCVs key={`${user.id}-${revision}`} revision={revision} />}
    </section>
  )
}
