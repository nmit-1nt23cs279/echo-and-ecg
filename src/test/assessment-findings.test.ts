import { beforeEach, describe, expect, it } from "vitest";
import { clearSessionFindings, resolveAssessmentFindings, saveSessionFinding } from "@/lib/assessment-session";
import { combinedAssessment, nextSteps, patientDetails, symptomDetails } from "@/lib/assessment-findings";
import { ecgOutput, echoOutput } from "@/lib/browser-inference";
import type { Assessment, MedicalUpload } from "@/lib/types";
import type { SymptomReport } from "@/lib/types";

export const assessment: Assessment = {
  id: "assessment-a", user_id: "owner-a", ecg_upload_id: "ecg-a", echo_upload_id: "echo-a",
  symptom_report_id: null, status: "draft", current_step: 5,
  ecg_status: "pending", ecg_result: null, ecg_error: null, ecg_model_version: null,
  echo_status: "pending", echo_result: null, echo_error: null, echo_model_version: null,
  fusion_status: "not_connected", created_at: "2026-10-28T07:32:00Z", updated_at: "2026-10-28T07:32:00Z", completed_at: null,
};
export const uploads: MedicalUpload[] = ["ecg", "echo"].map((kind) => ({
  id: `${kind}-a`, user_id: "owner-a", assessment_id: "assessment-a", kind: kind === "ecg" ? "ecg_csv" : "echo_image",
  filename: kind === "ecg" ? "recording.csv" : "echocardiogram.png", storage_path: `owner-a/${kind}`, mime_type: kind === "ecg" ? "text/csv" : "image/png",
  size_bytes: 100, processing_status: "pending", created_at: assessment.created_at,
}));
const ecg = ecgOutput(0.7321);
const echo = echoOutput([0.1, 0.2, 0.6, 0.1]);
const saveEcg = () => saveSessionFinding({ kind: "ecg", userId: "owner-a", assessmentId: "assessment-a", uploadId: "ecg-a", result: ecg });
const saveEcho = () => saveSessionFinding({ kind: "echo", userId: "owner-a", assessmentId: "assessment-a", uploadId: "echo-a", result: echo });

beforeEach(clearSessionFindings);
describe("Current assessment findings", () => {
  it("reuses the actual result objects across navigation and report reads without changing database data", () => {
    saveEcg(); saveEcho();
    for (let i = 0; i < 2; i++) {
      const current = resolveAssessmentFindings({ ...assessment }, uploads, "owner-a");
      expect(current.assessment.ecg_result).toBe(ecg);
      expect(current.assessment.echo_result).toBe(echo);
      expect(current.assessment.ecg_status).toBe("completed");
      expect(current.assessment.echo_status).toBe("completed");
      expect(current.includesSessionResults).toBe(true);
    }
    expect(assessment.ecg_result).toBeNull();
    expect(assessment.ecg_status).toBe("pending");
  });
  it("does not reuse findings for a different assessment", () => {
    saveEcg();
    expect(resolveAssessmentFindings({ ...assessment, id: "assessment-b" }, uploads, "owner-a").assessment.ecg_result).toBeNull();
  });
  it("does not expose session findings to another viewer", () => {
    saveEcg();
    expect(resolveAssessmentFindings(assessment, uploads, "professional-a").assessment.ecg_result).toBeNull();
  });
  it("discards results when the linked input is replaced or unavailable", () => {
    saveEcg();
    expect(resolveAssessmentFindings({ ...assessment, ecg_upload_id: "replacement" }, uploads, "owner-a").assessment.ecg_result).toBeNull();
    expect(resolveAssessmentFindings(assessment, [], "owner-a").assessment.ecg_result).toBeNull();
  });
  it("uses trusted stored results when available", () => {
    saveEcg();
    const trusted = ecgOutput(0.2);
    expect(resolveAssessmentFindings({ ...assessment, ecg_status: "completed", ecg_result: trusted }, uploads, "owner-a").assessment.ecg_result).toBe(trusted);
  });
  it("clears medical findings on session reset", () => {
    saveEcg(); clearSessionFindings();
    expect(resolveAssessmentFindings(assessment, uploads, "owner-a").assessment.ecg_result).toBeNull();
  });
  it("completes the combined assessment only when both models succeeded", () => {
    saveEcg();
    expect(combinedAssessment(resolveAssessmentFindings(assessment, uploads, "owner-a").assessment).completed).toBe(false);
    saveEcho();
    const combined = combinedAssessment(resolveAssessmentFindings(assessment, uploads, "owner-a").assessment);
    expect(combined.completed).toBe(true);
    expect(combined.ecg?.output).toBe(0.7321);
    expect(combined.echo?.probabilities.map((p) => p.probability)).toEqual([0.1, 0.2, 0.6, 0.1]);
    expect(combinedAssessment({ ...assessment, ecg_result: ecg, ecg_status: "failed", echo_result: echo, echo_status: "completed" }).completed).toBe(false);
  });
  it("leaves missing predictions absent", () => {
    const combined = combinedAssessment(assessment);
    expect(combined.completed).toBe(false);
    expect(combined.ecg).toBeNull();
    expect(combined.echo).toBeNull();
  });
  it("does not assign risk levels or percentages even when both predictions have high probabilities", () => {
    const combined = combinedAssessment({ ...assessment, ecg_status: "completed", ecg_result: ecgOutput(0.99), echo_status: "completed", echo_result: echoOutput([0.99, 0.005, 0.003, 0.002]) });
    expect(combined.riskLevel).toBeNull();
    expect(combined.riskPercentage).toBeNull();
  });
  it.each(["Chest pain", "Chest tightness", "Shortness of breath"])("requires prompt professional assessment for %s", (symptom) => {
    expect(nextSteps({ ...symptoms, symptoms: [symptom] }).priority).toBe("prompt");
  });
  it.each(["Fainting", "Collapse"])("requires urgent assessment for %s", (symptom) => {
    expect(nextSteps({ ...symptoms, symptoms: [symptom] }).priority).toBe("urgent");
  });
  it("does not add unreported symptoms or history and retains zero severity", () => {
    const rows = symptomDetails(symptoms, null);
    expect(rows.find((r) => r.label === "Symptoms reported")?.value).toBe("Nausea");
    expect(rows.find((r) => r.label === "Severity")?.value).toBe("0/10");
    expect(rows).toHaveLength(2);
  });
  it("omits absent patient details while retaining the current assessment reference and date", () => {
    const rows = patientDetails(null, assessment);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.label === "Assessment reference")?.value).toBe("CF-ASSESSME");
  });
});

const symptoms: SymptomReport = { id: "symptom-a", user_id: "owner-a", symptoms: ["Nausea"], onset: null, duration: null, severity: 0, notes: null, created_at: assessment.created_at };
