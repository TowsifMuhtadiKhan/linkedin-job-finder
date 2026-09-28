import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Info, LogIn, Key, Eye, EyeOff, CheckCircle, ExternalLink } from 'lucide-react'
import TokenInput from '../components/TokenInput'
import CriteriaForm from '../components/CriteriaForm'
import { searchJobs } from '../hooks/useJobSearch'
import useAppStore from '../store/useAppStore'
import { useAuth } from '../hooks/useAuth'

function RapidApiKeyInput() {
  const { rapidApiKey, setRapidApiKey } = useAppStore()
  const [input, setInput] = useState(rapidApiKey)
  const [show, setShow] = useState(false)

  const handleSave = () => {
    setRapidApiKey(input.trim())
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Key size={17} className="text-[#0077B5] shrink-0" />
        <h2 className="font-semibold text-gray-900 text-sm sm:text-base">RapidAPI Key (Required for Search)</h2>
      </div>

      <p className="text-xs sm:text-sm text-gray-500 mb-3">
        Get a free key at{' '}
        <a
          href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0077B5] hover:underline inline-flex items-center gap-0.5"
        >
          JSearch on RapidAPI <ExternalLink size={11} />
        </a>{' '}
        — free tier gives 500 searches/month. Returns real LinkedIn jobs.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            className="input-field pr-9 text-sm"
            placeholder="Paste your RapidAPI key here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!input.trim()}
          className="btn-primary text-sm px-4 shrink-0"
        >
          Save
        </button>
      </div>

      {rapidApiKey && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-green-700">
          <CheckCircle size={12} /> Key saved
        </div>
      )}
    </div>
  )
}

export default function Setup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { linkedinToken, rapidApiKey, criteria, setJobs, setTotalJobs, setSearchTimestamp } =
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
      const result = await searchJobs(criteria, linkedinToken, rapidApiKey)
      setJobs(result.jobs || [])
      setTotalJobs(result.total || result.jobs?.length || 0)
      setSearchTimestamp(Date.now())
      navigate('/results')
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        setError('Please enter your RapidAPI key above to search for jobs.')
      } else {
        setError(err.message || 'Failed to fetch jobs. Please try again.')
      }
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

      {/* RapidAPI Key */}
      <RapidApiKeyInput />

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

      {/* How to get RapidAPI key */}
      <div className="card p-4 sm:p-5 bg-[#E8F4FD] border-[#0077B5]/20">
        <h3 className="text-sm font-semibold text-[#004182] mb-2.5">
          🔑 How to get your free RapidAPI key (2 minutes)
        </h3>
        <ol className="text-xs sm:text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>
            Go to{' '}
            <a
              href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0077B5] hover:underline"
            >
              JSearch on RapidAPI
            </a>
          </li>
          <li>Sign up for a free account (or log in)</li>
          <li>Click <strong>"Subscribe to Test"</strong> → select the Free plan</li>
          <li>Go to <strong>My Apps</strong> → copy your <strong>API Key</strong></li>
          <li>Paste it in the field above and click Save</li>
        </ol>
      </div>
    </div>
  )
}
