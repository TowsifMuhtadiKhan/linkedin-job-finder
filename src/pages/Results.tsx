import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, ChevronDown, AlertCircle, Settings,
  LayoutGrid, List, Clock, LogIn, Star
} from 'lucide-react'
import JobList from '../components/JobList'
import CriteriaForm from '../components/CriteriaForm'
import useAppStore from '../store/useAppStore'
import { searchJobs } from '../hooks/useJobSearch'
import { useAuth } from '../hooks/useAuth'

const EXPIRY_MS = 10 * 60 * 1000

function formatTimeLeft(ms: number) {
  if (ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function Results() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    jobs, criteria, linkedinToken,
    setJobs, setTotalJobs, searchTimestamp, setSearchTimestamp,
    clearJobs, viewMode, setViewMode,
  } = useAppStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // 10-min expiry timer (guests only)
  useEffect(() => {
    if (!searchTimestamp || user) { setTimeLeft(null); return }
    const tick = () => {
      const remaining = Math.max(0, EXPIRY_MS - (Date.now() - searchTimestamp))
      setTimeLeft(remaining)
      if (remaining <= 0) { clearJobs(); navigate('/setup') }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [searchTimestamp, user, clearJobs, navigate])

  const handleSearch = async (newPage = 1) => {
    const hasKeywords = Array.isArray(criteria.keywords)
      ? criteria.keywords.length > 0 : !!criteria.keywords
    if (!hasKeywords) return

    setIsLoading(true)
    setError('')

    try {
      const result = await searchJobs(criteria, linkedinToken, newPage)
      const newJobs = result.jobs || []
      if (newPage === 1) {
        setJobs(newJobs)
        setSearchTimestamp(Date.now())
        setPage(1)
      } else {
        setJobs([...new Map([...jobs, ...newJobs].map((job) => [job.id, job])).values()])
      }
      setPage(newPage)
      setHasMore(result.hasMore ?? newJobs.length > 0)
      setTotalJobs(result.total || newJobs.length)
    } catch (err) {
      setError((err instanceof Error ? err.message : '') || 'Failed to fetch jobs.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    handleSearch(nextPage)
  }

  // Empty state
  if (jobs.length === 0 && !isLoading) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 bg-[#E8F4FD] rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase size={28} className="text-[#0077B5]" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No results yet</h2>
        <p className="text-gray-500 text-sm mb-6">Head to Setup to enter your criteria and search.</p>
        <button onClick={() => navigate('/setup')} className="btn-primary inline-flex items-center gap-2">
          <Settings size={15} /> Go to Setup
        </button>
      </div>
    )
  }

  const keywords = Array.isArray(criteria.keywords) ? criteria.keywords : []
  const timerUrgent = timeLeft !== null && timeLeft < 60_000
  const timerWarning = timeLeft !== null && timeLeft < 5 * 60_000

  return (
    <div className="space-y-4">
      {/* Expiry banner */}
      {timeLeft !== null && timeLeft > 0 && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm border ${
          timerUrgent ? 'bg-red-50 border-red-200 text-red-700'
          : timerWarning ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'}`}
        >
          <div className="flex items-center gap-2">
            <Clock size={15} className="shrink-0" />
            <span>
              {timerUrgent ? '⚠️ Expiring soon! ' : 'Results expire in '}
              <strong>{formatTimeLeft(timeLeft)}</strong>
              {' — bookmark jobs to keep them'}
            </span>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="shrink-0 flex items-center gap-1 font-semibold underline text-xs sm:text-sm"
          >
            <LogIn size={13} /> Sign in to keep forever
          </button>
        </div>
      )}

      {/* Results header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            {jobs.length} Job{jobs.length !== 1 ? 's' : ''} Found
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {keywords.map((kw) => (
              <span key={kw} className="bg-[#E8F4FD] text-[#004182] text-xs font-medium px-2.5 py-1 rounded-full">
                &ldquo;{kw}&rdquo;
              </span>
            ))}
            {criteria.remote && (
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">🌐 Remote</span>
            )}
            {criteria.location && !criteria.remote && (
              criteria.location.split(',').map((location) => location.trim()).filter(Boolean).map((location) => (
                <span key={location} className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">📍 {location}</span>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('card')} title="Card view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow text-[#0077B5]' : 'text-gray-500'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} title="List view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-[#0077B5]' : 'text-gray-500'}`}>
              <List size={16} />
            </button>
          </div>

          <button onClick={() => setShowFilters((v) => !v)}
            className="btn-secondary flex items-center gap-1.5 text-sm py-2">
            <Settings size={14} />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown size={13} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Guest tip */}
      {!user && (
        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Star size={12} className="text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Tip:</strong> Click ⭐ on any job to save as favourite — it won&apos;t expire.{' '}
            <button onClick={() => navigate('/auth')} className="text-[#0077B5] underline">Sign in</button>{' '}
            to sync across devices.
          </span>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="max-w-lg">
          <CriteriaForm onSearch={() => handleSearch(1)} isLoading={isLoading} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Skeleton */}
      {isLoading && jobs.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-4" />
              <div className="h-8 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Job list */}
      {jobs.length > 0 && <JobList jobs={jobs} viewMode={viewMode} />}

      {/* Load more */}
      {jobs.length > 0 && hasMore && (
        <div className="text-center pt-2">
          <button onClick={handleLoadMore} disabled={isLoading}
            className="btn-secondary inline-flex items-center gap-2">
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-[#0077B5] border-t-transparent rounded-full animate-spin inline-block" /> Loading…</>
            ) : (
              `Load more (showing ${jobs.length})`
            )}
          </button>
        </div>
      )}

      {jobs.length > 0 && !hasMore && (
        <p className="text-center text-sm text-gray-400 pt-2">✅ All {jobs.length} results shown</p>
      )}
    </div>
  )
}
