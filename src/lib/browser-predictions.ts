import { supabase } from "./supabase";
import type { Assessment, BrowserPrediction, EcgResult, EchoResult, MedicalUpload, ModelStatus } from "./types";

// Browser-run predictions are explicitly untrusted: they are stored separately from the
// trusted model-service result columns and labelled as browser-based wherever shown.

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function getBrowserPredictions(assessmentId: string) {
  return unwrap<BrowserPrediction[]>(
    await supabase.from("browser_predictions").select("*").eq("assessment_id", assessmentId),
  );
}

export async function listBrowserPredictions(assessmentIds: string[]) {
  if (!assessmentIds.length) return [] as BrowserPrediction[];
  return unwrap<BrowserPrediction[]>(
    await supabase.from("browser_predictions").select("*").in("assessment_id", assessmentIds),
  );
}

export async function saveBrowserPrediction(input: {
  assessment: Assessment;
  upload: MedicalUpload;
  kind: "ecg" | "echo";
  result?: EcgResult | EchoResult;
  error?: string;
}) {
  const { assessment, upload, kind } = input;
  if (upload.assessment_id !== assessment.id || upload.user_id !== assessment.user_id)
    throw new Error("Upload does not belong to this assessment.");
  const row = input.error
    ? { status: "failed" as const, error: input.error.slice(0, 500), result: null }
    : { status: "completed" as const, error: null, result: input.result ?? null };
  return unwrap<BrowserPrediction>(
    await supabase
      .from("browser_predictions")
      .upsert(
        {
          assessment_id: assessment.id,
          upload_id: upload.id,
          user_id: assessment.user_id,
          kind,
          model_version: "browser-tfjs",
          ...row,
        },
        { onConflict: "assessment_id,kind" },
      )
      .select("*")
      .single(),
  );
}

// The status a viewer should see: trusted service result first, then a persisted
// browser prediction for the current upload, then the raw database status.
export function effectiveStatus(assessment: Assessment, kind: "ecg" | "echo", predictions: BrowserPrediction[]): ModelStatus {
  const trusted = kind === "ecg" ? assessment.ecg_status : assessment.echo_status;
  if (trusted === "completed" || trusted === "processing") return trusted;
  const uploadId = kind === "ecg" ? assessment.ecg_upload_id : assessment.echo_upload_id;
  const persisted = predictions.find(
    (p) => p.assessment_id === assessment.id && p.kind === kind && p.upload_id === uploadId,
  );
  return persisted?.status ?? trusted;
}
