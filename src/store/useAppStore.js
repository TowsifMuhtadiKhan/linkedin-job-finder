import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const normalizeKeywords = (kw) => {
  if (Array.isArray(kw)) return kw
  if (typeof kw === 'string' && kw.trim()) return [kw.trim()]
  return []
}

const useAppStore = create(
  persist(
    (set, get) => ({
      // ── LinkedIn Token ─────────────────────────────────────────────
      linkedinToken: '',
      setLinkedinToken: (token) => set({ linkedinToken: token }),
      clearLinkedinToken: () => set({ linkedinToken: '' }),

      // ── RapidAPI Key (for JSearch job search) ──────────────────────
      rapidApiKey: '',
      setRapidApiKey: (key) => set({ rapidApiKey: key }),

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
        rapidApiKey: state.rapidApiKey,
        profile: state.profile,
        criteria: state.criteria,
        savedJobs: state.savedJobs,
        viewMode: state.viewMode,
      }),
    }
  )
)

export default useAppStore
