export type ModelStatus = "not_provided" | "pending" | "processing" | "completed" | "failed" | "unavailable";

export type EcgResult = {
  output: number; // raw sigmoid output of the ECG model
  predicted_index: 0 | 1;
  label: string | null; // null when the label mapping is not confirmed
  label_mapping_verified: boolean;
  threshold: number;
};
export type EchoResult = {
  probabilities: { label: string; probability: number }[];
  predicted_index: number;
  predicted_label: string;
  label_mapping_verified: boolean;
};

export type Assessment = {
  id: string;
  user_id: string;
  symptom_report_id: string | null;
  ecg_upload_id: string | null;
  echo_upload_id: string | null;
  status: "draft" | "completed";
  current_step: number;
  ecg_status: ModelStatus;
  ecg_result: EcgResult | null;
  ecg_model_version: string | null;
  ecg_error: string | null;
  echo_status: ModelStatus;
  echo_result: EchoResult | null;
  echo_model_version: string | null;
  echo_error: string | null;
  fusion_status: "not_connected";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type BrowserPrediction = {
  id: string;
  assessment_id: string;
  upload_id: string;
  user_id: string;
  kind: "ecg" | "echo";
  status: "completed" | "failed";
  result: EcgResult | EchoResult | null;
  error: string | null;
  model_version: string;
  created_at: string;
  updated_at: string;
};

export type ProfessionalReview = {
  id: string;
  assessment_id: string;
  professional_id: string;
  professional_name: string;
  ecg_interpretation: string;
  echo_interpretation: string;
  overall_assessment: string;
  clinical_observations: string;
  further_investigations: string;
  follow_up: string;
  recommendations: string; // treatment recommendations
  medication_recommendations: string;
  notes: string;
  status: "draft" | "completed";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SymptomReport = {
  id: string;
  user_id: string;
  symptoms: string[];
  onset: string | null;
  duration: string | null;
  severity: number | null;
  notes: string | null;
  created_at: string;
};

export type HealthProfile = {
  user_id: string;
  medical_history: string | null;
  hypertension: boolean | null;
  diabetes: boolean | null;
  cardiovascular_history: string | null;
  medications: string | null;
  allergies: string | null;
  smoking_status: "never" | "former" | "current" | "unknown" | null;
  family_history: string | null;
  updated_at?: string;
};

export type MedicalUpload = {
  id: string;
  user_id: string;
  assessment_id: string;
  kind: "ecg_csv" | "ecg_image" | "echo_image";
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  processing_status: string;
  created_at: string;
};

export const SYMPTOM_OPTIONS = [
  "Chest pain",
  "Chest tightness",
  "Shortness of breath",
  "Palpitations",
  "Dizziness",
  "Fainting",
  "Fatigue",
  "Swelling of legs or ankles",
  "Sweating",
  "Nausea",
];

export const statusLabel: Record<ModelStatus, string> = {
  not_provided: "Not provided",
  pending: "Awaiting analysis",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  unavailable: "Unavailable",
};
