import { beforeEach, describe, expect, it } from "vitest";
import { ecgOutput, echoOutput } from "@/lib/browser-inference";
import { diseaseRiskAssessment, modelAssessment, overallCardiacAssessment } from "@/lib/prediction-summary";
import { clearSessionFindings, resolveAssessmentFindings, saveSessionFinding } from "@/lib/assessment-session";
import { buildReportPdf } from "@/lib/pdf";
import { nextSteps } from "@/lib/assessment-findings";
import type { Assessment, MedicalUpload } from "@/lib/types";

const a: Assessment = { id: "summary-test", user_id: "owner", symptom_report_id: null, ecg_upload_id: "ecg", echo_upload_id: "echo", status: "draft", current_step: 5, ecg_status: "pending", ecg_result: null, ecg_error: null, ecg_model_version: null, echo_status: "pending", echo_result: null, echo_error: null, echo_model_version: null, fusion_status: "not_connected", created_at: "2026-10-28T08:00:00Z", updated_at: "2026-10-28T08:00:00Z", completed_at: null };
const uploads: MedicalUpload[] = ["ecg", "echo"].map((id) => ({ id, user_id: "owner", assessment_id: a.id, kind: id === "ecg" ? "ecg_csv" : "echo_image", filename: `${id}.file`, storage_path: `owner/${id}`, mime_type: "text/csv", size_bytes: 100, processing_status: "uploaded", created_at: a.created_at }));
beforeEach(clearSessionFindings);
describe("Actual prediction presentation", () => {
  it("prioritizes explicitly reported emergency symptoms without waiting for predictions", () => {
    expect(nextSteps({ id: "symptom", user_id: "owner", symptoms: ["Severe chest pain"], onset: null, duration: null, severity: null, notes: null, created_at: a.created_at }).priority).toBe("urgent");
  });
  it("shows the predicted condition without raw scores or anonymous class labels", () => {
    const echo = modelAssessment({ ...a, echo_status: "completed", echo_result: echoOutput([0.1, 0.2, 0.6, 0.1]) }, "echo");
    expect(echo.title).toBe("General cardiovascular disease");
    const ecg = modelAssessment({ ...a, ecg_status: "completed", ecg_result: ecgOutput(0.7321) }, "ecg");
    expect(ecg.title).toBe("Normal heartbeat pattern");
    const text = JSON.stringify([echo.title, echo.interpretation, echo.supporting, echo.nextSteps, ecg.title, ecg.interpretation, ecg.supporting]);
    expect(text).not.toMatch(/Unclassified|Output Class|0\.7321|60\.0%|threshold/i);
  });
  it("lists possible conditions from both models and never computes a risk score", () => {
    const current = { ...a, ecg_status: "completed" as const, ecg_result: ecgOutput(0.05), echo_status: "completed" as const, echo_result: echoOutput([0.05, 0.05, 0.05, 0.85]) };
    const overall = overallCardiacAssessment(current, null, null, null);
    expect(overall.possibleConditions.map((c) => c.name)).toEqual(["Premature ventricular contractions (PVCs)", "Supraventricular premature or ectopic beats", "Coronary artery disease"]);
    const risk = diseaseRiskAssessment(current, null, null, null);
    expect(risk.category).toBeNull(); expect(risk.percentage).toBeNull();
  });
  it("shows a pending state rather than a result when analysis has not run", () => {
    const ecg = modelAssessment(a, "ecg");
    expect(ecg.available).toBe(false); expect(ecg.title).toBe("Pending");
  });
  it("shares scoped failures with Results and report reads without creating a prediction", () => {
    saveSessionFinding({ userId: "owner", assessmentId: a.id, uploadId: "echo", kind: "echo", error: "Invalid image" });
    const current = resolveAssessmentFindings(a, uploads, "owner").assessment;
    expect(current.echo_status).toBe("failed"); expect(current.echo_result).toBeNull();
    expect(modelAssessment(current, "echo").title).toBe("Analysis failed");
    expect(overallCardiacAssessment(current, null, null, null).completed).toBe(false);
    expect(resolveAssessmentFindings({ ...a, id: "other" }, uploads, "owner").assessment.echo_status).toBe("pending");
  });
  it("puts the same interpretations in the PDF without raw scores", async () => {
    saveSessionFinding({ userId: "owner", assessmentId: a.id, uploadId: "ecg", kind: "ecg", result: ecgOutput(0.7321) });
    saveSessionFinding({ userId: "owner", assessmentId: a.id, uploadId: "echo", kind: "echo", result: echoOutput([0.1, 0.2, 0.6, 0.1]) });
    const current = resolveAssessmentFindings(a, uploads, "owner");
    const { doc } = await buildReportPdf({ ...current, profile: null, health: null, symptoms: null, uploads });
    const out = doc.output();
    expect(out).toContain("Normal heartbeat pattern"); expect(out).toContain("General cardiovascular disease");
    expect(out).not.toContain("0.732100"); expect(out).not.toContain("60.0%"); expect(out).not.toContain("Unclassified");
  });
});