# English 6 Units 1–3 — Supabase-connected starter

## Files
- `index.html`: quiz page updated to submit to `/api/submit`.
- `api/submit.js`: Vercel serverless endpoint. It calculates objective scores server-side and saves the attempt and answer rows.
- `api/answer-key.json`: answer key used by the server. Do not expose it separately to students; the existing front-end question file also contains answer keys, so this is a practice quiz rather than a secure high-stakes exam.
- `package.json`: installs `@supabase/supabase-js` for the API function.

## Before deploying
1. The Supabase tables `quiz_attempts` and `quiz_answers` must already exist (you ran `supabase_schema.sql`).
2. Upload these files to the root of the existing GitHub repository. Replace the old HTML with this `index.html`; add the `api` folder and `package.json`.
3. In Vercel, open Project → Settings → Environment Variables. Add:
   - `SUPABASE_URL` = Project URL from Supabase → Project Settings → API (or Data API, depending on UI).
   - `SUPABASE_SERVICE_ROLE_KEY` = secret service-role key from Supabase → Project Settings → API Keys. If the project uses the newer key interface, use the secret `service_role` key, not the publishable/anon key.
4. Apply the variables to Production (and Preview if testing), then redeploy the latest deployment.
5. Test one sample submission, then check `quiz_attempts` and `quiz_answers` in Supabase Table Editor.

## Security
- NEVER put `SUPABASE_SERVICE_ROLE_KEY` in `index.html`, GitHub, or any client-side code. It belongs only in Vercel Environment Variables.
- The endpoint has no public read route, and RLS stays enabled. Only the server endpoint writes with the service-role key.
- Because the submission endpoint is publicly reachable, add stronger anti-abuse protection and teacher authentication before using this for a high-stakes assessment. Do not expose a public teacher results page.
- The browser's results dashboard and CSV buttons remain local-device only. View class-wide results in the Supabase dashboard for now; teacher-only export/dashboard can be added next.
- This first integration stores names and class identifiers, so inform students/parents how results will be used and limit access to the teacher.
