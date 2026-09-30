import type { Job, ViewMode } from '../types'
import { useState } from 'react'
import {
  Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock,
  Building2, Copy, Check, Send
} from 'lucide-react'
import { useSavedJobs } from '../hooks/useSavedJobs'
import ReviewCVLink from './ReviewCVLink'
import PlatformBadge from './PlatformBadge'
import { portalLabel } from '../lib/jobPortals'

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateStr }
}

// ── List view row ─────────────────────────────────────────────────────────────
function SaveJobButton({ job, size = 16 }: { job: Job; size?: number }) {
  const { saveJob, unsaveJob, isJobSaved, authLoading } = useSavedJobs()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const saved = isJobSaved(job.id)

  async function toggleSave() {
    if (pending || authLoading) return
    setPending(true)
    setError('')
    try {
      await (saved ? unsaveJob(job.id) : saveJob(job))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this job. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => void toggleSave()} disabled={pending || authLoading}
        aria-busy={pending} aria-pressed={saved}
        aria-label={saved ? 'Remove favourite' : 'Save as favourite'}
        title={pending ? 'Saving?' : saved ? 'Remove favourite' : 'Save as favourite'}
        className={`p-1.5 rounded-full transition-colors disabled:opacity-50 ${
          saved ? 'text-[#0A66C2] bg-[#F0F7FF]' : 'text-gray-400 hover:text-[#0A66C2] hover:bg-gray-100'
        }`}
      >
        {saved ? <BookmarkCheck size={size} /> : <Bookmark size={size} />}
      </button>
      {error && <p role="alert" className="absolute right-0 top-full z-10 w-56 rounded border border-red-200 bg-white p-2 text-xs text-red-600 shadow">{error}</p>}
    </div>
  )
}

function JobRow({ job }: { job: Job }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(job.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card px-4 py-3 flex items-center gap-4">
      {/* Logo */}
      {job.logo ? (
        <img
          src={job.logo}
          alt=""
          className="w-10 h-10 rounded border border-gray-100 object-contain shrink-0"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-gray-400" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 text-sm truncate">{job.title}</p>
          <PlatformBadge job={job} />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-gray-500">
          {job.company && (
            <span className="text-gray-700 font-medium">{job.company}</span>
          )}
          {job.location && (
            <span className="flex items-center gap-0.5">
              <MapPin size={10} /> {job.location}
            </span>
          )}
          {job.postedDate && (
            <span className="flex items-center gap-0.5">
              <Clock size={10} /> {formatDate(job.postedDate)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <ReviewCVLink job={job} />
        <SaveJobButton job={job} />
        <button
          onClick={handleCopy}
          className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-[#0A66C2] transition-colors"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-[#0A66C2] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#004182] transition-colors"
        >
          <Send size={11} /> Apply
        </a>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#F0F7FF] transition-colors"
        >
          <ExternalLink size={11} /> View
        </a>
      </div>
    </div>
  )
}

// ── Card view ─────────────────────────────────────────────────────────────────
function JobCardView({ job }: { job: Job }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(job.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {job.logo ? (
            <img
              src={job.logo}
              alt=""
              className="w-12 h-12 rounded-lg border border-gray-200 object-contain shrink-0"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <PlatformBadge job={job} />
              {job.company && (
                <p className="text-gray-700 text-sm font-medium truncate">{job.company}</p>
              )}
            </div>
          </div>
        </div>
        <SaveJobButton job={job} size={18} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {job.location && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} /> {job.location}
          </span>
        )}
        {job.postedDate && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} /> {formatDate(job.postedDate)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <ReviewCVLink job={job} />
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A66C2] text-white text-sm font-semibold py-2 rounded-full hover:bg-[#004182] transition-colors"
        >
          <Send size={14} /> Apply Now
        </a>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#0A66C2] hover:border-[#0A66C2] transition-colors"
          title={`View on ${portalLabel(job)}`}
        >
          <ExternalLink size={15} />
        </a>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#0A66C2] transition-colors"
          title="Copy link"
        >
          {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  )
}

// ── Exported component ────────────────────────────────────────────────────────
export default function JobCard({ job, viewMode = 'card' }: { job: Job; viewMode?: ViewMode }) {
  return viewMode === 'list' ? <JobRow job={job} /> : <JobCardView job={job} />
}
