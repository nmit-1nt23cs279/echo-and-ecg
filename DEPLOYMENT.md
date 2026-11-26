# CardioFusion — manual deployment guide

The connected Supabase backend was initialized on 22 October 2026. **Browser ECG and ECHO inference is now integrated; no Python deployment is required for the college demonstration.** Nothing has been deployed for you; follow the Vercel steps yourself.

```text
Browser (Vercel) ──► Supabase (auth, Postgres + RLS, private storage)
       │
       └──► Original converted TensorFlow.js models (local demonstration results)
```

The web app holds **no server secrets**. Browser results are genuine model outputs held in session memory, not trusted Supabase findings. Results and PDFs reuse the same current-session predictions for the correct owner, assessment and uploaded inputs. Keep `VITE_MODEL_API_URL` unset for browser inference.

## Browser model status and demonstration limitations

- Original Keras 3.13.2 models were loaded without training configuration and exported through TensorFlow CPU 2.20.0 to float32 TensorFlow.js 4.22 GraphModels. No retraining or quantization.
- `public/models/ecg/` contains 566,564 weight bytes; `public/models/echo/` contains 44,676,144 weight bytes. Graphs and the original fitted 140-feature scaler are in `src/assets/models/`. These converted shards must be included in GitHub (each is at most 4 MB). Original `.keras`/`.pkl` files stay excluded.
- Shards are served from root-relative `/models/` URLs, not Lovable preview/CDN paths. Lovable Assets pointer copies are not used at runtime. No model API URL, Python service, Hugging Face token or service-role key is needed.
- ECG reproduces float32 StandardScaler operations, original feature order, `[1,140,1]`, sigmoid output and `>= 0.5` class decision. ECHO uses RGB, Pillow **11.1.0**-compatible bicubic resize to 224×224, float32 `/255`, `[1,224,224,3]`, and original output order.
- Validation in Chromium: three synthetic ECG equivalence inputs had exact scaler matches and maximum absolute output difference **2.61e-8**; six synthetic PNG/JPEG cases (224×224, 320×180, 137×251) had exact resized pixels and maximum output difference **5.07e-7**. These are numerical equivalence checks, **not clinical validation**. Patient recordings/images and other browsers remain untested; JPEG decoder differences may occur on other browsers.
- Class meanings were not included with the trained files: patient predictions are labeled unclassified outputs, not invented disease names. ECG values and threshold appear under optional technical details; ECHO probabilities preserve the original Softmax output order. Combined summaries are not fusion predictions, diagnoses or combined risk scores.
- On the results screen, **Predict** downloads the owner's existing private upload through the authenticated Supabase client and performs local inference. No prediction or processing-status database writes occur. Results persist while navigating within the app and are included in Preview/Download PDF on this device. Refreshing, closing the app or signing out clears them; changed inputs cannot reuse old findings. Professional accounts and later sessions can retrieve only trusted saved findings. Mark Assessment Complete preserves the existing workflow status, not browser prediction persistence.
- Use the demonstration laptop with current Chrome/Chromium. First ECHO prediction downloads about 45 MB, consumes device memory and may briefly block the page while computing. Weights are publicly downloadable; browser results are not tamper-proof.
- Application tests passed, and real browser inference was compared with the originals. A real-account login → upload → prediction flow and administrator access **remain unverified** because this external Supabase connection has no managed test session. Do not call the project fully demonstrated until you complete the checklist below.

---

## 1. Supabase (free tier)

1. The existing connected project is `dtskgccxtvilrlzrdtfg`; no Lovable Cloud or second backend is required.
2. Two migrations in `supabase/migrations/` have already succeeded: the application schema/storage policies and private privileged-function wrappers. **Do not rerun** `database/migrations/001_cardiofusion_init.sql` or the applied migrations against this initialized project. The legacy script is archival. Future changes use new migrations through the connected migration tool.
   Confirmed tables: `profiles`, `user_roles`, `professional_requests`, `health_profiles`, `symptom_reports`, `assessments`, `medical_uploads`, and `patient_access_grants` (required by the existing professional authorization screens). All have RLS enabled. The private `medical-uploads` bucket was created through the Storage API with a 10 MB per-file limit.
3. **Authentication → Sign In / Providers**: keep **Email** enabled; disable every other provider.
   Keep "Confirm email" on. The hosted public settings confirmed Email enabled, Google and all other social providers disabled, signup enabled, and email confirmation required. No provider settings were changed.
4. **Authentication → URL Configuration**:
   - Site URL: `https://<your-app>.vercel.app`
   - Redirect URLs: `https://<your-app>.vercel.app/**` (add `http://localhost:8080/**` for local dev)
5. Sign up in the deployed app, confirm your email, then run `database/bootstrap_admin.sql` with
   your own User UID (Authentication → Users) to become admin.

### Remaining backend configuration

- The owner's account was registered after initialization; its administrator assignment remains unconfirmed. Never assign an admin automatically from signup metadata; use the existing bootstrap procedure only for the owner's confirmed account through trusted SQL Editor access.
- Set the final **Site URL** and allowed confirmation/password-reset URLs in your Supabase dashboard after choosing your host. These settings and SMTP configuration were not available through the connected tools and remain unverified.
- Two pre-existing security-advisor warnings concern the platform's `rls_auto_enable` event-trigger function. The new application migrations introduced no remaining warnings. The nine privileged application helpers are in the non-exposed `cardiofusion_private` schema, reached by caller-scoped public wrappers with explicit permission checks.
- Authenticated end-to-end tests against this external Supabase project require your app-owned login; no managed preview session is available. Local SQL permission tests do not establish hosted email delivery or real-user end-to-end behavior.

Free-tier notes: 500 MB database, 1 GB storage, 50k monthly active users. Free projects **pause
after ~7 days without activity** (restore from the dashboard). Built-in email sending is heavily
rate-limited (a few emails per hour); add your own SMTP under Authentication → Emails for real use.

## 2. Optional trusted Python inference only (not needed for browser demonstration)

Skip sections 2 and 3 for the ₹0 browser demonstration. The existing independent Python code is preserved only as an optional future trusted-results path. Do not add its privileged keys to the web app.

### Model artifacts (private Hugging Face model repo)

1. Create a free account at huggingface.co.
2. **New → Model**, name `cardiofusion-artifacts`, visibility **Private**.
3. **Files → Add file → Upload files**: `ecg_model.keras`, `ecg_scaler.pkl`, `echo_model.keras`
   (the 134 MB echo model uploads fine through the web UI).
4. **Settings → Access Tokens** → create a **Read** token (used below as `HF_TOKEN`).

Do **not** commit the model files to GitHub — `.gitignore` already blocks `*.keras` and `*.pkl`.

## 3. Model service (Hugging Face Docker Space, free CPU)

1. **New → Space**, SDK **Docker**, hardware **CPU basic (free)**, visibility **Public**
   (code is public; models stay in the private repo).
2. Upload the four files from `model-service/` (`app.py`, `requirements.txt`, `Dockerfile`, `README.md`).
3. Space **Settings → Variables and secrets**:

| Name | Type | Value |
|---|---|---|
| `SUPABASE_URL` | Variable | `https://<ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Variable | your publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Supabase → Settings → API Keys → service_role / secret key |
| `ALLOWED_ORIGINS` | Variable | `https://<your-app>.vercel.app` |
| `MODEL_REPO_ID` | Variable | `<hf-user>/cardiofusion-artifacts` |
| `HF_TOKEN` | **Secret** | the read token |
| `ECG_LABEL_0`, `ECG_LABEL_1` | Variable | only once confirmed from your notebook |
| `ECHO_CLASSES_VERIFIED` | Variable | `true` only once class order is confirmed |

4. Wait for the build, then open `https://<hf-user>-<space-name>.hf.space/health`. It should show
   `"status":"ok"` after the models load (first start takes a few minutes).

Free-tier notes: 2 vCPU / 16 GB RAM. The Space **sleeps after 48 h without traffic**; the first
request after sleep can take 1–3 minutes while it wakes up and loads TensorFlow. No GPU.

## 4. GitHub

1. In Lovable, connect GitHub (Project settings → Git) to create your repository — or download the
   code and push it yourself.
2. Confirm no `.env`, original `.keras`/`.pkl` files, or privileged keys are in the repository. Include the converted `public/models/**/*.bin` shards and `src/assets/models/` graph/scaler files; they are required browser inference assets.

## 5. Vercel (Hobby, free, non-commercial use)

1. vercel.com → **Add New → Project** → import the existing GitHub repo on **Hobby** (personal, non-commercial). Use the repository root, a single web app, and do not accept a multi-service Python setup. Do not select a Pro trial or add a payment card; stop if your account is required to provide one. No Vercel account or billing setup has been performed here.
2. Framework preset: **Other**. `vercel.json` already sets:
   - Install command: `bun install`
   - Build command: `bun run build`
   - Output: produced automatically by Nitro's Vercel preset (`.vercel/output`) — leave Output
     Directory empty.
3. **Environment Variables** (Production and Preview):

| Name | Value |
|---|---|
| `NITRO_PRESET` | `vercel` |
| `VITE_SUPABASE_URL` | `https://dtskgccxtvilrlzrdtfg.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your publishable key |
| `VITE_MODEL_API_URL` | **Do not set** for local browser inference; remove any old placeholder |

4. **Deploy**. Routing is handled by the server output, so deep links and refreshes work without
   rewrite rules. `VITE_*` values are baked in at build time — redeploy after changing them.
5. Put the final Vercel URL into Supabase URL Configuration (step 1.4). Do not change database schema, RLS, providers, storage policies, or admin roles for deployment.
6. Check a `/models/ecg/group1-shard1of1.bin` request returns binary bytes, not an HTML page, then run the demonstration checklist. Output Directory override stays disabled; do not enter `dist` or add a catch-all rewrite. Publishing the web app includes the browser models; it does not deploy `model-service/`.

Free limits still apply: roughly 45 MB of initial model downloads per new visitor use hosting bandwidth; CPU/memory depend on the visitor's device. Supabase storage, database and email limits remain unchanged. This task did not purchase anything or verify account-specific hosting quotas.

## 6. Smoke test

1. Sign up as a patient, confirm email, sign in.
2. New assessment → fill details → upload a 140-value ECG CSV and a JPG/PNG echo image.
3. Results step → **Predict** on each. Confirm ECG sigmoid/index, all four ECHO probabilities and the completed Combined Assessment; test one invalid ECG CSV (139 values) is rejected.
4. Mark complete and navigate to Results: confirm identical predictions. Preview and download PDF: verify matching findings, filenames and combined summary. Replace an input: its old result must disappear. Refresh: session outputs disappear and can be recomputed. PDFs disclose session-only findings; no permanent prediction storage is claimed.
5. Confirm your existing owner admin account can open Admin. Do not change permissions just to complete a test.

## Professional registration (college demonstration)

- The 28 October 2026 migration removes administrator approval for **new** professional registrations. The signup trigger assigns only `patient` or `medical_professional`; it cannot assign `admin` from metadata.
- Login opens the professional dashboard. Patients still explicitly grant/revoke access; an active professional role and a matching patient grant are both required by existing RLS and private-storage checks.
- `professional_requests` retains optional qualifications and history, but its review status no longer controls access. Its own-details update policy retains column restrictions on status/reviewer fields. Old admin review/revoke functions remain protected and are not exposed as dashboard approval controls.
- The proposed role backfill for three previously observed pending accounts was declined and **was not applied**. A later read found no professional accounts; no account removals were performed by this task. Any legacy account without a professional role can open the workspace but cannot read patient-authorized records without a separately authorized role assignment. Do not create duplicate accounts to work around this.
- No provider, email-confirmation, SMTP, Site URL or redirect settings were changed. No manual Supabase setup is required for new professional role assignment. Existing account roles remain a separate unresolved permission decision.
- Verify a new professional signup, email confirmation, login → professional dashboard, then patient grant → records → revoke. Hosted signed-in verification is unavailable in this external unmanaged Supabase environment.
- Migration advisor reported three pre-existing warnings: public and signed-in execution of a SECURITY DEFINER function, and disabled leaked-password protection. No new warnings were introduced; review these separately.

## Feature status

### Prediction and disease-risk presentation

- `src/lib/prediction-summary.ts` and `src/components/prediction-summary.tsx` supply shared ECG/ECHO prediction explanations, original ECHO probabilities, a Combined AI Summary and a separate Disease Risk Assessment. Results and `src/lib/pdf.ts` consume the same current-assessment data; session inference errors also remain scoped to the assessment/upload.
- Graph inspection confirmed ECHO ends in a `Softmax` node and ECG in a fused sigmoid output. This supports the displayed numerical outputs, **not disease-class names**. No verified training class mapping is present, so outputs remain unclassified A–D and no disease labels are invented. ECG raw values are technical details, not medical confidence.
- No generative AI service was added or claimed. Explanations use predefined, data-dependent wording. No validated disease-risk method is configured; no disease percentage, tier or diagnosis is calculated. Actual age, symptoms/history, verified supporting findings and missing information are summarized for professional review.
- Synthetic browser inference, desktop/mobile rendering and a two-page PDF were checked with the actual numerical outputs. Tests cover missing/failed findings, scoping, no risk classification and emergency symptoms. Real-account login, signup/email confirmation, uploads and PDF-action end-to-end checks remain unverified here.

| Feature | Status |
|---|---|
| Auth, profiles, roles, RLS, private storage | Applied and schema/storage confirmed; owner signup, admin bootstrap, and final auth URLs remain |
| Assessment workflow, history, PDF reports | Implemented |
| Professional registration and patient-granted access | Implemented |
| ECG / ECHO inference | Original models converted and integrated in browser; numerical comparisons passed; real-account upload/prediction flow remains to be checked |
| ECG class meaning / ECHO class order | **Not verified** — no training code supplied; shown as output class numbers |
| Combined Assessment | Consolidated actual findings; completed only when both models succeed; not a trained fusion model or combined score |
