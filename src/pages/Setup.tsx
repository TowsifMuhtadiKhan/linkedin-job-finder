import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import CriteriaForm from '../components/CriteriaForm'
import { searchJobs } from '../hooks/useJobSearch'
import { recordSearchKeywords } from '../lib/keywordService'
import useAppStore from '../store/useAppStore'

export default function Setup() {
  const navigate = useNavigate()
  const { linkedinToken, criteria, setJobs, setTotalJobs, setSearchTimestamp } =
    useAppStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    const hasKeywords = Array.isArray(criteria.keywords)
      ? criteria.keywords.length > 0
      : !!criteria.keywords
    if (!hasKeywords) return

    // Save search keywords & locations to the crowdsourced database
    void recordSearchKeywords(criteria.keywords, 'keyword')
    if (criteria.location) {
      void recordSearchKeywords(criteria.location, 'location')
    }

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
          Find Your Next <span className="text-[#0077B5]">Job</span>
        </h1>
        <p className="text-gray-500 text-sm">
          Search matching jobs across LinkedIn &amp; Bdjobs with direct apply links.
        </p>
      </div>

      {/* Criteria */}
      <CriteriaForm onSearch={handleSearch} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Optional link to Profile */}
      <div className="text-center pt-2 pb-4">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="text-xs text-gray-400 hover:text-[#0077B5] transition-colors inline-flex items-center gap-1"
        >
          LinkedIn Developer Token (Optional) is located in Profile settings →
        </button>
      </div>
    </div>
  )
}
