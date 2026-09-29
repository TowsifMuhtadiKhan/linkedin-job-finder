import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Briefcase, AlertCircle, LayoutGrid, List, Clock, LogIn, Star, Sparkles,
  BookmarkCheck, Globe, MapPin, CheckCircle2, AlertTriangle
} from 'lucide-react'
import JobList from '../components/JobList'
import CriteriaForm from '../components/CriteriaForm'
import useAppStore from '../store/useAppStore'
import { searchJobs } from '../hooks/useJobSearch'
import { recordSearchKeywords } from '../lib/keywordService'
import { useAuth } from '../hooks/useAuth'

const EXPIRY_MS = 10 * 60 * 1000

const POPULAR_SUGGESTIONS = [
  'Software Engineer',
  'Frontend Developer',
  'Full Stack',
  'React Developer',
  'Python Developer',
  'Data Analyst',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
  'QA Engineer',
]

function formatTimeLeft(ms: number) {
  if (ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function Results() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    jobs, criteria, linkedinToken, savedJobs,
    setJobs, setTotalJobs, searchTimestamp, setSearchTimestamp,
    clearJobs, viewMode, setViewMode, updateCriteria
  } = useAppStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // 10-min expiry timer (guests only)
  useEffect(() => {
    if (!searchTimestamp || user) {
      setTimeLeft(null)
      return
    }
    const tick = () => {
      const remaining = Math.max(0, EXPIRY_MS - (Date.now() - searchTimestamp))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearJobs()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [searchTimestamp, user, clearJobs])

  const handleSearch = async (newPage = 1, overrideKeywords?: string[]) => {
    const activeKeywords = overrideKeywords || criteria.keywords
    const hasKeywords = Array.isArray(activeKeywords)
      ? activeKeywords.length > 0
      : !!activeKeywords
    if (!hasKeywords) return

    // Save search keywords & locations to the crowdsourced database
    void recordSearchKeywords(activeKeywords, 'keyword')
    if (criteria.location) {
      void recordSearchKeywords(criteria.location, 'location')
    }

    setIsLoading(true)
    setError('')

    try {
      const searchCriteria = overrideKeywords ? { ...criteria, keywords: overrideKeywords } : criteria
      const result = await searchJobs(searchCriteria, linkedinToken, newPage)
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
      setError((err instanceof Error ? err.message : '') || 'Failed to fetch jobs. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    handleSearch(nextPage)
  }

  const handleQuickSearch = (role: string) => {
    updateCriteria('keywords', [role])
    handleSearch(1, [role])
  }

  const keywords = Array.isArray(criteria.keywords) ? criteria.keywords : []
  const timerUrgent = timeLeft !== null && timeLeft < 60_000
  const timerWarning = timeLeft !== null && timeLeft < 5 * 60_000

  return (
    <div className="space-y-3">
      {/* Top Bar with My Jobs button (no redundant second header) */}
      <div className="flex items-center justify-between pb-0.5">
        <div className="text-xs text-gray-400 font-medium hidden sm:block">
          LinkedIn &amp; Bdjobs Search
        </div>
        <Link
          to="/saved"
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:text-[#0A66C2] hover:border-[#0A66C2] transition-all shadow-2xs"
        >
          <BookmarkCheck size={14} className="text-[#0A66C2]" />
          <span>My Jobs</span>
          {savedJobs.length > 0 && (
            <span className="bg-[#0A66C2] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none">
              {savedJobs.length}
            </span>
          )}
        </Link>
      </div>

      {/* Unified Search Box (Maximum 2 lines on desktop) */}
      <CriteriaForm onSearch={() => handleSearch(1)} isLoading={isLoading} />

      {/* Guest Expiry Banner */}
      {timeLeft !== null && timeLeft > 0 && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm border ${
            timerUrgent
              ? 'bg-red-50 border-red-200 text-red-700'
              : timerWarning
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {timerUrgent ? (
              <AlertTriangle size={15} className="shrink-0 text-red-600" />
            ) : (
              <Clock size={15} className="shrink-0" />
            )}
            <span>
              {timerUrgent ? 'Expiring soon! ' : 'Results expire in '}
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

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Guest Star Tip */}
      {!user && jobs.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Star size={13} className="text-amber-500 shrink-0 mt-0.5 fill-amber-400" />
          <span>
            <strong>Tip:</strong> Click <Star size={11} className="inline text-amber-500 fill-amber-400 mx-0.5" /> on any job to save to My Jobs — it won&apos;t expire.{' '}
            <button onClick={() => navigate('/auth')} className="text-[#0A66C2] underline font-medium">
              Sign in
            </button>{' '}
            to sync across devices.
          </span>
        </div>
      )}

      {/* Results Header when jobs are found */}
      {jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {jobs.length} Job{jobs.length !== 1 ? 's' : ''} Found
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {keywords.map((kw) => (
                <span key={kw} className="bg-[#F0F7FF] text-[#004182] text-xs font-medium px-2 py-0.5 rounded-full">
                  &ldquo;{kw}&rdquo;
                </span>
              ))}
              {criteria.remote && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  <Globe size={11} /> Remote
                </span>
              )}
              {criteria.location && !criteria.remote &&
                criteria.location
                  .split(',')
                  .map((loc) => loc.trim())
                  .filter(Boolean)
                  .map((loc) => (
                    <span key={loc} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      <MapPin size={11} /> {loc}
                    </span>
                  ))}
            </div>
          </div>

          {/* View toggle (Card / List) */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode('card')}
              title="Card view"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'card' ? 'bg-white shadow text-[#0A66C2]' : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white shadow text-[#0A66C2]' : 'text-gray-500'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && jobs.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse bg-white border border-gray-200 rounded-xl">
              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
              <div className="h-8 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Job List */}
      {jobs.length > 0 && <JobList jobs={jobs} viewMode={viewMode} />}

      {/* Load More Button */}
      {jobs.length > 0 && hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="btn-secondary inline-flex items-center gap-2 text-sm cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#0A66C2] border-t-transparent rounded-full animate-spin inline-block" />
                <span>Loading…</span>
              </>
            ) : (
              `Load more (showing ${jobs.length})`
            )}
          </button>
        </div>
      )}

      {/* End of results notice */}
      {jobs.length > 0 && !hasMore && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 pt-2">
          <CheckCircle2 size={13} className="text-green-600" />
          <span>All {jobs.length} results shown</span>
        </p>
      )}

      {/* Empty State / Initial Landing State */}
      {jobs.length === 0 && !isLoading && (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-14 h-14 bg-[#F0F7FF] rounded-full flex items-center justify-center mx-auto mb-3">
            <Briefcase size={26} className="text-[#0A66C2]" />
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {searchTimestamp ? 'No jobs found matching your criteria' : 'Ready to search jobs'}
          </h3>

          <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto mb-5">
            {searchTimestamp
              ? 'Try using broader keywords, changing location, or switching between LinkedIn and Bdjobs above.'
              : 'Enter job titles or skills above, or click one of the popular roles below to begin.'}
          </p>

          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-2.5 font-medium">
              <Sparkles size={13} className="text-amber-500" />
              <span>Popular searches</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {POPULAR_SUGGESTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleQuickSearch(role)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#F0F7FF] hover:text-[#0A66C2] text-gray-600 transition-colors font-medium border border-gray-200/60 cursor-pointer"
                >
                  + {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
