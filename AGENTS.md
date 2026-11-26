<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- Backend is the owner's own Supabase project (not Lovable Cloud); the browser uses `src/lib/supabase.ts` with publishable values only — keeps the repo deployable anywhere with no server secrets.
- Apply schema and policy changes through the connected Supabase migration tool; its version-controlled `supabase/migrations/` files are canonical. The legacy `database/migrations/` script is archival and must not be rerun — avoids duplicate tables and keeps applied SQL tracked.
- Model predictions are written only by `model-service/` (service role); clients have column-level grants and a guard trigger that block writing results — prevents fabricated predictions.
- Without `VITE_MODEL_API_URL`, inference runs lazily in the browser using converted original TF.js GraphModels, fitted scaler and Pillow-compatible RGB resize. Browser results persist to the separate untrusted `browser_predictions` table (owner-written, payload-validated, grant-gated professional reads) and are overlaid by `assessment-session`'s resolver with precedence trusted service result > persisted browser prediction > owner-only session finding; they are never written to trusted database fields and are labelled "Browser-based analysis" in UI and PDF — keeps patient, professional and report views synchronized without weakening security. Setting the API URL preserves the independent trusted Python service path; saved trusted results take precedence.
- Professional reviews live in `professional_reviews` (one per assessment+professional, draft/completed, reviewer name snapshotted because patients cannot read professional profiles); only the authoring professional with a current patient grant can write, patients and authorized professionals read, and the PDF shows "Reviewed Assessment Report" only when a completed review exists — separates AI output from professional conclusions.
- Authenticated pages live under the `_app` layout with `ssr: false` because the session is stored in browser storage.
- Signup assigns only patient or professional roles through the database trigger; professional dashboards need no approval, but all patient reads require an active professional role plus explicit patient grants, and admin assignment remains trusted-only — separates demonstration registration from patient-data authorization.
- Database fusion status stays `not_connected`; `assessment-findings` supplies shared patient/symptom formatting, verified-only finding interpretation, combined status and symptom-based guidance to Results and PDF, completed only with both successful results and never a risk score — keeps patient reports synchronized without altering inference or security.
- Never commit original model artifacts or `.env` files. Converted float32 browser shards live in `public/models/` and graph manifests use root-relative paths — avoids Lovable-only asset serving on external Vercel deployments; browser weights are necessarily downloadable. Lovable Assets pointers retain copies but are not runtime dependencies.

- Model class meanings live only in `src/lib/model-labels.ts` (ECG5000 normal/abnormal beat; four Kaggle echocardiogram categories, verified empirically against the public datasets) and are applied at presentation time from the stored class index, so older stored results are reinterpreted without rewriting them. `prediction-summary` builds ECG/ECHO cards, the Overall Cardiac Assessment and an educational disease-risk summary shared by Results and PDF; raw scores appear only in a professionals-only technical section, never as a risk score or averaged probability — keeps patient views readable and honest.