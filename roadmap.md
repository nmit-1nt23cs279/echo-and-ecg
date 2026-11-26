# CardioFusion roadmap

- [x] Verify model class meanings: ECG matches ECG5000 normal/abnormal (99.6% on 4,998 public beats); ECHO order matches Kaggle echocardiogram folders (219/240 sample images)
- [x] Replace raw/unclassified outputs with ECG/ECHO assessment cards, Overall Cardiac Assessment and educational disease-risk summary; PDF restructured; technical info for professionals only
- [x] Separate treatment and medication fields in professional review (migration applied)
- [ ] Verify with a real account on the preview: predict → professional view → review → reviewed PDF — blocked by externally managed sign-in

- [x] Persist browser predictions to the new untrusted `browser_predictions` table so patient Results, professional dashboard and PDFs share the same findings (fixes "Awaiting analysis" mismatch)
- [x] Add structured `professional_reviews` (draft/completed, author-only writes, patient+granted-professional reads) with editor on the assessment page and a "Reviewed Assessment Report" PDF state
- [x] Add show/hide password toggles on sign-in and sign-up (verified in browser: type toggles, value preserved, accessible labels)
- [x] Verify: 88 tests pass (26 new resolver/status unit tests, 5 new disposable-PostgreSQL permission tests); build OK
- [ ] Verify real-account flow: patient predict → professional sees results → saves review → reviewed PDF — blocked by external unmanaged authentication; owner must run it on the preview/deployed site


- [x] Add actual AI-Based Predictions and Combined AI Summary to Results/PDF using current session outputs, with optional technical detail
- [x] Add separate Disease Risk Assessment with actual factors/missing information, no invented classification; predefined explanations without external AI
- [x] Test synthetic prediction/PDF synchronization, missing/failed states and emergency guidance: 44 focused tests plus genuine-browser synthetic inputs and two-page PDF checks

- [x] Remove professional registration approval gating, retain patient authorization and secure admin assignment; migration succeeded; existing-account role backfill declined and not applied
- [x] Verify signup role assignment and patient-record isolation: 13 disposable-PostgreSQL tests passed; registration fields/role selection and signed-out route checked; changes documented
- [ ] Verify new professional signup/email confirmation/login → dashboard and real patient grant/report flow — blocked by external unmanaged authentication; no hosted session available

- [x] Simplify Results and PDF using shared patient/symptom findings, unestablished cardiac risk and safe next steps; inference and Supabase unchanged
- [x] Verify 35 focused tests, genuine synthetic-file browser predictions, actual Results desktop/mobile layout and two-page complete/partial PDF contents and margins
- [ ] Verify requested create → forms → uploads → Predict → Results → PDF preview/download → complete flow with a real account — blocked by external unmanaged Supabase; no authenticated test session available

- [x] Share current-session predictions across assessment pages and PDF actions, scoped to owner, assessment and input
- [x] Replace disconnected-fusion copy with dynamic CardioFusion Combined Assessment and clean individual findings
- [x] Verify synchronization, incomplete states, stale-input isolation and PDF contents/layout: 28 focused/equivalence tests passed; genuine synthetic-input browser outputs matched two-page PDFs; desktop/mobile component layouts checked
- [ ] Verify real-account uploads → Predict → navigation → Preview/Download PDF — blocked by external unmanaged authentication; no authenticated end-to-end claim

- [x] Owner authorized minimum conversion, integration, and Vercel preparation; no incomplete frontend deployment
- [x] Convert original ECG/ECHO models and scaler to portable browser inference assets
- [x] Compare browser preprocessing and predictions with original models: 3 ECG and 6 PNG/JPEG numerical fixtures pass; not clinical validation
- [x] Connect genuine local predictions using existing ECG CSV/ECHO uploads; Supabase protections unchanged; isolated control check made no database writes
- [x] Evaluate Vercel/Netlify deployment settings and browser-inference implications — Vercel simplest; no application changes or deployment performed
- [x] Vercel Hobby deployment preparation documented; no deployment performed
- [ ] Real-account login/upload/prediction demonstration — blocked by external unmanaged authentication; owner must run DEPLOYMENT.md checklist

- [x] Apply and confirm existing Supabase schema, secure access rules, and private medical storage
- [x] Verify email/password-only configuration and document any remaining setup
- [x] Test backend access rules locally and preserve existing application flows (19 tests passed)
- [ ] Confirm owner admin bootstrap — owner signup exists, admin assignment not verified
- [ ] Final auth Site URL/redirect allowlist and SMTP verification — blocked by hosting URL and dashboard-only settings
- [ ] Authenticated hosted assessment/upload/PDF verification — blocked by external unmanaged authentication; no test session available
- [x] Live browser inference verification — genuine converted models verified; optional Python service no longer needed for local demonstration

- [x] Core app: auth, profile, symptoms, assessments workflow, results, reports, professional, admin
- [x] Python model service (Hugging Face Space) using the uploaded models
- [x] Deployment docs, .env.example, vercel.json, .gitignore
- [x] Enterprise UI brief: new landing (hero copy, visualization, sections, sample report), 5-step workflow, neutral status styling, no academic wording in marketing UI, dashboard profile-completion + recent reports
- [x] Replace browser tab icon with CardioFusion heart-rhythm icon
