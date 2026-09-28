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
  const { user } = useAuth()
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
          }))
          setSavedJobs(mapped)
        }
      })
  }, [user, setSavedJobs])

  const saveJob = useCallback(
    async (job) => {
      saveLocal(job)
      if (user && supabase) {
        await supabase.from('saved_jobs').upsert({
          user_id: user.id,
          job_id: job.id,
          title: job.title,
          company: job.company || '',
          location: job.location || '',
          url: job.url,
          logo: job.logo || null,
          posted_date: job.postedDate || null,
        })
      }
    },
    [user, saveLocal]
  )

  const unsaveJob = useCallback(
    async (jobId) => {
      unsaveLocal(jobId)
      if (user && supabase) {
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId)
      }
    },
    [user, unsaveLocal]
  )

  return { savedJobs, saveJob, unsaveJob, isJobSaved }
}
