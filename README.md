# LinkedIn Job Finder

<img src="public/logo.png" alt="LinkedIn Job Finder logo" width="160" />

Find LinkedIn job listings across multiple roles and locations, compare opportunities, and bookmark jobs you want to revisit.

Built with **React, TypeScript, Vite, and Supabase**.

## About the project

Job searching often involves repeating searches for different titles and places. LinkedIn Job Finder brings those criteria into one interface so you can discover and organize opportunities more easily.

For example, search for **React Developer** and **Software Engineer** in **Bangladesh** and **London**, then narrow the results to **full-time roles posted in the past week**.

The app links you to original listings. It does not submit applications on your behalf.

## Features

- **Keyword chips:** Add multiple job titles or skills with Enter or comma.
- **Job sources:** Choose LinkedIn or Bdjobs in Search Criteria. Bdjobs currently supports keyword search, pagination, bookmarks, and descriptions for CV comparisons. Its public website endpoints may change; failures are shown explicitly. Deploy `search-bdjobs` for local and hosted use. Advanced filters currently apply to LinkedIn only.
- **Location chips:** Search several locations and combine results without duplicate job IDs.
- **Search filters:** Filter by remote work, job type, experience, and posting date.
- **Card and list views:** Choose how you browse job details.
- **Direct links:** Open listings, follow application links, or copy job URLs.
- **Bookmarks:** Save jobs locally, with Supabase synchronization when signed in and configured.
- **Email accounts:** Register and sign in through Supabase Auth.
- **Guest access:** Search without an account; guest results expire after 10 minutes.
- **Responsive interface:** Browse on desktop or mobile.
- **CV uploads:** Signed-in users can submit their CV to the portal's shared Google Drive folder. Requires the [one-time owner setup](docs/cv-upload-setup.md).
- **Free CV checker:** Choose **Check CV** on a job or open `/cv-review`. Fetch a LinkedIn description (or paste it), load an uploaded PDF/DOCX or local file, and review keyword coverage, text structure checks, and improvement suggestions. Analysis runs in the browser; no AI API key is needed. Scores are English-language heuristics, not employer ATS scores or hiring predictions. Scanned PDFs and legacy DOC files require pasted text. Deploy the `job-description` Edge Function to enable fetching; it validates Supabase Auth tokens in its handler.

**No JSearch or RapidAPI subscription is required.** A LinkedIn access token is optional and is used for profile lookup, not job search.

## How to use it

1. Open **Setup**. Sign in to synchronize bookmarks, or continue as a guest.
2. Add at least one **keyword**. Press Enter or comma to create a chip.
3. Add your preferred **locations**, or leave the field empty for a broader search.
4. Choose your filters and select **Search Jobs**.
5. Browse results in card or list view. Select **Load more** for additional listings.
6. Bookmark opportunities and revisit them in **Saved**.
7. Select **Apply** or **View** to open the original listing.

A **remote** location chip runs a separate remote search. The **Remote only** switch applies the remote filter to every selected location.

## Technology

| Technology | Purpose |
| --- | --- |
| React and TypeScript | User interface and typed application logic |
| Vite | Local development and production builds |
| Tailwind CSS | Responsive styling |
| Zustand | Application state and local persistence |
| Supabase Auth | Email registration and sign-in |
| Supabase Postgres | Saved jobs with row-level security |
| Supabase Edge Functions | Production job-search proxy |

The app extracts listings from LinkedIn's public guest search pages. Local development uses a Vite proxy; production builds use the **search-jobs** Supabase Edge Function.

## Run locally

Install Node.js compatible with the Vite version in `package.json`, npm, and Git. Then run:

```bash
git clone https://github.com/TowsifMuhtadiKhan/linkedin-job-finder.git
cd linkedin-job-finder
npm ci
npm run dev
```

Open the address printed in the terminal, normally **http://localhost:3000**.

Local search works without Supabase. To enable accounts and database-backed bookmarks, copy `.env.example` to `.env` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Use a publishable or legacy anon key, never a secret or service-role key. Restart the development server after changing these values.

For a new Supabase database, run [001_init.sql](supabase/migrations/001_init.sql) once in the SQL Editor. Rerunning the script can produce an already-existing-policy error.

## Deployment

The included [vercel.json](vercel.json) configures the frontend build and application routes.

1. Push your changes to GitHub and import the repository into Vercel.
2. Select **Vite**, use **npm run build**, and set the output directory to **dist**.
3. Add the two environment variables above to Vercel and deploy.
4. Deploy the search backend to the same Supabase project:

   ```bash
   npx supabase login
   npx supabase functions deploy search-jobs --project-ref YOUR_PROJECT_REF --use-api --no-verify-jwt
   ```

   This supports guest searches without requiring a signed-in session.

5. Set the Supabase Auth **Site URL** to your deployed address for email confirmations.
6. Test sign-in, search, bookmarks, and refreshing a route such as `/results`.

Vercel does not run the local Vite proxy. Production search needs the deployed Edge Function.

See the [Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [Supabase URL configuration guide](https://supabase.com/docs/guides/auth/redirect-urls).

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development with the local search proxy |
| `npm run typecheck` | Run strict frontend TypeScript checks |
| `npm run lint` | Check code quality |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview production locally; search uses Supabase |

The Edge Function uses Deno TypeScript and is separate from the frontend type check.

## Project structure

```text
src/
  components/       Search controls, navigation, and job cards
  pages/            Setup, results, authentication, and saved jobs
  hooks/            Search, authentication, and bookmark logic
  lib/              Supabase client and local search
  store/            Application state and persistence
  types.ts          Shared application and database types
supabase/
  functions/        Production search function
  migrations/       Database tables and policies
vite.config.ts      Local development configuration
vercel.json         Frontend deployment configuration
```

## Current limitations

- Listings depend on LinkedIn's availability and page structure. Searches can be blocked or rate-limited.
- Search results are held in memory and disappear on reload, even when signed in. Bookmark jobs you want to keep.
- The database includes a criteria table, but the interface does not yet offer saved search presets.
- A missing production function can appear as a CORS error or a failed Edge Function request.

This is an independent project and is not affiliated with or endorsed by LinkedIn.

### Additional job portals and work authorization

Indeed, Glassdoor, Handshake, and ZipRecruiter now use the in-app results list, save controls, and application tracking. Searching never opens an external tab. Apply/View links still open the actual posting, as they do for LinkedIn and Bdjobs.

These four sources require the new Supabase function search-portals and a server-only SEARCHAPI_API_KEY secret. Deploy the function from supabase/functions/search-portals using your normal Supabase deployment workflow, and add the secret under Edge Functions ? Secrets in the Supabase dashboard. Never put this key in a VITE variable or client code. No key is included or configured by this change; until configured, searches show an explicit service-unavailable message.

The adapter uses [SearchAPI Google Jobs](https://www.searchapi.io/docs/google-jobs). It displays only indexed jobs with an HTTPS application URL on the selected portal's domain, not other boards. This is indexed coverage, not a complete copy of any portal; private Handshake listings cannot be retrieved. Some pages may have no matches while subsequent pages do; Load more follows the provider's pagination token. Missing dates and logos are left blank rather than invented. LinkedIn-specific remote/type/experience/date filters remain limited to LinkedIn.

OPT, CPT, STEM OPT, and H1B are keyword filters, not verification of sponsorship or eligibility. The selection persists with search preferences and Reset clears it.
