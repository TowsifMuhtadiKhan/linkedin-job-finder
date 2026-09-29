import type { FormEvent } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import KeywordsInput from './KeywordsInput'

const JOB_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
]

const EXPERIENCE_LEVELS = [
  { value: '', label: 'Any level' },
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

export default function CriteriaForm({ onSearch, isLoading }: { onSearch: () => void; isLoading: boolean }) {
  const { criteria, updateCriteria, resetCriteria } = useAppStore()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSearch?.()
  }

  const hasKeywords = Array.isArray(criteria.keywords)
    ? criteria.keywords.length > 0
    : !!criteria.keywords

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={17} className="text-[#0077B5]" />
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Search Criteria</h2>
        </div>
        <button type="button" onClick={resetCriteria}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="job-source" className="label text-xs sm:text-sm">Job source</label>
          <select id="job-source" className="input-field bg-white text-sm" value={criteria.source || 'linkedin'} disabled={isLoading}
            onChange={e => useAppStore.getState().setCriteria({ ...criteria, source: e.target.value as 'linkedin' | 'bdjobs', location: '', remote: false, jobType: '', experience: '', datePosted: '' })}>
            <option value="linkedin">LinkedIn</option><option value="bdjobs">Bdjobs</option>
          </select>
          {criteria.source === 'bdjobs' && <p className="text-xs text-gray-500 mt-2">Search Bdjobs by keyword. Multiple keywords are combined without duplicate jobs. Location and advanced filters are currently available for LinkedIn only.</p>}
        </div>
        {/* Keywords */}
        <div>
          <label className="label text-xs sm:text-sm">
            Keywords
            <span className="text-gray-400 font-normal ml-1 hidden sm:inline">(Enter or comma to add)</span>
          </label>
          <KeywordsInput
            keywords={Array.isArray(criteria.keywords) ? criteria.keywords : []}
            onChange={(kws) => updateCriteria('keywords', kws)}
          />
          <p className="text-xs text-gray-400 mt-1 sm:hidden">Press Enter or comma to add each keyword</p>
        </div>

        {criteria.source !== 'bdjobs' && <>
        {/* Location */}
        <div>
          <label className="label text-xs sm:text-sm">
            Location
            <span className="text-gray-400 font-normal ml-1 hidden sm:inline">(Enter or comma to add)</span>
          </label>
          <KeywordsInput
            label="Location"
            placeholder="Type location + Enter (e.g. Bangladesh, London...)"
            keywords={(criteria.location || '').split(',').map((value) => value.trim()).filter(Boolean)}
            onChange={(locations) => updateCriteria('location', locations.join(', '))}
            disabled={criteria.remote}
          />
          <p className="text-xs text-gray-400 mt-1 sm:hidden">Press Enter or comma to add each location</p>
        </div>

        {/* Remote toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={criteria.remote}
            onClick={() => updateCriteria('remote', !criteria.remote)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              criteria.remote ? 'bg-[#0077B5]' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              criteria.remote ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-gray-700 font-medium">Remote only</span>
        </div>

        {/* Job Type + Experience — stacked on mobile, side by side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs sm:text-sm">Job Type</label>
            <select className="input-field bg-white text-sm"
              value={criteria.jobType} onChange={(e) => updateCriteria('jobType', e.target.value)}>
              {JOB_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs sm:text-sm">Experience</label>
            <select className="input-field bg-white text-sm"
              value={criteria.experience} onChange={(e) => updateCriteria('experience', e.target.value)}>
              {EXPERIENCE_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Date Posted */}
        <div>
          <label className="label text-xs sm:text-sm">Date Posted</label>
          <select className="input-field bg-white text-sm"
            value={criteria.datePosted} onChange={(e) => updateCriteria('datePosted', e.target.value)}>
            {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        </>}
        <button type="submit" disabled={isLoading || !hasKeywords}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base">
          {isLoading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Searching…</>
          ) : '🔍 Search Jobs'}
        </button>

        {!hasKeywords && (
          <p className="text-xs text-center text-gray-400">Add at least one keyword to search</p>
        )}
      </form>
    </div>
  )
}
