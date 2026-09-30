import type { SearchCriteria } from '../types'

export const JOB_PORTALS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'bdjobs', label: 'Bdjobs' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'handshake', label: 'Handshake' },
  { value: 'ziprecruiter', label: 'ZipRecruiter' },
] as const

export type JobPortal = typeof JOB_PORTALS[number]['value']

export const WORK_AUTHORIZATIONS = [
  { value: '', label: 'Any work authorization' },
  { value: 'OPT', label: 'OPT' },
  { value: 'CPT', label: 'CPT' },
  { value: 'STEM OPT', label: 'STEM OPT' },
  { value: 'H1B', label: 'H1B' },
]

export function searchKeywords(criteria: SearchCriteria): string {
  const terms = (Array.isArray(criteria.keywords) ? criteria.keywords : [criteria.keywords])
    .map(value => value.trim()).filter(Boolean).join(' OR ')
  if (!terms) return ''
  const authorization = criteria.workAuthorization
  if (!authorization) return terms
  const query = authorization === 'H1B' ? '(H1B OR "H-1B")' : `"${authorization}"`
  return `(${terms}) AND ${query}`
}

export function isProviderPortal(source: string | undefined): boolean {
  return ['indeed', 'glassdoor', 'handshake', 'ziprecruiter'].includes(source || '')
}

export function jobPortal(job: { source?: string | null; id: string; url: string }): JobPortal {
  if (JOB_PORTALS.some(portal => portal.value === job.source)) return job.source as JobPortal
  const prefix = job.id.split(':')[0]
  if (JOB_PORTALS.some(portal => portal.value === prefix)) return prefix as JobPortal
  try {
    const host = new URL(job.url).hostname
    for (const portal of JOB_PORTALS) {
      const domain = portal.value === 'handshake' ? 'joinhandshake.com' : portal.value + '.com'
      if (host === domain || host.endsWith('.' + domain)) return portal.value
    }
  } catch { /* Legacy saved job without a valid URL. */ }
  return 'linkedin'
}

export function portalLabel(job: { source?: string | null; id: string; url: string }): string {
  return JOB_PORTALS.find(portal => portal.value === jobPortal(job))!.label
}
