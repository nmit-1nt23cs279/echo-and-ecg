import { useSyncExternalStore } from "react";
import type { Assessment, BrowserPrediction, MedicalUpload, EcgResult, EchoResult } from "./types";

type SessionFinding = {
  userId: string;
  assessmentId: string;
  uploadId: string;
} & ({ kind: "ecg"; result: EcgResult; error?: never } | { kind: "echo"; result: EchoResult; error?: never } | { kind: "ecg" | "echo"; error: string; result?: never });

// Memory only: never serialize medical findings or write them to trusted database columns.
let findings = new Map<string, SessionFinding>();
const listeners = new Set<() => void>();
const key = (userId: string, assessmentId: string, kind: "ecg" | "echo") => JSON.stringify([userId, assessmentId, kind]);
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => findings;
const emptySnapshot = new Map<string, SessionFinding>();

export function saveSessionFinding(finding: SessionFinding) {
  findings = new Map(findings).set(key(finding.userId, finding.assessmentId, finding.kind), finding);
  listeners.forEach((listener) => listener());
}

export function clearSessionFindings() {
  findings = new Map();
  listeners.forEach((listener) => listener());
}

export type ResolvedFindings = {
  assessment: Assessment;
  includesSessionResults: boolean;
  // Which modalities come from untrusted browser-run analysis (persisted or session).
  browserSources: { ecg: boolean; echo: boolean };
};

// Precedence per modality: trusted model-service result > persisted browser prediction
// (any authorised viewer) > owner's in-memory session finding.
export function resolveAssessmentFindings(
  assessment: Assessment,
  uploads: MedicalUpload[],
  viewerId: string | undefined,
  persisted: BrowserPrediction[] = [],
): ResolvedFindings {
  let resolved = assessment;
  let includesSessionResults = false;
  const browserSources = { ecg: false, echo: false };
  for (const kind of ["ecg", "echo"] as const) {
    const uploadId = kind === "ecg" ? assessment.ecg_upload_id : assessment.echo_upload_id;
    const trusted = kind === "ecg"
      ? assessment.ecg_status === "completed" && assessment.ecg_result
      : assessment.echo_status === "completed" && assessment.echo_result;
    if (trusted) continue;

    const upload = uploads.find((u) => u.id === uploadId && u.assessment_id === assessment.id);
    const row = persisted.find(
      (p) => p.assessment_id === assessment.id && p.kind === kind && p.upload_id === uploadId && p.user_id === assessment.user_id,
    );
    if (row && upload) {
      if (row.status === "completed" && row.result) {
        resolved = kind === "ecg"
          ? { ...resolved, ecg_status: "completed", ecg_result: row.result as EcgResult, ecg_error: null, ecg_model_version: row.model_version }
          : { ...resolved, echo_status: "completed", echo_result: row.result as EchoResult, echo_error: null, echo_model_version: row.model_version };
        browserSources[kind] = true;
      } else if (row.status === "failed") {
        resolved = kind === "ecg"
          ? { ...resolved, ecg_status: "failed", ecg_error: row.error }
          : { ...resolved, echo_status: "failed", echo_error: row.error };
        browserSources[kind] = true;
      }
      continue;
    }

    // Session findings are owner-only and never shown to other viewers.
    if (viewerId !== assessment.user_id) continue;
    const finding = findings.get(key(assessment.user_id, assessment.id, kind));
    const sessionUpload = uploads.find((u) => u.id === uploadId && u.user_id === assessment.user_id && u.assessment_id === assessment.id);
    if (!finding || finding.uploadId !== uploadId || !sessionUpload || sessionUpload.kind !== (kind === "ecg" ? "ecg_csv" : "echo_image")) continue;
    if (finding.error) {
      resolved = kind === "ecg" ? { ...resolved, ecg_status: "failed", ecg_error: finding.error } : { ...resolved, echo_status: "failed", echo_error: finding.error };
      includesSessionResults = true;
      browserSources[kind] = true;
      continue;
    }
    if (!finding.result) continue;
    if (kind === "ecg" && finding.kind === "ecg") {
      resolved = { ...resolved, ecg_status: "completed", ecg_result: finding.result, ecg_error: null, ecg_model_version: null };
    } else if (kind === "echo" && finding.kind === "echo") {
      resolved = { ...resolved, echo_status: "completed", echo_result: finding.result, echo_error: null, echo_model_version: null };
    }
    includesSessionResults = true;
    browserSources[kind] = true;
  }
  return { assessment: resolved, includesSessionResults, browserSources };
}

export function useAssessmentFindings(assessment: Assessment, uploads: MedicalUpload[], viewerId: string | undefined, persisted: BrowserPrediction[] = []) {
  useSyncExternalStore(subscribe, snapshot, () => emptySnapshot);
  return resolveAssessmentFindings(assessment, uploads, viewerId, persisted);
}
