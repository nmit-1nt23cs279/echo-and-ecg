import type { Profile } from "./auth";
import type { Assessment, EcgResult, EchoResult, HealthProfile, ModelStatus, SymptomReport } from "./types";
import { findingStatus, nextSteps, patientDetails, symptomDetails, type DetailRow } from "./assessment-findings";
import { ECG_CLASSES, ECG_LIMITATION, ECG_MODEL_SOURCE, ECHO_CLASSES, ECHO_LIMITATION, ECHO_MODEL_SOURCE, type ModelCondition } from "./model-labels";

export const predictionSourceNote = "AI model prediction based on public research data. It is not a medical diagnosis and must be confirmed by a doctor.";

export type ModelAssessment = {
  kind: "ecg" | "echo";
  available: boolean;
  failed: boolean;
  status: string;
  condition: ModelCondition | null;
  title: string;
  interpretation: string;
  significance: string | null;
  supporting: string[];
  nextSteps: string[];
  possibleConditions: string[];
  uncertain: boolean;
  limitation: string;
  technical: DetailRow[];
};

function completedResult<K extends "ecg" | "echo">(a: Assessment, kind: K) {
  return (kind === "ecg"
    ? a.ecg_status === "completed" ? a.ecg_result : null
    : a.echo_status === "completed" ? a.echo_result : null) as (K extends "ecg" ? EcgResult : EchoResult) | null;
}

function echoIndex(result: EchoResult) {
  const values = result.probabilities.map((p) => p.probability);
  const top = values.indexOf(Math.max(...values));
  return Number.isInteger(result.predicted_index) && result.predicted_index >= 0 && result.predicted_index < 4 ? result.predicted_index : top;
}

function unavailable(kind: "ecg" | "echo", status: ModelStatus): Pick<ModelAssessment, "title" | "interpretation"> {
  const name = kind === "ecg" ? "ECG" : "echocardiogram";
  if (status === "failed") return { title: "Analysis failed", interpretation: `The ${name} analysis could not be completed. Please check the uploaded file and try again. No prediction is available.` };
  if (status === "processing") return { title: "Analysis in progress", interpretation: `The ${name} is being analysed.` };
  if (status === "not_provided") return { title: "No file provided", interpretation: `No ${name} file has been uploaded for this assessment.` };
  return { title: "Pending", interpretation: `The ${name} has not been analysed yet. Use Predict to run the analysis.` };
}

/** Patient-facing interpretation of one model's actual stored or session result. */
export function modelAssessment(a: Assessment, kind: "ecg" | "echo"): ModelAssessment {
  const status = kind === "ecg" ? a.ecg_status : a.echo_status;
  const limitation = kind === "ecg" ? ECG_LIMITATION : ECHO_LIMITATION;
  const base = { kind, limitation, failed: status === "failed", status: findingStatus(status, false) };
  if (kind === "ecg") {
    const r = completedResult(a, "ecg");
    if (r) {
      const condition = ECG_CLASSES[r.output >= r.threshold ? 1 : 0];
      const uncertain = Math.abs(r.output - r.threshold) < 0.15;
      return { ...base, failed: false, available: true, status: findingStatus(status, true), condition, title: condition.name,
        interpretation: condition.interpretation, significance: condition.significance,
        supporting: uncertain ? [...condition.supporting, "The result was close to the model's decision boundary, so it is less certain"] : condition.supporting,
        nextSteps: condition.nextSteps, possibleConditions: condition.possibleConditions, uncertain,
        technical: [
          { label: "Model output", value: r.output.toFixed(6) },
          { label: "Decision threshold", value: String(r.threshold) },
          { label: "Training label", value: condition.datasetLabel },
          { label: "Training data", value: ECG_MODEL_SOURCE },
        ] };
    }
  } else {
    const r = completedResult(a, "echo");
    if (r && r.probabilities.length === 4) {
      const index = echoIndex(r);
      const condition = ECHO_CLASSES[index] as ModelCondition;
      const uncertain = (r.probabilities[index]?.probability ?? 0) < 0.5;
      return { ...base, failed: false, available: true, status: findingStatus(status, true), condition, title: condition.name,
        interpretation: condition.interpretation, significance: condition.significance,
        supporting: uncertain ? [...condition.supporting, "The image also resembled other categories, so this result is less certain"] : condition.supporting,
        nextSteps: condition.nextSteps, possibleConditions: condition.possibleConditions, uncertain,
        technical: [
          ...r.probabilities.map((p, i) => ({ label: `Output ${i} · ${ECHO_CLASSES[i]?.datasetLabel ?? "unknown"}`, value: `${(p.probability * 100).toFixed(1)}%` })),
          { label: "Training data", value: ECHO_MODEL_SOURCE },
        ] };
    }
  }
  return { ...base, available: false, condition: null, ...unavailable(kind, status), significance: null, supporting: [], nextSteps: [], possibleConditions: [], uncertain: false, technical: [] };
}

function riskFactors(profile: Profile | null, a: Assessment, health: HealthProfile | null): string[] {
  const out: string[] = [];
  const age = patientDetails(profile, a).find((r) => r.label === "Date of birth / age")?.value.match(/\((\d+) years/)?.[1];
  if (age) out.push(`Age ${age}`);
  if (health?.hypertension) out.push("History of high blood pressure");
  if (health?.diabetes) out.push("History of diabetes");
  if (health?.smoking_status && ["current", "former"].includes(health.smoking_status)) out.push(`${health.smoking_status === "current" ? "Current" : "Former"} smoker`);
  if (health?.cardiovascular_history?.trim()) out.push(`Heart-related history: ${health.cardiovascular_history.trim()}`);
  if (health?.family_history?.trim()) out.push(`Family history: ${health.family_history.trim()}`);
  return out;
}

const reportedSymptoms = (s: SymptomReport | null) => s?.symptoms.map((x) => x.trim()).filter(Boolean) ?? [];
const unique = (xs: string[]) => [...new Set(xs)];

/** Overall Cardiac Assessment built only from this assessment's actual findings and records. */
export function overallCardiacAssessment(a: Assessment, profile: Profile | null, symptoms: SymptomReport | null, health: HealthProfile | null) {
  const ecg = modelAssessment(a, "ecg"), echo = modelAssessment(a, "echo");
  const symptomList = reportedSymptoms(symptoms);
  const guidance = nextSteps(symptoms);
  const possibleConditions = [
    ...ecg.possibleConditions.map((name) => ({ name, source: "ECG model" })),
    ...echo.possibleConditions.map((name) => ({ name, source: "ECHO model" })),
  ];
  const ecgSentence = ecg.available ? `The ECG analysis found an ${ecg.title.toLowerCase()}.`.replace("an normal", "a normal")
    : ecg.failed ? "The ECG analysis failed and needs to be repeated." : "The ECG has not been analysed yet.";
  const echoSentence = echo.available ? `The echocardiogram analysis placed the image in the “${echo.title}” category.`
    : echo.failed ? "The echocardiogram analysis failed and needs to be repeated." : "The echocardiogram has not been analysed yet.";
  const symptomSentence = !symptoms ? "No symptom report was recorded." : symptomList.length ? `Reported symptoms: ${symptomList.join(", ").toLowerCase()}.` : "No symptoms were reported.";
  const completed = ecg.available && echo.available;
  const conclusion = possibleConditions.length
    ? `${completed ? "Taken together" : "Based on the analysis available so far"}, the conditions listed below should be evaluated by a doctor, ideally a cardiologist.`
    : completed ? "Neither model identified a condition for further evaluation, but symptoms and history still need a doctor's review."
      : "The assessment will be complete once both analyses have finished.";
  const supporting = unique([
    ...ecg.supporting.map((s) => `ECG: ${s}`),
    ...echo.supporting.map((s) => `ECHO: ${s}`),
    ...symptomList.map((s) => `Reported symptom: ${s}`),
    ...riskFactors(profile, a, health),
  ]);
  const steps = unique([guidance.recommendation, ...ecg.nextSteps, ...echo.nextSteps, "Bring this report to your appointment so the doctor can review the AI findings."]);
  const blocked = ecg.failed || echo.failed || !a.ecg_upload_id || !a.echo_upload_id;
  return {
    status: completed ? "Completed" : blocked ? "Incomplete" : "Pending",
    completed,
    overview: `${ecgSentence} ${echoSentence} ${symptomSentence} ${conclusion}`,
    ecg, echo, possibleConditions, supporting, nextSteps: steps, priority: guidance.priority,
    riskLevel: null, riskPercentage: null,
  };
}

/** Structured educational risk summary: no validated risk model exists, so no score or tier is produced. */
export function diseaseRiskAssessment(a: Assessment, profile: Profile | null, symptoms: SymptomReport | null, health: HealthProfile | null) {
  const overall = overallCardiacAssessment(a, profile, symptoms, health);
  const followUp = overall.priority === "urgent" ? "Seek urgent medical assessment today."
    : overall.priority === "prompt" || overall.possibleConditions.length ? "Book a doctor's appointment within the next few days."
      : "Discuss these results at your next routine check-up.";
  return {
    status: "Educational summary — no validated risk score is calculated",
    possibleConditions: overall.possibleConditions,
    riskFactors: riskFactors(profile, a, health),
    symptoms: reportedSymptoms(symptoms),
    symptomRows: symptomDetails(symptoms, null).filter((r) => r.label !== "Symptoms reported"),
    followUp,
    category: null, percentage: null,
  };
}
