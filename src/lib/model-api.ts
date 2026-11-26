import { MODEL_API_URL, supabase } from "./supabase";

export const modelApiConfigured = () => MODEL_API_URL.length > 0;

export type ModelHealth = {
  status: string;
  ecg_model_loaded: boolean;
  echo_model_loaded: boolean;
  ecg_model_version?: string;
  echo_model_version?: string;
};

export async function getModelHealth(): Promise<ModelHealth | null> {
  if (!modelApiConfigured()) return null;
  const res = await fetch(`${MODEL_API_URL}/health`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Model service responded ${res.status}`);
  return res.json();
}

/**
 * Asks the model service to run inference on an upload the user owns. The service verifies
 * the user's Supabase session, checks ownership, downloads the private file, runs the actual
 * model and writes the result to the assessment itself — the browser never writes predictions.
 */
export async function requestPrediction(kind: "ecg" | "echo", assessmentId: string) {
  if (!modelApiConfigured()) throw new Error("The model service is not configured.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  const res = await fetch(`${MODEL_API_URL}/predict/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ assessment_id: assessmentId }),
    // Free hosts may cold-start; allow time.
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    let detail = `Model service error (${res.status})`;
    try {
      const j = await res.json();
      if (j?.detail) detail = typeof j.detail === "string" ? j.detail : detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}
