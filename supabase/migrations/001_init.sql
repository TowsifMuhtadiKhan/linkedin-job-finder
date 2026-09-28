-- ═══════════════════════════════════════════════════════════════
-- LinkedIn Job Finder — Database Schema
-- Run: supabase db push  OR  paste in Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── saved_jobs ───────────────────────────────────────────────────
-- Stores jobs that users have bookmarked.
create table if not exists public.saved_jobs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  job_id      text not null,                -- LinkedIn job ID
  title       text not null,
  company     text,
  location    text,
  url         text not null,
  logo        text,
  posted_date text,
  saved_at    timestamptz default now() not null,

  -- Prevent duplicate saves for the same job per user
  unique (user_id, job_id)
);

-- ── user_criteria ─────────────────────────────────────────────────
-- Stores saved search criteria presets per user.
create table if not exists public.user_criteria (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,              -- e.g. "React jobs in NYC"
  criteria     jsonb not null,             -- { keywords, location, jobType, ... }
  created_at   timestamptz default now() not null,

  unique (user_id, name)
);

-- ── Row Level Security ────────────────────────────────────────────
alter table public.saved_jobs enable row level security;
alter table public.user_criteria enable row level security;

-- saved_jobs policies
create policy "Users can read own saved jobs"
  on public.saved_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved jobs"
  on public.saved_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own saved jobs"
  on public.saved_jobs for delete
  using (auth.uid() = user_id);

-- user_criteria policies
create policy "Users can read own criteria"
  on public.user_criteria for select
  using (auth.uid() = user_id);

create policy "Users can insert own criteria"
  on public.user_criteria for insert
  with check (auth.uid() = user_id);

create policy "Users can update own criteria"
  on public.user_criteria for update
  using (auth.uid() = user_id);

create policy "Users can delete own criteria"
  on public.user_criteria for delete
  using (auth.uid() = user_id);
