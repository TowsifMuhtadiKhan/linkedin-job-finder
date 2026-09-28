import { useState } from 'react'
import { ExternalLink, Trash2, Send, BookmarkCheck, Check, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSavedJobs } from '../hooks/useSavedJobs'
import type { Job } from '../types'

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function deadlineInfo(value: string) {
  const today = new Date()
  const date = new Date(`${value}T00:00:00`)
  const days = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
  if (days < 0) return { text: 'Deadline passed', color: 'text-red-600' }
  if (days === 0) return { text: 'Due today', color: 'text-amber-700' }
  if (days <= 7) return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, color: 'text-amber-700' }
  return { text: '', color: 'text-gray-500' }
}

function SavedJobCard({ job, update, remove, disabled }: {
  job: Job
  update: (id: string, changes: Pick<Job, 'appliedAt' | 'deadline'>) => Promise<void>
  remove: (id: string) => Promise<void>
  disabled: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [deadline, setDeadline] = useState(job.deadline || '')
  const info = job.deadline ? deadlineInfo(job.deadline) : null

  async function save(changes: Pick<Job, 'appliedAt' | 'deadline'>) {
    setPending(true)
    setError('')
    try {
      await update(job.id, changes)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="card px-4 py-4">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{job.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${job.appliedAt ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {job.appliedAt ? 'Applied' : 'Not applied'}
            </span>
          </div>
          {job.company && <p className="text-[#0077B5] text-sm mt-0.5">{job.company}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
            {job.location && <span>{job.location}</span>}
            {job.savedAt && <span>Saved {formatDate(job.savedAt)}</span>}
            {job.appliedAt && <span>Applied {formatDate(job.appliedAt)}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <CalendarDays size={14} className="text-gray-400" />
            <span className={info?.color || 'text-gray-500'}>
              {job.deadline ? `Deadline ${formatDate(job.deadline)}${info?.text ? ` · ${info.text}` : ''}` : 'Deadline not listed'}
            </span>
            <button type="button" disabled={pending || disabled} className="text-[#0077B5] hover:underline disabled:opacity-50"
              onClick={() => { setDeadline(job.deadline || ''); setEditing(true) }}>
              {job.deadline ? 'Edit deadline' : 'Add deadline'}
            </button>
          </div>
          {editing && (
            <form className="flex flex-wrap items-center gap-2 mt-3" onSubmit={(event) => {
              event.preventDefault()
              void save({ deadline: deadline || null })
            }}>
              <label className="text-xs text-gray-600" htmlFor={`deadline-${job.id}`}>Application deadline</label>
              <input id={`deadline-${job.id}`} type="date" value={deadline} max="9999-12-31" disabled={pending || disabled}
                onChange={(event) => setDeadline(event.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
              <button className="text-xs text-[#0077B5] font-semibold disabled:opacity-50" disabled={pending || disabled}>Save</button>
              {job.deadline && <button type="button" className="text-xs text-red-600" disabled={pending || disabled}
                onClick={() => void save({ deadline: null })}>Clear</button>}
              <button type="button" className="text-xs text-gray-500" disabled={pending} onClick={() => setEditing(false)}>Cancel</button>
            </form>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" disabled={pending || disabled} onClick={() => void save({ appliedAt: job.appliedAt ? null : new Date().toISOString() })}
            className="flex items-center gap-1.5 border border-[#0077B5] text-[#0077B5] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#E8F4FD] disabled:opacity-50">
            <Check size={12} /> {pending ? 'Saving…' : job.appliedAt ? 'Undo applied' : 'Mark applied'}
          </button>
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#0077B5] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#004182]">
            <Send size={11} /> Apply
          </a>
          <a href={job.url} target="_blank" rel="noopener noreferrer" title="View on LinkedIn" aria-label={`View ${job.title} on LinkedIn`}
            className="p-1.5 rounded border border-gray-200 text-[#0077B5] hover:bg-[#E8F4FD]"><ExternalLink size={14} /></a>
          <button type="button" disabled={pending || disabled} onClick={() => void remove(job.id)} title="Remove" aria-label={`Remove ${job.title}`}
            className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-500 disabled:opacity-50"><Trash2 size={14} /></button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
    </article>
  )
}

export default function Saved() {
  const { savedJobs, unsaveJob, updateSavedJob, authLoading } = useSavedJobs()
  const [filter, setFilter] = useState<'all' | 'not-applied' | 'applied'>('all')
  const appliedCount = savedJobs.filter((job) => job.appliedAt).length
  const filteredJobs = savedJobs.filter((job) => filter === 'all' || (filter === 'applied' ? !!job.appliedAt : !job.appliedAt))
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))

  if (savedJobs.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <BookmarkCheck size={28} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No saved jobs yet</h2>
        <p className="text-gray-500 text-sm mb-6">Click the bookmark icon on any job to save it here.</p>
        <Link to="/results" className="btn-primary inline-flex">Browse Jobs</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BookmarkCheck size={22} className="text-[#0077B5]" /> Saved Jobs</h1>
        <p className="text-sm text-gray-500 mt-1">Track your applications and upcoming deadlines.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter saved jobs">
        {([
          ['all', 'All saved', savedJobs.length],
          ['not-applied', 'Not applied', savedJobs.length - appliedCount],
          ['applied', 'Applied', appliedCount],
        ] as const).map(([value, label, count]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium border ${filter === value ? 'bg-[#0077B5] text-white border-[#0077B5]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {label} <span className="ml-1">{count}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredJobs.map((job) => <SavedJobCard key={job.id} job={job} update={updateSavedJob} remove={unsaveJob} disabled={authLoading} />)}
        {filteredJobs.length === 0 && <div className="card p-8 text-center text-sm text-gray-500">
          {filter === 'applied' ? 'No applied jobs yet. Mark a job as applied after submitting your application.' : 'You have applied to all your saved jobs.'}
        </div>}
      </div>
    </div>
  )
}
