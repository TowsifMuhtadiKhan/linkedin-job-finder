import { Link } from 'react-router-dom'
import type { Job } from '../types'

export default function ReviewCVLink({ job }: { job: Job }) {
  return <Link to={`/cv-review?${new URLSearchParams({ job: job.url })}`} className="shrink-0 text-xs font-semibold text-[#0077B5] rounded-full border border-[#0077B5] px-3 py-1.5">Check CV</Link>
}
