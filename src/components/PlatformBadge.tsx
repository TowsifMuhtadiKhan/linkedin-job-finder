import type { Job } from '../types'
import { jobPortal, portalLabel } from '../lib/jobPortals'
import { LinkedInLogo, BdjobsLogo } from './PlatformLogos'
import { Briefcase } from 'lucide-react'

export default function PlatformBadge({ job }: { job: Job }) {
  const source = jobPortal(job)
  return (
    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0A66C2] border border-blue-200">
      {source === 'linkedin' ? <LinkedInLogo className="w-3 h-3" /> : source === 'bdjobs' ? <BdjobsLogo className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
      <span>{portalLabel(job)}</span>
    </span>
  )
}
