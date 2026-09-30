import { useState, useMemo } from 'react'
import {
  ExternalLink, Trash2, Send, BookmarkCheck, Check, CalendarDays, Building2,
  LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight, Clock, AlertTriangle, MapPin
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSavedJobs } from '../hooks/useSavedJobs'
import type { Job } from '../types'
import ReviewCVLink from '../components/ReviewCVLink'
import useAppStore from '../store/useAppStore'
import PlatformBadge from '../components/PlatformBadge'
import { portalLabel } from '../lib/jobPortals'
import CustomSelect from '../components/CustomSelect'

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
}

function deadlineInfo(value: string) {
  const today = new Date()
  const date = new Date(`${value}T00:00:00`)
  const days = Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000
  )
  if (days < 0) return { text: 'Deadline passed', color: 'text-red-600 bg-red-50' }
  if (days === 0) return { text: 'Due today', color: 'text-amber-700 bg-amber-50' }
  if (days <= 7) return { text: `Due in ${days}d`, color: 'text-amber-700 bg-amber-50' }
  return { text: '', color: 'text-gray-500 bg-gray-50' }
}

interface SavedJobCardProps {
  job: Job
  update: (id: string, changes: Pick<Job, 'appliedAt' | 'deadline'>) => Promise<void>
  remove: (id: string) => Promise<void>
  disabled: boolean
  viewMode: 'card' | 'list'
}

function SavedJobItem({ job, update, remove, disabled, viewMode }: SavedJobCardProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [deadline, setDeadline] = useState(job.deadline || '')
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
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

  async function handleRemove() {
    setPending(true)
    setError('')
    try {
      await remove(job.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this job. Please try again.')
    } finally {
      setPending(false)
    }
  }


  // ── CARD VIEW ──────────────────────────────────────────
  if (viewMode === 'card') {
    return (
      <article className="card p-5 flex flex-col justify-between h-full bg-white border border-gray-200 rounded-2xl shadow-xs hover:shadow-md transition-all">
        <div>
          {/* Header: Logo, Title, Badges */}
          <div className="flex items-start gap-3 mb-3">
            {job.logo && failedLogo !== job.logo ? (
              <img
                src={job.logo}
                alt=""
                loading="lazy"
                className="w-11 h-11 rounded-xl border border-gray-100 object-contain shrink-0 bg-white p-0.5"
                onError={() => setFailedLogo(job.logo ?? null)}
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-gray-400" aria-hidden="true" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">
                {job.title}
              </h3>

              <div className="flex items-center gap-1.5 flex-wrap my-1.5">
                <PlatformBadge job={job} />
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    job.appliedAt ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {job.appliedAt ? 'Applied' : 'Not applied'}
                </span>
              </div>

              {job.company && (
                <p className="text-xs font-medium text-gray-700 truncate">{job.company}</p>
              )}
            </div>

            {/* Top Right Action Icons: External Link & Trash */}
            <div className="flex items-center gap-1 shrink-0 self-start">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`View on ${portalLabel(job)}`}
                aria-label={`View on ${portalLabel(job)}`}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#0A66C2] hover:border-[#0A66C2] transition-colors"
              >
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                disabled={pending || disabled}
                onClick={() => void handleRemove()}
                title="Remove from saved"
                aria-label={`Remove ${job.title}`}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Meta: Location, Saved Date */}
          <div className="space-y-1 text-xs text-gray-500 mb-3 pt-1 border-t border-gray-100">
            {job.location && (
              <p className="truncate text-gray-600 flex items-center gap-1">
                <MapPin size={12} className="text-gray-400 shrink-0" />
                <span>{job.location}</span>
              </p>
            )}
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              {job.savedAt && <span>Saved {formatDate(job.savedAt)}</span>}
              {job.appliedAt && <span className="text-emerald-700 font-medium">Applied {formatDate(job.appliedAt)}</span>}
            </div>
          </div>

          {/* Deadline Section */}
          <div className="bg-gray-50/80 rounded-xl p-2.5 mb-4 text-xs">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 truncate">
                <CalendarDays size={13} className="text-gray-400 shrink-0" />
                <span className={`text-[11px] font-medium truncate ${info?.color || 'text-gray-500'}`}>
                  {job.deadline ? `Deadline: ${formatDate(job.deadline)}` : 'Deadline not listed'}
                </span>
              </div>
              <button
                type="button"
                disabled={pending || disabled}
                className="text-[11px] font-semibold text-[#0A66C2] hover:underline shrink-0 cursor-pointer"
                onClick={() => {
                  setDeadline(job.deadline || '')
                  setEditing((v) => !v)
                }}
              >
                {job.deadline ? 'Edit' : '+ Add'}
              </button>
            </div>

            {editing && (
              <form
                className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200"
                onSubmit={(event) => {
                  event.preventDefault()
                  void save({ deadline: deadline || null })
                }}
              >
                <input
                  type="date"
                  value={deadline}
                  max="9999-12-31"
                  disabled={pending || disabled}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs flex-1"
                />
                <button
                  className="text-xs bg-[#0A66C2] text-white px-2 py-0.5 rounded font-medium cursor-pointer"
                  disabled={pending || disabled}
                >
                  Save
                </button>
                {job.deadline && (
                  <button
                    type="button"
                    className="text-xs text-red-600 px-1 hover:underline cursor-pointer"
                    disabled={pending || disabled}
                    onClick={() => void save({ deadline: null })}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className="text-xs text-gray-500 px-1 cursor-pointer"
                  disabled={pending}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Actions Footer: All 3 Buttons in ONE line */}
        <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
          <ReviewCVLink job={job} />

          <button
            type="button"
            disabled={pending || disabled}
            onClick={() =>
              void save({ appliedAt: job.appliedAt ? null : new Date().toISOString() })
            }
            className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
              job.appliedAt
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70 hover:border-emerald-300'
            }`}
          >
            <Check size={12} className={job.appliedAt ? 'text-emerald-800' : 'text-emerald-600'} />
            <span>{pending ? 'Saving…' : job.appliedAt ? 'Applied' : 'Mark applied'}</span>
          </button>

          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 bg-[#0A66C2] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#004182] transition-colors whitespace-nowrap"
          >
            <Send size={11} />
            <span>Apply</span>
          </a>
        </div>

        {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
      </article>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────
  return (
    <article className="card px-4 py-4 bg-white border border-gray-200 rounded-xl shadow-xs hover:shadow-sm transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex flex-1 min-w-0 w-full items-start gap-3.5">
          {job.logo && failedLogo !== job.logo ? (
            <img
              src={job.logo}
              alt=""
              loading="lazy"
              className="w-11 h-11 rounded-lg border border-gray-100 object-contain shrink-0 bg-white"
              onError={() => setFailedLogo(job.logo ?? null)}
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-gray-400" aria-hidden="true" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm hover:text-[#0A66C2] transition-colors">
                {job.title}
              </h3>
              <PlatformBadge job={job} />
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  job.appliedAt ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {job.appliedAt ? 'Applied' : 'Not applied'}
              </span>
            </div>

            {job.company && <p className="text-gray-700 text-xs font-medium mt-0.5">{job.company}</p>}

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-gray-400 shrink-0" />
                  <span>{job.location}</span>
                </span>
              )}
              {job.savedAt && <span>Saved {formatDate(job.savedAt)}</span>}
              {job.appliedAt && <span className="text-green-600 font-medium">Applied {formatDate(job.appliedAt)}</span>}
            </div>

            {/* Deadline Inline */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <CalendarDays size={13} className="text-gray-400" />
              <span className={info?.color || 'text-gray-500'}>
                {job.deadline ? `Deadline ${formatDate(job.deadline)}${info?.text ? ` · ${info.text}` : ''}` : 'Deadline not listed'}
              </span>
              <button
                type="button"
                disabled={pending || disabled}
                className="text-[#0A66C2] hover:underline font-medium cursor-pointer"
                onClick={() => {
                  setDeadline(job.deadline || '')
                  setEditing((v) => !v)
                }}
              >
                {job.deadline ? 'Edit deadline' : '+ Add deadline'}
              </button>
            </div>

            {editing && (
              <form
                className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100"
                onSubmit={(event) => {
                  event.preventDefault()
                  void save({ deadline: deadline || null })
                }}
              >
                <label className="text-xs text-gray-600" htmlFor={`deadline-${job.id}`}>
                  Deadline:
                </label>
                <input
                  id={`deadline-${job.id}`}
                  type="date"
                  value={deadline}
                  max="9999-12-31"
                  disabled={pending || disabled}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                />
                <button
                  className="text-xs bg-[#0A66C2] text-white px-2.5 py-1 rounded font-semibold cursor-pointer"
                  disabled={pending || disabled}
                >
                  Save
                </button>
                {job.deadline && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                    disabled={pending || disabled}
                    onClick={() => void save({ deadline: null })}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className="text-xs text-gray-500 cursor-pointer"
                  disabled={pending}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
          <ReviewCVLink job={job} />
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() =>
              void save({ appliedAt: job.appliedAt ? null : new Date().toISOString() })
            }
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              job.appliedAt
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70 hover:border-emerald-300'
            }`}
          >
            <Check size={12} className={job.appliedAt ? 'text-emerald-800' : 'text-emerald-600'} />
            <span>{pending ? 'Saving…' : job.appliedAt ? 'Undo applied' : 'Mark applied'}</span>
          </button>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#0A66C2] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full hover:bg-[#004182] transition-colors"
          >
            <Send size={11} /> Apply
          </a>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`View on ${portalLabel(job)}`}
            aria-label={`View ${job.title} on ${portalLabel(job)}`}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[#0A66C2] hover:border-[#0A66C2] transition-colors"
          >
            <ExternalLink size={14} />
          </a>
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => void handleRemove()}
            title="Remove from saved"
            aria-label={`Remove ${job.title}`}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    </article>
  )
}

export default function Saved() {
  const { isGuest, savedJobs, unsaveJob, updateSavedJob, authLoading } = useSavedJobs()
  const { viewMode, setViewMode } = useAppStore()

  const [filter, setFilter] = useState<'all' | 'not-applied' | 'applied'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  const appliedCount = savedJobs.filter((job) => job.appliedAt).length

  const filteredJobs = useMemo(() => {
    return savedJobs
      .filter((job) =>
        filter === 'all' ? true : filter === 'applied' ? !!job.appliedAt : !job.appliedAt
      )
      .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
  }, [savedJobs, filter])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize))

  // Adjust page if out of bounds
  const activePage = Math.min(currentPage, totalPages)

  const paginatedJobs = useMemo(() => {
    const start = (activePage - 1) * pageSize
    return filteredJobs.slice(start, start + pageSize)
  }, [filteredJobs, activePage, pageSize])

  const handleFilterChange = (newFilter: 'all' | 'not-applied' | 'applied') => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  if (savedJobs.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 p-8 mt-4">
        <BookmarkCheck size={36} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">No saved jobs yet</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          {isGuest ? 'Sign in to view your account?s jobs, or bookmark search results to save them on this browser.' : 'Click the bookmark or star icon on any search result to track your favourite opportunities here.'}
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          Search Opportunities
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookmarkCheck size={22} className="text-[#0A66C2]" /> My Jobs
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isGuest ? 'Saved on this browser only. Sign in to view your account?s saved jobs.' : 'Track your applications, check CV compatibility, and manage deadlines.'}
          </p>
        </div>

        {/* View Switcher (Card / List) & Items per page */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {/* Card / List Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              title="Card view"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white text-[#0A66C2] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#0A66C2] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Pagination Info Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter saved jobs">
          {(
            [
              ['all', 'All saved', savedJobs.length],
              ['not-applied', 'Not applied', savedJobs.length - appliedCount],
              ['applied', 'Applied', appliedCount],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => handleFilterChange(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                filter === value
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2] shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label} <span className="ml-1 opacity-90">({count})</span>
            </button>
          ))}
        </div>

        {/* Per-page selector */}
        {filteredJobs.length > 6 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 self-end sm:self-auto">
            <span>Show:</span>
            <CustomSelect
              value={String(pageSize)}
              onChange={(val) => {
                setPageSize(Number(val))
                setCurrentPage(1)
              }}
              options={[
                { value: '6', label: '6 per page' },
                { value: '12', label: '12 per page' },
                { value: '24', label: '24 per page' },
              ]}
              menuWidth="w-32"
            />
          </div>
        )}
      </div>

      {/* Jobs Container: Card Grid or List Stack */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {paginatedJobs.map((job) => (
            <SavedJobItem
              key={job.id}
              job={job}
              update={updateSavedJob}
              remove={unsaveJob}
              disabled={authLoading}
              viewMode="card"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {paginatedJobs.map((job) => (
            <SavedJobItem
              key={job.id}
              job={job}
              update={updateSavedJob}
              remove={unsaveJob}
              disabled={authLoading}
              viewMode="list"
            />
          ))}
        </div>
      )}

      {/* Empty Filtered State */}
      {filteredJobs.length === 0 && (
        <div className="card p-8 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl">
          {filter === 'applied'
            ? 'No applied jobs yet. Click "Mark applied" on any job after you apply.'
            : 'You have applied to all of your saved jobs!'}
        </div>
      )}

      {/* ── PAGINATION CONTROLS ──────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Showing{' '}
            <strong>
              {(activePage - 1) * pageSize + 1} -{' '}
              {Math.min(activePage * pageSize, filteredJobs.length)}
            </strong>{' '}
            of <strong>{filteredJobs.length}</strong> jobs
          </div>

          <div className="flex items-center gap-1">
            {/* Prev button */}
            <button
              type="button"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePage === p
                      ? 'bg-[#0A66C2] text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            })}

            {/* Next button */}
            <button
              type="button"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
