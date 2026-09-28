# 💼 LinkedIn Job Finder

A React + Supabase app that lets you paste your LinkedIn access token, set job search criteria, and instantly browse matching LinkedIn jobs with direct links.

---

## ✨ Features

- 🔑 **LinkedIn token auth** — paste your token, optionally see your profile info
- 🔍 **Rich search filters** — keywords, location, job type, experience level, date posted, remote toggle
- 🃏 **Job cards** — title, company, location, date, direct LinkedIn link
- 🔖 **Bookmark jobs** — save jobs locally (or to Supabase DB when configured)
- 📄 **Load more** — paginated results
- ⚡ **Works offline-first** — localStorage fallback when Supabase is not configured

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment (optional but recommended)
```bash
cp .env.example .env
```
Edit `.env` with your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Getting a LinkedIn Access Token

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/) → **Create App**
2. Request these OAuth scopes: `openid`, `profile`, `email`
3. Use the **OAuth 2.0 Authorization Code flow** to get an access token
4. Paste the token in the app's Setup page

> **Note**: LinkedIn's official Job Search API is partner-only. Job listings are fetched via LinkedIn's guest API (no auth required for search, token is used for profile verification).

---

## ☁️ Supabase Setup (optional)

Supabase enables:
- Server-side LinkedIn API proxy (avoids CORS)
- Saved jobs synced across devices
- Search criteria presets

### Steps:
1. Create a project at [supabase.com](https://app.supabase.com)
2. Copy **Project URL** and **anon key** into your `.env`
3. Run the SQL migration in the Supabase SQL editor:
   ```
   supabase/migrations/001_init.sql
   ```
4. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy search-jobs
   ```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Top navigation bar
│   ├── TokenInput.jsx      # LinkedIn token entry + verification
│   ├── CriteriaForm.jsx    # Job search filters form
│   ├── JobCard.jsx         # Individual job listing card
│   └── JobList.jsx         # Responsive grid of job cards
├── pages/
│   ├── Setup.jsx           # Token + criteria setup page
│   ├── Results.jsx         # Job results with pagination
│   └── Saved.jsx           # Bookmarked jobs
├── hooks/
│   └── useJobSearch.js     # Search logic + LinkedIn HTML parser
├── store/
│   └── useAppStore.js      # Zustand global state (persisted)
└── lib/
    └── supabase.js         # Supabase client

supabase/
├── functions/
│   └── search-jobs/        # Edge Function: LinkedIn proxy
└── migrations/
    └── 001_init.sql        # DB schema (saved_jobs, user_criteria)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand (persisted) |
| Routing | React Router v6 |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase Postgres + RLS |
| Icons | Lucide React |
