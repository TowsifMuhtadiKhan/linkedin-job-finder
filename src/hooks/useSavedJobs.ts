import type { Job } from '../types'
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

    supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
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
          }))
          setSavedJobs(mapped)
        }
      })
  }, [user, setSavedJobs])

  const saveJob = useCallback(
    async (job: Job) => {
      if (authLoading) throw new Error('Please wait for your account to finish loading.')
      if (user && supabase) {
        const { error } = await supabase.from('saved_jobs').upsert({
          user_id: user.id,
          job_id: job.id,
          title: job.title,
          company: job.company || '',
          location: job.location || '',
          url: job.url,
          logo: job.logo || null,
          posted_date: job.postedDate || null,
          ...(job.appliedAt ? { applied_at: job.appliedAt } : {}),
          ...(job.deadline ? { deadline: job.deadline } : {}),
        }, { onConflict: 'user_id,job_id', ignoreDuplicates: true })
        if (error) throw new Error('Could not save this job. Please try again.')
      }
      saveLocal(job)
    },
    [user, authLoading, saveLocal]
  )

  const unsaveJob = useCallback(
    async (jobId: string) => {
      if (authLoading) throw new Error('Please wait for your account to finish loading.')
      if (user && supabase) {
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId)
        if (error) throw new Error('Could not remove this job. Please try again.')
      }
      unsaveLocal(jobId)
    },
    [user, authLoading, unsaveLocal]
  )

  const updateSavedJob = useCallback(async (jobId: string, changes: Pick<Job, 'appliedAt' | 'deadline'>) => {
    if (authLoading) throw new Error('Please wait for your account to finish loading.')
    if (user && supabase) {
      const updates = {
        ...(changes.appliedAt !== undefined ? { applied_at: changes.appliedAt } : {}),
        ...(changes.deadline !== undefined ? { deadline: changes.deadline } : {}),
      }
      const { data, error } = await supabase.from('saved_jobs').update(updates)
        .eq('user_id', user.id).eq('job_id', jobId).select('job_id').single()
      if (error || !data) throw new Error('Could not save your changes. Please try again.')
    }
    useAppStore.getState().updateSavedJob(jobId, changes)
  }, [user, authLoading])

  return { savedJobs, saveJob, unsaveJob, isJobSaved, updateSavedJob, authLoading }
}
