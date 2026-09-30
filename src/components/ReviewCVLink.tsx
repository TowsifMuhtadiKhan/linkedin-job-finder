import { Link } from 'react-router-dom'
import type { Job } from '../types'

export default function ReviewCVLink({ job }: { job: Job }) {
  return (
    <Link
      state={{ description: job.description || '' }}
      to={`/cv-review?${new URLSearchParams({ job: job.url })}`}
      className="shrink-0 text-xs font-semibold text-[#0A66C2] rounded-full border border-[#0A66C2] px-3 py-1.5 hover:bg-[#F0F7FF] transition-colors"
    >
      Check CV
    </Link>
  )
}
