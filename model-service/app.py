"""CardioFusion model service — independent FastAPI inference API.

Runs the ACTUAL uploaded artifacts (ecg_model.keras, ecg_scaler.pkl, echo_model.keras).
Flow per request:
  1. Verify the caller's Supabase access token with Supabase Auth.
  2. Load the assessment with the service-role key and check the caller owns it.
  3. Download the private file from Storage, validate it, run the model.
  4. Write the result/status back to the assessment (clients cannot write predictions).
"""
from __future__ import annotations

import io
import math
import os
import threading
from pathlib import Path

import httpx
import joblib
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.environ["SUPABASE_PUBLISHABLE_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "models"))
MODEL_REPO_ID = os.environ.get("MODEL_REPO_ID", "")  # optional private HF model repo
HF_TOKEN = os.environ.get("HF_TOKEN")

ECG_THRESHOLD = float(os.environ.get("ECG_THRESHOLD", "0.5"))
# Verified against the public ECG5000 file (label 1 = normal beat, 0 = abnormal beat).
ECG_LABEL_0 = os.environ.get("ECG_LABEL_0", "Abnormal heartbeat pattern") or None
ECG_LABEL_1 = os.environ.get("ECG_LABEL_1", "Normal heartbeat pattern") or None
ECHO_CLASSES = [
    c.strip()
    for c in os.environ.get(
        "ECHO_CLASSES",
        "angina_disease,hypotension_disease_,cardio_vascular_disease_,coronary_artery_disease",
    ).split(",")
]
# Order verified against the public Kaggle echocardiogram dataset folders.
ECHO_CLASSES_VERIFIED = os.environ.get("ECHO_CLASSES_VERIFIED", "true").lower() == "true"
ECG_VERSION = os.environ.get("ECG_MODEL_VERSION", "ecg_model.keras (keras 3.13.2)")
ECHO_VERSION = os.environ.get("ECHO_MODEL_VERSION", "echo_model.keras (keras 3.13.2)")
BUCKET = "medical-uploads"
MAX_BYTES = 10 * 1024 * 1024

app = FastAPI(title="CardioFusion model service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["authorization", "content-type"],
)

_lock = threading.Lock()
_models: dict = {}


def _artifact(name: str) -> Path:
    local = MODEL_DIR / name
    if local.exists():
        return local
    if MODEL_REPO_ID:
        from huggingface_hub import hf_hub_download

        return Path(hf_hub_download(MODEL_REPO_ID, name, token=HF_TOKEN, local_dir=str(MODEL_DIR)))
    raise FileNotFoundError(f"Model artifact {name} not found in {MODEL_DIR} and MODEL_REPO_ID not set")


def models() -> dict:
    with _lock:
        if not _models:
            import keras

            _models["ecg"] = keras.saving.load_model(_artifact("ecg_model.keras"), compile=False)
            _models["scaler"] = joblib.load(_artifact("ecg_scaler.pkl"))
            _models["echo"] = keras.saving.load_model(_artifact("echo_model.keras"), compile=False)
            assert tuple(_models["ecg"].input_shape) == (None, 140, 1), _models["ecg"].input_shape
            assert tuple(_models["echo"].input_shape) == (None, 224, 224, 3), _models["echo"].input_shape
            assert int(_models["scaler"].n_features_in_) == 140
            assert _models["echo"].output_shape[-1] == len(ECHO_CLASSES)
        return _models


@app.on_event("startup")
def _warm() -> None:
    threading.Thread(target=lambda: _safe(models), daemon=True).start()


def _safe(fn):
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        print("model load failed:", type(e).__name__, e)


SR_HEADERS = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}


def verify_user(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing access token")
    r = httpx.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SUPABASE_PUBLISHABLE_KEY, "authorization": authorization},
        timeout=15,
    )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")
    return r.json()["id"]


def rest(method: str, path: str, **kw):
    r = httpx.request(method, f"{SUPABASE_URL}/rest/v1/{path}", headers={**SR_HEADERS, "content-type": "application/json"}, timeout=20, **kw)
    if r.status_code >= 300:
        raise HTTPException(502, "Database request failed")
    return r.json() if r.content else None


def update_assessment(aid: str, values: dict) -> None:
    rest("PATCH", f"assessments?id=eq.{aid}", json=values, params=None)


def load_owned(aid: str, uid: str, kind: str) -> tuple[dict, dict]:
    rows = rest("GET", f"assessments?id=eq.{aid}&select=*")
    if not rows or rows[0]["user_id"] != uid:
        raise HTTPException(404, "Assessment not found")
    a = rows[0]
    up_id = a["ecg_upload_id"] if kind == "ecg" else a["echo_upload_id"]
    if not up_id:
        raise HTTPException(400, "No file is linked for this model")
    ups = rest("GET", f"medical_uploads?id=eq.{up_id}&select=*")
    if not ups or ups[0]["user_id"] != uid or ups[0]["assessment_id"] != aid:
        raise HTTPException(403, "Upload ownership check failed")
    u = ups[0]
    expected = "ecg_csv" if kind == "ecg" else "echo_image"
    if u["kind"] != expected:
        raise HTTPException(400, "This file type is not analysed by this model")
    if not u["storage_path"].startswith(f"{uid}/{aid}/"):
        raise HTTPException(403, "Invalid storage path")
    return a, u


def download(path: str) -> bytes:
    r = httpx.get(f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}", headers=SR_HEADERS, timeout=30)
    if r.status_code != 200:
        raise HTTPException(502, "Could not read the uploaded file")
    if len(r.content) > MAX_BYTES:
        raise HTTPException(400, "File exceeds 10 MB")
    return r.content


def parse_ecg_csv(data: bytes) -> np.ndarray:
    text = data.decode("utf-8-sig", errors="strict")
    rows = [r.strip() for r in text.splitlines() if r.strip()]
    split = lambda r: [c.strip() for c in r.replace(";", ",").replace("\t", ",").split(",")]

    def num(c: str) -> bool:
        try:
            return c != "" and math.isfinite(float(c))
        except ValueError:
            return False

    if rows and not all(num(c) for c in split(rows[0])):
        rows = rows[1:]
    if len(rows) != 1:
        raise ValueError(f"Expected exactly one ECG recording row; found {len(rows)}")
    cells = split(rows[0])
    if len(cells) != 140:
        raise ValueError(f"Expected exactly 140 values; found {len(cells)}")
    if not all(num(c) for c in cells):
        raise ValueError("All 140 values must be finite numbers")
    return np.asarray([float(c) for c in cells], dtype=np.float32).reshape(1, 140)


class PredictBody(BaseModel):
    assessment_id: str


@app.get("/health")
def health():
    loaded = bool(_models)
    return {
        "status": "ok" if loaded else "loading",
        "ecg_model_loaded": "ecg" in _models,
        "echo_model_loaded": "echo" in _models,
        "ecg_model_version": ECG_VERSION,
        "echo_model_version": ECHO_VERSION,
    }


@app.post("/predict/ecg")
def predict_ecg(body: PredictBody, authorization: str | None = Header(default=None)):
    uid = verify_user(authorization)
    a, u = load_owned(body.assessment_id, uid, "ecg")
    update_assessment(a["id"], {"ecg_status": "processing", "ecg_error": None})
    try:
        x = parse_ecg_csv(download(u["storage_path"]))
        m = models()
        xs = m["scaler"].transform(x).reshape(1, 140, 1)  # original fitted scaler, never refit
        out = float(m["ecg"].predict(xs, verbose=0)[0][0])
        idx = int(out >= ECG_THRESHOLD)
        label = (ECG_LABEL_1 if idx == 1 else ECG_LABEL_0) if (ECG_LABEL_0 and ECG_LABEL_1) else None
        result = {
            "output": out,
            "predicted_index": idx,
            "label": label,
            "label_mapping_verified": bool(ECG_LABEL_0 and ECG_LABEL_1),
            "threshold": ECG_THRESHOLD,
        }
        update_assessment(a["id"], {"ecg_status": "completed", "ecg_result": result, "ecg_model_version": ECG_VERSION})
        rest("PATCH", f"medical_uploads?id=eq.{u['id']}", json={"processing_status": "processed"})
        return result
    except ValueError as e:
        update_assessment(a["id"], {"ecg_status": "failed", "ecg_error": str(e)[:300]})
        rest("PATCH", f"medical_uploads?id=eq.{u['id']}", json={"processing_status": "failed"})
        raise HTTPException(422, str(e))
    except HTTPException:
        update_assessment(a["id"], {"ecg_status": "failed", "ecg_error": "Processing error"})
        raise
    except Exception as e:  # noqa: BLE001
        print("ecg error:", type(e).__name__)
        update_assessment(a["id"], {"ecg_status": "unavailable", "ecg_error": "Model unavailable"})
        raise HTTPException(503, "ECG model unavailable")


@app.post("/predict/echo")
def predict_echo(body: PredictBody, authorization: str | None = Header(default=None)):
    uid = verify_user(authorization)
    a, u = load_owned(body.assessment_id, uid, "echo")
    update_assessment(a["id"], {"echo_status": "processing", "echo_error": None})
    try:
        raw = download(u["storage_path"])
        try:
            img = Image.open(io.BytesIO(raw))
            if img.format not in ("JPEG", "PNG"):
                raise ValueError("Only JPG and PNG images are supported")
            img = img.convert("RGB").resize((224, 224))
        except ValueError:
            raise
        except Exception:
            raise ValueError("The file is not a readable image")
        x = (np.asarray(img, dtype=np.float32) / 255.0).reshape(1, 224, 224, 3)
        probs = models()["echo"].predict(x, verbose=0)[0].astype(float).tolist()
        idx = int(np.argmax(probs))
        result = {
            "probabilities": [{"label": ECHO_CLASSES[i], "probability": p} for i, p in enumerate(probs)],
            "predicted_index": idx,
            "predicted_label": ECHO_CLASSES[idx],
            "label_mapping_verified": ECHO_CLASSES_VERIFIED,
        }
        update_assessment(a["id"], {"echo_status": "completed", "echo_result": result, "echo_model_version": ECHO_VERSION})
        rest("PATCH", f"medical_uploads?id=eq.{u['id']}", json={"processing_status": "processed"})
        return result
    except ValueError as e:
        update_assessment(a["id"], {"echo_status": "failed", "echo_error": str(e)[:300]})
        rest("PATCH", f"medical_uploads?id=eq.{u['id']}", json={"processing_status": "failed"})
        raise HTTPException(422, str(e))
    except HTTPException:
        update_assessment(a["id"], {"echo_status": "failed", "echo_error": "Processing error"})
        raise
    except Exception as e:  # noqa: BLE001
        print("echo error:", type(e).__name__)
        update_assessment(a["id"], {"echo_status": "unavailable", "echo_error": "Model unavailable"})
        raise HTTPException(503, "ECHO model unavailable")
