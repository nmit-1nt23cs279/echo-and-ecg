// Verified class mappings for the two trained CardioFusion models.
//
// ECG: the fitted scaler's 140 means equal the column means of the public ECG5000
// heartbeat file (download.tensorflow.org/data/ecg.csv, label 1 = normal beat,
// 0 = abnormal beat) to within 1e-14, and the model reproduces those labels on all
// 4,998 rows with 99.6% agreement (output >= 0.5 -> label 1). Mapping verified.
//
// ECHO: the four outputs were matched against the public Kaggle "Echocardiogram (EKG)
// dataset" (kriegmann/echocardiogramekg-dataset, graded by cardiologists at the Marian
// Cardiac Centre, Poland). On 240 sampled images (60 per folder) argmax agreed with the
// folder label 219 times (91%), giving output order: angina, hypotension,
// cardio_vascular, coronary_artery — the same order recorded in the project brief.
// The dataset has no "normal" category, so this model always picks one of four.

export type ModelCondition = {
  /** Patient-facing name of the dataset category. */
  name: string;
  /** Dataset folder / training label, shown only in technical details. */
  datasetLabel: string;
  interpretation: string;
  significance: string;
  supporting: string[];
  nextSteps: string[];
  /** Conditions worth further evaluation that this category supports. */
  possibleConditions: string[];
};

export const ECG_MODEL_SOURCE = "ECG5000 heartbeat dataset (UCR Time Series Archive)";
export const ECHO_MODEL_SOURCE = "Echocardiogram (EKG) image dataset, Marian Cardiac Centre, Poland (Kaggle)";

export const ECG_CLASSES: Record<0 | 1, ModelCondition> = {
  1: {
    name: "Normal heartbeat pattern",
    datasetLabel: "ECG5000 label 1 (normal beat)",
    interpretation: "The shape of the uploaded heartbeat closely matches normal heartbeats in the data the model learned from.",
    significance: "A normal-looking heartbeat is reassuring, but a single beat cannot rule out heart disease. Many heart conditions do not change the shape of an individual beat.",
    supporting: ["Heartbeat shape consistent with normal beats"],
    nextSteps: ["Discuss any ongoing symptoms with a doctor even though this heartbeat looks normal."],
    possibleConditions: [],
  },
  0: {
    name: "Abnormal heartbeat pattern",
    datasetLabel: "ECG5000 label 0 (abnormal beat)",
    interpretation: "The shape of the uploaded heartbeat resembles the abnormal beats the model learned from, such as extra (premature) beats starting in the upper or lower chambers of the heart.",
    significance: "Abnormal beat shapes can come from premature beats or other rhythm disturbances. Some are harmless, while others need treatment, so a doctor should review a full ECG.",
    supporting: ["Heartbeat shape differs from normal beats"],
    nextSteps: ["Arrange a full 12-lead ECG reviewed by a doctor.", "Ask whether longer heart-rhythm monitoring (for example a Holter monitor) is needed."],
    possibleConditions: ["Premature ventricular contractions (PVCs)", "Supraventricular premature or ectopic beats"],
  },
};

export const ECHO_CLASSES: ModelCondition[] = [
  {
    name: "Angina pectoris",
    datasetLabel: "angina_disease",
    interpretation: "The echocardiogram image most closely resembles images from patients graded with angina in the model's training data.",
    significance: "Angina is chest discomfort caused by reduced blood flow to the heart muscle, usually linked to narrowed heart arteries.",
    supporting: ["Image pattern most similar to the angina category"],
    nextSteps: ["Ask a cardiologist whether a stress test or coronary evaluation is appropriate."],
    possibleConditions: ["Angina pectoris"],
  },
  {
    name: "Hypotension-related category",
    datasetLabel: "hypotension_disease_",
    interpretation: "The echocardiogram image most closely resembles images from patients graded in the hypotension (low blood pressure) category of the model's training data.",
    significance: "Low blood pressure can cause dizziness or fainting and sometimes reflects an underlying heart or circulation problem.",
    supporting: ["Image pattern most similar to the hypotension category"],
    nextSteps: ["Have your blood pressure measured, including when standing up."],
    possibleConditions: ["Hypotension (low blood pressure)"],
  },
  {
    name: "General cardiovascular disease",
    datasetLabel: "cardio_vascular_disease_",
    interpretation: "The echocardiogram image most closely resembles images from patients graded with general cardiovascular disease in the model's training data.",
    significance: "This is a broad category covering conditions of the heart and blood vessels; it does not point to one specific diagnosis.",
    supporting: ["Image pattern most similar to the general cardiovascular disease category"],
    nextSteps: ["Ask a cardiologist to review a complete echocardiogram study and report."],
    possibleConditions: ["Cardiovascular disease (unspecified)"],
  },
  {
    name: "Coronary artery disease",
    datasetLabel: "coronary_artery_disease",
    interpretation: "The echocardiogram image most closely resembles images from patients graded with coronary artery disease in the model's training data.",
    significance: "Coronary artery disease is narrowing of the arteries that supply the heart and can cause chest pain or heart attacks.",
    supporting: ["Image pattern most similar to the coronary artery disease category"],
    nextSteps: ["Ask a cardiologist whether stress testing or coronary imaging is appropriate."],
    possibleConditions: ["Coronary artery disease"],
  },
];

export const ECHO_LIMITATION = "This image model was trained only on four disease categories and has no “normal heart” category, so it always selects the closest of the four. It cannot confirm that the heart is healthy.";
export const ECG_LIMITATION = "The ECG model analyses the shape of a single heartbeat, not your heart rhythm over time.";
