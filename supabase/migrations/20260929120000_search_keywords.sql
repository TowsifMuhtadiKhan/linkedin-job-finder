-- ── search_keywords ─────────────────────────────────────────────
-- Shared database table storing keywords and locations searched by users
-- Enables crowdsourced autocomplete and popular suggestions for everyone.

create table if not exists public.search_keywords (
  id               uuid primary key default uuid_generate_v4(),
  keyword          text not null,
  category         text not null default 'keyword', -- 'keyword' or 'location'
  search_count     int not null default 1,
  last_searched_at timestamptz not null default now(),

  constraint unique_keyword_category unique (keyword, category)
);

-- Enable RLS
alter table public.search_keywords enable row level security;

-- Public can read all suggestions
create policy "Allow public read search keywords"
  on public.search_keywords for select
  using (true);

-- Authenticated and anonymous users can insert/upsert search keywords
create policy "Allow public insert search keywords"
  on public.search_keywords for insert
  with check (true);

create policy "Allow public update search keywords"
  on public.search_keywords for update
  using (true);
