-- Existing saved jobs remain not applied, with no known deadline.
alter table public.saved_jobs
  add column if not exists applied_at timestamptz,
  add column if not exists deadline date;

create policy "Users can update own saved jobs"
  on public.saved_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
