import { ExternalLink, Trash2, Send, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSavedJobs } from '../hooks/useSavedJobs'

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return dateStr }
}

export default function Saved() {
  const { savedJobs, unsaveJob } = useSavedJobs()

  if (savedJobs.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookmarkCheck size={28} className="text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No saved jobs yet</h2>
        <p className="text-gray-500 text-sm mb-6">
          Click the ⭐ bookmark icon on any job to save it here permanently.
        </p>
        <Link to="/results" className="btn-primary inline-flex items-center gap-2">
          Browse Jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookmarkCheck size={22} className="text-[#0077B5]" /> Saved Jobs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {savedJobs.length} favourite{savedJobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {[...savedJobs].reverse().map((job) => (
          <div key={job.id} className="card px-4 py-3 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">{job.title}</h3>
              {job.company && (
                <p className="text-[#0077B5] text-sm mt-0.5">{job.company}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                {job.location && <span>📍 {job.location}</span>}
                {job.savedAt && <span>Saved {formatDate(job.savedAt)}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#0077B5] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#004182] transition-colors"
              >
                <Send size={11} /> Apply
              </a>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded border border-gray-200 text-[#0077B5] hover:bg-[#E8F4FD] transition-colors"
                title="View on LinkedIn"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => unsaveJob(job.id)}
                className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
