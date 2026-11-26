import type { Profile } from "./auth";
import type { Assessment, HealthProfile, ModelStatus, SymptomReport } from "./types";

export const sessionNotice = "Findings from this browser session are included in your report. They are not permanently saved and clear on refresh or sign-out.";
export const emergencyGuidance = "If you are experiencing severe or persistent chest pain, severe difficulty breathing, fainting, or collapse, seek emergency medical care immediately. In India, call 112.";
export const reportDisclaimer = "CardioFusion is an educational AI demonstration. Its predictions come from models trained on public research datasets, are not clinically validated and are not a medical diagnosis. Please consult a qualified healthcare professional.";

export function findingStatus(status: ModelStatus, hasResult: boolean) {
  if (hasResult) return "Completed";
  if (status === "processing") return "In progress";
  if (status === "failed") return "Analysis failed";
  if (status === "not_provided") return "No file provided";
  if (status === "unavailable") return "Not available";
  return "Pending";
}

export function combinedAssessment(a: Assessment, symptoms: SymptomReport | null = null) {
  const ecg = a.ecg_status === "completed" ? a.ecg_result : null;
  const echo = a.echo_status === "completed" ? a.echo_result : null;
  const completed = Boolean(ecg && echo);
  const missingInput = !a.ecg_upload_id || !a.echo_upload_id;
  const blocked = [a.ecg_status, a.echo_status].some((s) => ["failed", "unavailable", "not_provided"].includes(s));
  const status = completed ? "Completed" : missingInput || blocked ? "Incomplete" : "Pending";
  const reported = symptoms?.symptoms.filter((s) => s.trim()) ?? [];
  const symptomSummary = !symptoms ? "No symptom report is available." : reported.length ? `Reported symptoms: ${reported.join(", ")}.` : "No symptoms were selected in the symptom report.";
  // Separate models are never averaged into a combined risk.
  return { status, completed, ecg, echo, symptomSummary, riskLevel: null, riskPercentage: null };
}

export function nextSteps(symptoms: SymptomReport | null) {
  const reported = symptoms?.symptoms.map((s) => s.trim().toLowerCase()) ?? [];
  const urgent = reported.some((s) => s === "fainting" || s === "collapse") ||
    reported.some((s) => /severe|persistent/.test(s) && /chest pain|difficulty breathing|shortness of breath/.test(s));
  const concerning = reported.some((s) => ["chest pain", "chest tightness", "shortness of breath"].includes(s));
  return {
    priority: urgent ? "urgent" : concerning ? "prompt" : "review",
    recommendation: urgent
      ? "Seek urgent medical assessment for reported fainting or collapse. Do not rely on the automated findings to rule out a serious condition."
      : concerning
        ? "Arrange prompt assessment by a qualified healthcare professional for your reported symptoms. Do not assume they are harmless or delay care because of the automated findings."
        : "Review these findings and any symptoms or concerns with a qualified healthcare professional. Automated findings alone cannot confirm or exclude a heart condition.",
    emergency: emergencyGuidance,
  };
}

export type DetailRow = { label: string; value: string };
const add = (rows: DetailRow[], label: string, value: unknown) => {
  if (value !== null && value !== undefined && String(value).trim() !== "") rows.push({ label, value: String(value).replace(/_/g, " ") });
};
export const assessmentReference = (a: Assessment) => `CF-${a.id.slice(0, 8).toUpperCase()}`;
export const assessmentDate = (a: Assessment) => new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: "medium" });

export function patientDetails(profile: Profile | null, a: Assessment) {
  const rows: DetailRow[] = [];
  add(rows, "Patient name", profile?.full_name);
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const date = new Date(a.created_at);
    let age = date.getFullYear() - dob.getFullYear();
    if (date.getMonth() < dob.getMonth() || (date.getMonth() === dob.getMonth() && date.getDate() < dob.getDate())) age--;
    if (Number.isFinite(age) && age >= 0) add(rows, "Date of birth / age", `${profile.date_of_birth} (${age} years at assessment)`);
  }
  add(rows, "Sex", profile?.sex);
  add(rows, "Height", profile?.height_cm ? `${profile.height_cm} cm` : null);
  add(rows, "Weight", profile?.weight_kg ? `${profile.weight_kg} kg` : null);
  add(rows, "Blood group", profile?.blood_group);
  add(rows, "Assessment date", assessmentDate(a));
  add(rows, "Assessment reference", assessmentReference(a));
  return rows;
}

export function symptomDetails(symptoms: SymptomReport | null, health: HealthProfile | null) {
  const rows: DetailRow[] = [];
  if (symptoms) {
    add(rows, "Symptoms reported", symptoms.symptoms.filter((s) => s.trim()).join(", ") || "No symptoms selected");
    add(rows, "Onset", symptoms.onset);
    add(rows, "Duration", symptoms.duration);
    add(rows, "Severity", symptoms.severity === null ? null : `${symptoms.severity}/10`);
    add(rows, "Patient notes", symptoms.notes);
  }
  if (health) {
    if (health.hypertension !== null) add(rows, "High blood pressure", health.hypertension ? "Yes" : "No");
    if (health.diabetes !== null) add(rows, "Diabetes", health.diabetes ? "Yes" : "No");
    add(rows, "Heart-related history", health.cardiovascular_history);
    add(rows, "Medical history", health.medical_history);
    add(rows, "Current medications", health.medications);
    add(rows, "Allergies", health.allergies);
    add(rows, "Smoking", health.smoking_status === "unknown" ? null : health.smoking_status);
    add(rows, "Family history", health.family_history);
  }
  return rows;
}
