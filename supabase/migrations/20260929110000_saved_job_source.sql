-- Add source column to track whether a job came from LinkedIn or Bdjobs
alter table public.saved_jobs
  add column if not exists source text default 'linkedin';
