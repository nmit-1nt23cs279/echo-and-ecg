---
title: CardioFusion Model Service
sdk: docker
app_port: 7860
---

# CardioFusion model service

Independent FastAPI service that runs the real `ecg_model.keras`, `ecg_scaler.pkl` and
`echo_model.keras`. Deployed to a free Hugging Face Docker Space; see `../DEPLOYMENT.md`.

Endpoints:
- `GET /health`
- `POST /predict/ecg` and `POST /predict/echo` — body `{"assessment_id": "<uuid>"}`, header
  `Authorization: Bearer <user's Supabase access token>`.

Verified artifact facts (inspected from the uploaded files):
- ECG: input `(None, 140, 1)`, single sigmoid output, binary cross-entropy. Scaler: sklearn
  `StandardScaler`, 140 features, saved with scikit-learn 1.6.1 (joblib).
- ECHO: input `(None, 224, 224, 3)`, no internal rescaling layer (so `/255` is applied here),
  4-way softmax, sparse categorical cross-entropy.
- Saved with Keras 3.13.2.

Not verifiable from the files (no training code was supplied):
- What ECG class 0 / 1 mean → set `ECG_LABEL_0` and `ECG_LABEL_1` once confirmed.
- ECHO class order → the default comes from the specification; set `ECHO_CLASSES_VERIFIED=true`
  only after confirming it against the notebook (e.g. `train_generator.class_indices`).
- ECG column order → must match training; the service never reorders values.
