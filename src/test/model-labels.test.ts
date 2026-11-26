import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as tf from "@tensorflow/tfjs";
import scaler from "@/assets/models/ecg-scaler.json";
import sample from "./fixtures/ecg5000-sample.json";
import { scaleEcg } from "@/lib/browser-preprocessing";
import { ecgOutput, echoOutput } from "@/lib/browser-inference";
import { modelAssessment } from "@/lib/prediction-summary";
import type { Assessment } from "@/lib/types";

const assessment: Assessment = { id: "labels", user_id: "owner", symptom_report_id: null, ecg_upload_id: "ecg", echo_upload_id: "echo", status: "draft", current_step: 5, ecg_status: "pending", ecg_result: null, ecg_error: null, ecg_model_version: null, echo_status: "pending", echo_result: null, echo_error: null, echo_model_version: null, fusion_status: "not_connected", created_at: "2026-11-01T06:00:00Z", updated_at: "2026-11-01T06:00:00Z", completed_at: null };

async function loadEcg() {
  await tf.setBackend("cpu");
  const graph = JSON.parse(readFileSync("src/assets/models/ecg-model.json", "utf8"));
  const groups = graph.weightsManifest as { paths: string[]; weights: tf.io.WeightsManifestEntry[] }[];
  const data = Buffer.concat(groups.flatMap((g) => g.paths.map((p) => readFileSync(`public${p}`))));
  return tf.loadGraphModel(tf.io.fromMemory({ modelTopology: graph.modelTopology, signature: graph.signature, weightSpecs: groups.flatMap((g) => g.weights), weightData: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }));
}

describe("Verified model class mappings", () => {
  it("ECG model labels real ECG5000 normal beats as normal and abnormal beats as abnormal", async () => {
    const model = await loadEcg();
    for (const row of sample.rows) {
      const input = tf.tensor(scaleEcg(row.values, scaler), [1, 140, 1]);
      const out = model.predict(input) as tf.Tensor;
      const result = ecgOutput((await out.data())[0] ?? NaN);
      const view = modelAssessment({ ...assessment, ecg_status: "completed", ecg_result: result }, "ecg");
      expect(view.title).toBe(row.label === 1 ? "Normal heartbeat pattern" : "Abnormal heartbeat pattern");
      input.dispose(); out.dispose();
    }
    model.dispose();
  });
  it("maps ECHO outputs in the verified dataset order", () => {
    const names = [0, 1, 2, 3].map((i) => modelAssessment({ ...assessment, echo_status: "completed", echo_result: echoOutput([0, 1, 2, 3].map((j) => (j === i ? 0.97 : 0.01))) }, "echo").title);
    expect(names).toEqual(["Angina pectoris", "Hypotension-related category", "General cardiovascular disease", "Coronary artery disease"]);
  });
  it("interprets previously stored unlabelled results from their original class index without changing them", () => {
    const stored = { probabilities: [0.1, 0.1, 0.1, 0.7].map((probability, i) => ({ label: `Class ${i}`, probability })), predicted_index: 3, predicted_label: "Class 3", label_mapping_verified: false };
    const view = modelAssessment({ ...assessment, echo_status: "completed", echo_result: stored }, "echo");
    expect(view.title).toBe("Coronary artery disease");
    expect(stored.predicted_label).toBe("Class 3");
  });
});
