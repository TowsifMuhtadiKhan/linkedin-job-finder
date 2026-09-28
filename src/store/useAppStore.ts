import type { Job, LinkedInProfile, SearchCriteria, ViewMode } from '../types'
interface AppState {
  linkedinToken: string; setLinkedinToken: (token: string) => void; clearLinkedinToken: () => void
  profile: LinkedInProfile | null; setProfile: (profile: LinkedInProfile) => void; clearProfile: () => void
  criteria: SearchCriteria; setCriteria: (criteria: SearchCriteria) => void
  updateCriteria: <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => void
  resetCriteria: () => void
  jobs: Job[]; setJobs: (jobs: Job[]) => void; totalJobs: number; setTotalJobs: (n: number) => void
  searchTimestamp: number | null; setSearchTimestamp: (ts: number) => void; clearJobs: () => void
  viewMode: ViewMode; setViewMode: (mode: ViewMode) => void
  savedJobs: Job[]; setSavedJobs: (jobs: Job[]) => void; saveJob: (job: Job) => void
  unsaveJob: (id: string) => void; isJobSaved: (id: string) => boolean
}
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const normalizeKeywords = (kw: SearchCriteria['keywords']) => {
  if (Array.isArray(kw)) return kw
  if (typeof kw === 'string' && kw.trim()) return [kw.trim()]
  return []
}

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── LinkedIn Token ─────────────────────────────────────────────
      linkedinToken: '',
      setLinkedinToken: (token) => set({ linkedinToken: token }),
      clearLinkedinToken: () => set({ linkedinToken: '' }),


      // ── LinkedIn Profile ───────────────────────────────────────────
      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),

      // ── Search Criteria ────────────────────────────────────────────
      criteria: {
        keywords: [],
        location: '',
        jobType: '',
        experience: '',
        datePosted: '',
        remote: false,
      },
      setCriteria: (criteria) =>
        set({ criteria: { ...criteria, keywords: normalizeKeywords(criteria.keywords) } }),
      updateCriteria: (key, value) =>
        set((state) => ({ criteria: { ...state.criteria, [key]: value } })),
      resetCriteria: () =>
        set({
          criteria: { keywords: [], location: '', jobType: '', experience: '', datePosted: '', remote: false },
        }),

      // ── Search Results (NOT persisted — expires in 10 min) ─────────
      jobs: [],
      setJobs: (jobs) => set({ jobs }),
      totalJobs: 0,
      setTotalJobs: (n) => set({ totalJobs: n }),
      searchTimestamp: null,
      setSearchTimestamp: (ts) => set({ searchTimestamp: ts }),
      clearJobs: () => set({ jobs: [], totalJobs: 0, searchTimestamp: null }),

      // ── View mode ──────────────────────────────────────────────────
      viewMode: 'card',
      setViewMode: (mode) => set({ viewMode: mode }),

      // ── Saved / Favourite Jobs ─────────────────────────────────────
      savedJobs: [],
      setSavedJobs: (jobs) => set({ savedJobs: jobs }),
      saveJob: (job) => {
        const current = get().savedJobs
        if (!current.find((j) => j.id === job.id)) {
          set({ savedJobs: [...current, { ...job, savedAt: new Date().toISOString() }] })
        }
      },
      unsaveJob: (jobId) =>
        set({ savedJobs: get().savedJobs.filter((j) => j.id !== jobId) }),
      isJobSaved: (jobId) => get().savedJobs.some((j) => j.id === jobId),
    }),
    {
      name: 'linkedin-job-finder-v2',
      partialize: (state) => ({
        linkedinToken: state.linkedinToken,
        profile: state.profile,
        criteria: state.criteria,
        savedJobs: state.savedJobs,
        viewMode: state.viewMode,
      }),
    }
  )
)

export default useAppStore
