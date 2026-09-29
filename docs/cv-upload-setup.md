# Shared CV storage setup (portal owner only)

All signed-in portal users upload to the same folder:
https://drive.google.com/drive/folders/1wao-YqO_31acRc-U4xsxQJGZgW65AFFc

Users do not need Google accounts or access to the folder. They select **Upload CV** in the portal, choose a PDF, DOC, or DOCX up to 5 MB, and submit it. The backend uses one owner connection for all uploads. Each submission creates a new file labeled with the portal user ID and timestamp; the account email is in its description.

The folder ID is fixed in the backend. A public folder link does not grant the application permission to create files. The following one-time owner setup is required before uploads work.

## Connect the owner's Google account

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project and enable **Google Drive API**.
2. Configure Google Auth Platform branding/audience and create an **OAuth client ID**, type **Web application**. Set its authorized redirect URI to `https://developers.google.com/oauthplayground`.
3. Open [OAuth Playground](https://developers.google.com/oauthplayground). In settings, enable **Use your own OAuth credentials** and enter that client ID and client secret. Use offline access and force consent.
4. Authorize `https://www.googleapis.com/auth/drive` with the Google account that owns or can upload into the folder. This scope allows access to existing folders; the backend only writes into the hardcoded CV folder. Use a dedicated portal account with access to the destination folder if you want to isolate this authorization from your personal files.
5. Exchange the authorization code for tokens. Store the **refresh token**, client ID, and client secret in your Supabase project's **Edge Function Secrets** as:

   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CLIENT_SECRET`
   - `GOOGLE_DRIVE_REFRESH_TOKEN`

   Use project `rbrseemfyiqcdezxhssx` (the project configured in this portal). Never put these values in a `VITE_` variable, source file, or browser code. Do not share tokens in chat.

6. For an external Google OAuth app, address its publishing/verification requirements before production use. Refresh tokens for apps left in **Testing** typically expire after seven days with the Drive scope. See [Google's OAuth documentation](https://developers.google.com/identity/protocols/oauth2/web-server#offline) and [token expiration rules](https://developers.google.com/identity/protocols/oauth2#expiration).
7. Review the folder's sharing permissions: uploaded files inherit its access. Keep CVs restricted to intended reviewers; do not enable public access just to allow uploads.

## Deploy

Deploy `supabase/functions/upload-cv` to the same Supabase project as the app, using the Supabase CLI or dashboard. The function's entry point is `index.ts`, and it also requires `handler.ts`. The default `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables are supplied by Supabase.

With a current Supabase CLI, check `supabase functions deploy --help`, then deploy:

```sh
supabase functions deploy upload-cv --project-ref rbrseemfyiqcdezxhssx
```

The function validates every bearer token against Supabase Auth and rejects unauthenticated/anonymous users. If using a project with asymmetric JWT signing and the legacy gateway rejects valid tokens, deploy with `--no-verify-jwt`; the function still performs its own server-side Auth validation.

The local Vite portal also calls this deployed function. No Google credentials are required in the local browser environment.

## Verify

1. Sign in to the portal and visit `/upload-cv`.
2. Upload a small sample CV, verify the success message, and confirm the file appears in the folder with the correct account email in its description.
3. Try an invalid extension, an empty file, and a file over 5 MB; each should be rejected. Signed-out requests must be rejected.
4. Remove your sample file manually when finished. Uploading a replacement creates a new submission; it does not delete earlier CVs.

Run backend regression tests locally with Node.js 22.18+ using `node --test tests/upload-cv.test.mjs`. These use mocked Google and Auth responses; they do not upload personal data.
