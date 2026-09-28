import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Info, LogIn } from 'lucide-react'
import TokenInput from '../components/TokenInput'
import CriteriaForm from '../components/CriteriaForm'
import { searchJobs } from '../hooks/useJobSearch'
import useAppStore from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

export default function Setup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { linkedinToken, criteria, setJobs, setTotalJobs, setSearchTimestamp } =
    useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    const hasKeywords = Array.isArray(criteria.keywords)
      ? criteria.keywords.length > 0
      : !!criteria.keywords
    if (!hasKeywords) return

    setIsLoading(true)
    setError('')

    try {
      const result = await searchJobs(criteria, linkedinToken)
      setJobs(result.jobs || [])
      setTotalJobs(result.total || result.jobs?.length || 0)
      setSearchTimestamp(Date.now())
      navigate('/results')
    } catch (err) {
      setError((err instanceof Error ? err.message : '') || 'Failed to fetch jobs. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center py-3 sm:py-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1.5">
          Find Your Next <span className="text-[#0077B5]">LinkedIn Job</span>
        </h1>
        <p className="text-gray-500 text-sm">
          Set your criteria to find matching jobs with direct apply links.
        </p>
      </div>

      {/* Auth status */}
      {!user ? (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs sm:text-sm">
          <Info size={15} className="mt-0.5 shrink-0" />
          <div>
            <strong>Not signed in</strong> — results disappear after 10 min.{' '}
            <button
              onClick={() => navigate('/auth')}
              className="underline font-semibold hover:no-underline inline-flex items-center gap-1"
            >
              <LogIn size={11} /> Sign in
            </button>{' '}
            to keep them permanently.
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2.5 text-sm">
          ✅ Signed in as <strong className="truncate">{user.email}</strong>
        </div>
      )}

{/* LinkedIn Token (optional) */}
      <TokenInput />

      {/* Criteria */}
      <CriteriaForm onSearch={handleSearch} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}


    </div>
  )
}
