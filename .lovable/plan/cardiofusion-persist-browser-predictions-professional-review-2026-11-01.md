# CardioFusion: persist browser predictions, professional review, consistent reports

## Root cause of the reported bugs

- Browser ECG/ECHO predictions are stored only in an in-memory, owner-only session map (`src/lib/assessment-session.ts`). The database keeps `pending`/`not_provided`, so the professional dashboard shows "Awaiting Results" and a professional's PDF lacks the predictions the patient saw.
- There is no professional-review storage at all, so Part 7/8 features cannot exist yet.
- Trusted result columns (`ecg_result`, `echo_result`, statuses beyond `pending`) are deliberately locked to the model service by column grants + the `assessments_guard` trigger. This stays untouched.

## Database changes (one new migration, applied via the Supabase migration tool)

1. **`browser_predictions`** — explicitly untrusted, browser-produced results:
   - `id`, `assessment_id` (FK), `upload_id` (FK), `user_id` (FK), `kind` (`ecg`|`echo`), `status` (`completed`|`failed`), `result` jsonb, `error` text, `model_version` text default `'browser-tfjs'`, timestamps.
   - Unique `(assessment_id, kind)` — re-running a prediction updates the row; a trigger rejects rows whose upload does not belong to the same assessment/owner with the right kind, and rejects result payloads that fail shape/range validation (ECG: finite number in [0,1]; ECHO: 4 finite probabilities in [0,1]).
   - Grants + RLS: owner INSERT/UPDATE/SELECT own rows only; professional SELECT via existing `has_patient_access`; no DELETE except owner; `service_role` ALL. No anon access.
2. **`professional_reviews`** — structured professional assessment:
   - `id`, `assessment_id` (FK), `professional_id` (FK, defaults to `auth.uid()` via trigger), fields: `ecg_interpretation`, `echo_interpretation`, `overall_assessment`, `clinical_observations`, `further_investigations`, `follow_up`, `recommendations`, `notes` (all text), `status` (`draft`|`completed`), `completed_at`, timestamps.
   - Unique `(assessment_id, professional_id)`.
   - Grants + RLS: INSERT/UPDATE only by the authoring professional who has `has_patient_access` on the assessment owner and holds the `medical_professional` role; SELECT by the patient owner and authorized professionals; no DELETE. `completed_at` set automatically when status becomes `completed`.
3. No changes to existing tables, the guard trigger, trusted result columns, storage policies, or auth settings.

## Frontend changes

4. **Persist predictions**: `src/components/results.tsx` Predict saves the browser result (or failure) to `browser_predictions` in addition to the session store; new `src/lib/browser-predictions.ts` handles fetch/save and query invalidation.
5. **Shared resolver**: extend the findings resolution so trusted model-service results > persisted browser predictions > session findings, with the same upload-matching checks. Patient Results, professional pages, and PDF all use it, with provenance labels ("Browser-based analysis" vs trusted service).
6. **Professional dashboard**: patient-record and assessment pages read `browser_predictions`, so completed predictions show real statuses instead of "Awaiting Results". Opening an assessment never creates or overwrites anything.
7. **Professional review UI**: structured editor on the assessment page (visible only to authorized professionals) with the Part 7 fields, draft/completed status, save/update. AI results stay read-only and preserved.
8. **PDF**: `ReportData` gains browser predictions (when no trusted result exists) and the completed professional review. Two report states: "AI Assessment Report" (automated only) and "Reviewed Assessment Report" (adds the professional section with reviewer name and date). A review appears only after it is actually completed. Failed analyses are reported as failed, never as completed.
9. **Consistent reference**: one `assessmentReference(id)` helper (`CF-XXXXXXXX`) used by patient pages, professional pages, and PDF; patient details (DOB, symptoms, history) come from the same profile/health/symptom records everywhere.
10. **Show/hide password**: eye toggle (lucide `Eye`/`EyeOff`) inside password inputs on login and signup (incl. confirm field), `type` toggles password/text, value preserved, accessible "Show password"/"Hide password" labels, hidden by default. No auth-logic changes.

## What stays as-is (per your constraints)

- ECG/ECHO class mappings remain unverified → outputs shown as "Unclassified output A–D" / raw score with explanation; no invented disease names, no risk percentages, no combined score.
- No generative/AI explanation service added; predefined explanations only.
- No deployment, no Lovable Cloud, no service-role keys in the repo, RLS not weakened.

## Verification

- Unit tests: browser-prediction validation, resolver precedence, review visibility rules, PDF content (predictions + review states).
- Disposable-Postgres RLS tests: owner write/read, professional read-with-grant vs denied-without, review author-only update, payload validation rejections.
- Playwright: synthetic login-gated flows where possible, password toggles on both auth pages, Results rendering with persisted predictions.
- Real-account end-to-end (signup → upload → predict → professional review → reviewed PDF) remains unverifiable from here due to external unmanaged Supabase auth; you will need to run it once on the preview/deployed site.
