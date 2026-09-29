import type { FormEvent } from 'react'
import { RotateCcw, Globe, Search } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import KeywordsInput from './KeywordsInput'
import { LinkedInLogo, BdjobsLogo } from './PlatformLogos'
import CustomSelect from './CustomSelect'

const JOB_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
]

const EXPERIENCE_LEVELS = [
  { value: '', label: 'Any experience' },
  { value: 'internship', label: 'Internship' },
  { value: 'entry', label: 'Entry level' },
  { value: 'associate', label: 'Associate' },
  { value: 'mid-senior', label: 'Mid-Senior' },
  { value: 'director', label: 'Director' },
  { value: 'executive', label: 'Executive' },
]

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '24h', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
]

export default function CriteriaForm({
  onSearch,
  isLoading,
}: {
  onSearch: () => void
  isLoading: boolean
}) {
  const { criteria, updateCriteria, resetCriteria } = useAppStore()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSearch?.()
  }

  const hasKeywords = Array.isArray(criteria.keywords)
    ? criteria.keywords.length > 0
    : !!criteria.keywords

  const isLinkedIn = (criteria.source || 'linkedin') === 'linkedin'

  return (
    <div className="card p-3 sm:p-4 w-full shadow-sm border border-gray-200 bg-white">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Line 1: Primary Search Bar (Platform Toggle, Keywords, Location, Search Button) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Source Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 shrink-0 h-[42px] items-center">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => updateCriteria('source', 'linkedin')}
              className={`h-full px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                isLinkedIn
                  ? 'bg-white text-[#0A66C2] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LinkedInLogo className="w-3.5 h-3.5" />
              <span>LinkedIn</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                useAppStore.getState().setCriteria({
                  ...criteria,
                  source: 'bdjobs',
                  location: '',
                  remote: false,
                  jobType: '',
                  experience: '',
                  datePosted: '',
                })
              }
              className={`h-full px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                criteria.source === 'bdjobs'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BdjobsLogo className="w-3.5 h-3.5" />
              <span>Bdjobs</span>
            </button>
          </div>

          {/* Keywords Tag Input */}
          <div className="flex-1 min-w-[200px]">
            <KeywordsInput
              label="Keywords"
              placeholder="Job title or keywords (e.g. React, Python...)"
              keywords={Array.isArray(criteria.keywords) ? criteria.keywords : []}
              onChange={(kws) => updateCriteria('keywords', kws)}
              category="keyword"
            />
          </div>

          {/* Location Input (LinkedIn only) */}
          {isLinkedIn && (
            <div className="w-full md:w-56 lg:w-64 shrink-0">
              <KeywordsInput
                label="Location"
                placeholder="Location (e.g. Bangladesh...)"
                keywords={(criteria.location || '')
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)}
                onChange={(locations) => updateCriteria('location', locations.join(', '))}
                disabled={criteria.remote}
                category="location"
              />
            </div>
          )}

          {/* Search Button (Using Search icon instead of emoji, with vibrant logo blue) */}
          <button
            type="submit"
            disabled={isLoading || !hasKeywords}
            className="btn-primary h-[42px] px-6 shrink-0 flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                <span>Searching…</span>
              </>
            ) : (
              <>
                <Search size={16} className="text-white" />
                <span>Search Jobs</span>
              </>
            )}
          </button>
        </div>

        {/* Line 2: Secondary Filters & Reset (max 2 lines total) */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-gray-600 pt-0.5">
          {isLinkedIn ? (
            <>
              {/* Remote Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={criteria.remote}
                onClick={() => updateCriteria('remote', !criteria.remote)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  criteria.remote
                    ? 'bg-blue-50 border-blue-200 text-[#0A66C2]'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Globe size={13} className={criteria.remote ? 'text-[#0A66C2]' : 'text-gray-400'} />
                <span>Remote only</span>
              </button>

              <span className="text-gray-300 hidden sm:inline">|</span>

              {/* Job Type Dropdown */}
              <CustomSelect
                value={criteria.jobType || ''}
                onChange={(val) => updateCriteria('jobType', val)}
                options={JOB_TYPES}
                placeholder="Job Type"
                menuWidth="w-40"
                ariaLabel="Job Type filter"
              />

              {/* Experience Dropdown */}
              <CustomSelect
                value={criteria.experience || ''}
                onChange={(val) => updateCriteria('experience', val)}
                options={EXPERIENCE_LEVELS}
                placeholder="Experience"
                menuWidth="w-44"
                ariaLabel="Experience level filter"
              />

              {/* Date Posted Dropdown */}
              <CustomSelect
                value={criteria.datePosted || ''}
                onChange={(val) => updateCriteria('datePosted', val)}
                options={DATE_OPTIONS}
                placeholder="Date Posted"
                menuWidth="w-40"
                ariaLabel="Date posted filter"
              />
            </>
          ) : (
            <span className="text-xs text-gray-500">
              Searching Bdjobs across Bangladesh. Multiple keywords can be entered.
            </span>
          )}

          {/* Reset Filters on the far right */}
          <div className="ml-auto flex items-center">
            <button
              type="button"
              onClick={resetCriteria}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors py-1 cursor-pointer"
              title="Reset all search criteria"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
