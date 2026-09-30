import { jobPortal } from '../lib/jobPortals'
import type { Job, Database } from '../types'
import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'
import { useAuth } from './useAuth'

/**
 * Unified saved-jobs hook.
 * - When logged in: syncs with Supabase saved_jobs table
 * - When not logged in: uses localStorage via Zustand
 */
export function useSavedJobs() {
  const { user, loading: authLoading } = useAuth()
  const { savedJobs, saveJob: saveLocal, unsaveJob: unsaveLocal, isJobSaved, setSavedJobs } =
    useAppStore()

  // Load from Supabase when user logs in
  useEffect(() => {
    if (!user || !supabase) return

    let cancelled = false
    const epoch = useAppStore.getState().savedJobsEpoch
    supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .then(({ data }) => {
        if (data && !cancelled && useAppStore.getState().savedJobsEpoch === epoch) {
          const mapped = data.map((row) => ({
            id: row.job_id,
            title: row.title,
            company: row.company,
            location: row.location,
            url: row.url,
            logo: row.logo,
            postedDate: row.posted_date,
            savedAt: row.saved_at,
            appliedAt: row.applied_at,
            deadline: row.deadline,
            source: jobPortal({ source: row.source, id: row.job_id, url: row.url }),
          }))
          setSavedJobs(mapped)
        }
      })
    return () => { cancelled = true }
  }, [user, setSavedJobs])

  const saveJob = useCallback(
    async (job: Job) => {
      if (authLoading) throw new Error('Please wait for your account to finish loading.')
      const epoch = useAppStore.getState().savedJobsEpoch
      if (useAppStore.getState().savedJobsOwner !== (user?.id ?? null)) throw new Error('Your account changed. Please try again.')
      const jobSource = jobPortal(job)

      if (user && supabase) {
        const payload: Database['public']['Tables']['saved_jobs']['Insert'] = {
          user_id: user.id,
          job_id: job.id,
          title: job.title,
          company: job.company || '',
          location: job.location || '',
          url: job.url,
          logo: job.logo || null,
          posted_date: job.postedDate || null,
          source: jobSource,
          ...(job.appliedAt ? { applied_at: job.appliedAt } : {}),
          ...(job.deadline ? { deadline: job.deadline } : {}),
        }
        let { error } = await supabase.from('saved_jobs').upsert(payload, { onConflict: 'user_id,job_id', ignoreDuplicates: true })
        if (error && error.message?.includes('source')) {
          const fallbackPayload = { ...payload }
          delete fallbackPayload.source
          const fallback = await supabase.from('saved_jobs').upsert(fallbackPayload, { onConflict: 'user_id,job_id', ignoreDuplicates: true })
          error = fallback.error
        }
        if (error) throw new Error('Could not save this job. Please try again.')
      }
      if (useAppStore.getState().savedJobsEpoch !== epoch) return
      saveLocal({ ...job, source: jobSource })
    },
    [user, authLoading, saveLocal]
  )

  const unsaveJob = useCallback(
    async (jobId: string) => {
      if (authLoading) throw new Error('Please wait for your account to finish loading.')
      const epoch = useAppStore.getState().savedJobsEpoch
      if (useAppStore.getState().savedJobsOwner !== (user?.id ?? null)) throw new Error('Your account changed. Please try again.')
      if (user && supabase) {
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId)
        if (error) throw new Error('Could not remove this job. Please try again.')
      }
      if (useAppStore.getState().savedJobsEpoch !== epoch) return
      unsaveLocal(jobId)
    },
    [user, authLoading, unsaveLocal]
  )

  const updateSavedJob = useCallback(async (jobId: string, changes: Pick<Job, 'appliedAt' | 'deadline'>) => {
    if (authLoading) throw new Error('Please wait for your account to finish loading.')
      const epoch = useAppStore.getState().savedJobsEpoch
      if (useAppStore.getState().savedJobsOwner !== (user?.id ?? null)) throw new Error('Your account changed. Please try again.')
    if (user && supabase) {
      const updates = {
        ...(changes.appliedAt !== undefined ? { applied_at: changes.appliedAt } : {}),
        ...(changes.deadline !== undefined ? { deadline: changes.deadline } : {}),
      }
      const { data, error } = await supabase.from('saved_jobs').update(updates)
        .eq('user_id', user.id).eq('job_id', jobId).select('job_id').single()
      if (error || !data) throw new Error('Could not save your changes. Please try again.')
    }
    if (useAppStore.getState().savedJobsEpoch !== epoch) return
    useAppStore.getState().updateSavedJob(jobId, changes)
  }, [user, authLoading])

  return { isGuest: !user, savedJobs, saveJob, unsaveJob, isJobSaved, updateSavedJob, authLoading }
}
