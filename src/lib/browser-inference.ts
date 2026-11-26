import ecgModel from "@/assets/models/ecg-model.json?url";
import echoModel from "@/assets/models/echo-model.json?url";
import scaler from "@/assets/models/ecg-scaler.json";
import { preprocessEcho, scaleEcg } from "./browser-preprocessing";
import { parseEcgCsv } from "./validation";
import type { EcgResult, EchoResult } from "./types";
import { ECG_CLASSES, ECHO_CLASSES } from "./model-labels";

type Kind = "ecg" | "echo";
type TF = typeof import("@tensorflow/tfjs");
const models: Partial<Record<Kind, Promise<import("@tensorflow/tfjs").GraphModel>>> = {};
let runtime: Promise<TF> | undefined;

async function getRuntime() {
  runtime ??= import("@tensorflow/tfjs").then(async (tf) => {
    // CPU float32 avoids device-dependent WebGL float16 precision for the demonstration.
    await tf.setBackend("cpu");
    await tf.ready();
    return tf;
  }).catch((e) => { runtime = undefined; throw e; });
  return runtime;
}

async function getModel(kind: Kind, tf: TF) {
  models[kind] ??= tf.loadGraphModel(kind === "ecg" ? ecgModel : echoModel, { weightUrlConverter: async (path) => path })
    .catch((e) => { delete models[kind]; throw e; });
  return models[kind];
}

// Labels follow the mappings verified against the public training datasets (see model-labels.ts).
export function ecgOutput(output: number): EcgResult {
  if (!Number.isFinite(output) || output < 0 || output > 1) throw new Error("Invalid ECG model output.");
  const predicted_index = output >= 0.5 ? 1 : 0;
  return { output, predicted_index, label: ECG_CLASSES[predicted_index].name, label_mapping_verified: true, threshold: 0.5 };
}

export function echoOutput(values: number[]): EchoResult {
  if (values.length !== 4 || values.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error("Invalid ECHO model output.");
  const predicted_index = values.indexOf(Math.max(...values));
  return { probabilities: values.map((probability, i) => ({ label: ECHO_CLASSES[i]?.datasetLabel ?? `Class ${i}`, probability })), predicted_index,
    predicted_label: ECHO_CLASSES[predicted_index]?.datasetLabel ?? `Class ${predicted_index}`, label_mapping_verified: true };
}

export async function predictLocal(kind: "ecg", file: Blob): Promise<EcgResult>;
export async function predictLocal(kind: "echo", file: Blob): Promise<EchoResult>;
export async function predictLocal(kind: Kind, file: Blob): Promise<EcgResult | EchoResult>;
export async function predictLocal(kind: Kind, file: Blob): Promise<EcgResult | EchoResult> {
  let values: Float32Array;
  if (kind === "ecg") {
    const parsed = parseEcgCsv(await file.text());
    if (!parsed.ok) throw new Error(parsed.error);
    values = scaleEcg(parsed.values, scaler);
  } else values = await preprocessEcho(new Uint8Array(await file.arrayBuffer()));
  const tf = await getRuntime();
  const model = await getModel(kind, tf);
  if (!model) throw new Error("Model could not be loaded. Please retry.");
  const input = tf.tensor(values, kind === "ecg" ? [1, 140, 1] : [1, 224, 224, 3]);
  let outputs: import("@tensorflow/tfjs").Tensor[] = [];
  try {
    const prediction = model.predict(input);
    outputs = Array.isArray(prediction) ? prediction : prediction instanceof tf.Tensor ? [prediction] : Object.values(prediction);
    const tensor = outputs[0];
    if (outputs.length !== 1 || !tensor) throw new Error("Unexpected model output shape.");
    const result = Array.from(await tensor.data());
    if (kind === "ecg") {
      const output = result[0];
      if (result.length !== 1 || output === undefined) throw new Error("Unexpected ECG output.");
      return ecgOutput(output);
    }
    return echoOutput(result);
  } finally { input.dispose(); outputs.forEach((tensor) => tensor.dispose()); }
}