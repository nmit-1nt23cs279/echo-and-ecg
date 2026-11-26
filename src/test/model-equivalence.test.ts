import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as tf from "@tensorflow/tfjs";
import reference from "./fixtures/model-reference.json";
import scaler from "@/assets/models/ecg-scaler.json";
import { scaleEcg, resizeRgb } from "@/lib/browser-preprocessing";

async function load(kind: string) {
  await tf.setBackend("cpu");
  const graph = JSON.parse(readFileSync(`src/assets/models/${kind}-model.json`, "utf8"));
  const groups = graph.weightsManifest as { paths: string[]; weights: tf.io.WeightsManifestEntry[] }[];
  const data = Buffer.concat(groups.flatMap((group) => group.paths.map((path) => readFileSync(`public${path}`))));
  return tf.loadGraphModel(tf.io.fromMemory({
    modelTopology: graph.modelTopology, signature: graph.signature,
    weightSpecs: groups.flatMap((group) => group.weights),
    weightData: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  }));
}

describe("Original-model numerical equivalence (synthetic, not clinical)", () => {
  it("matches original ECG probabilities within 0.00001 without refitting the scaler", async () => {
    const model = await load("ecg");
    try {
      for (const example of reference.ecg) {
        const scaled = scaleEcg(example.input, scaler);
        expect(Array.from(scaled)).toEqual(example.scaled);
        const input = tf.tensor(scaled, [1, 140, 1]);
        const output = model.predict(input) as tf.Tensor;
        try {
          const actual = (await output.data())[0];
          const expected = example.output[0];
          if (actual === undefined || expected === undefined) throw new Error("Missing ECG reference output.");
          expect(Math.abs(actual - expected)).toBeLessThan(0.00001);
        }
        finally { input.dispose(); output.dispose(); }
      }
    } finally { model.dispose(); }
  });
  it("matches original ECHO four-output probabilities within 0.00001 after RGB resize and /255", async () => {
    const { width, height } = reference.echo;
    const rgb = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      rgb.set([(x * 3 + y) % 256, (y * 2 + x) % 256, (x + y * 5) % 256], (y * width + x) * 3);
    }
    const model = await load("echo");
    const input = tf.tensor(Float32Array.from(resizeRgb(rgb, width, height), (v) => Math.fround(v / 255)), [1, 224, 224, 3]);
    const output = model.predict(input) as tf.Tensor;
    try {
      const values = Array.from(await output.data());
      expect(values.length).toBe(4);
      values.forEach((v, i) => {
        const expected = reference.echo.output[i];
        if (expected === undefined) throw new Error("Missing ECHO reference output.");
        expect(Math.abs(v - expected)).toBeLessThan(0.00001);
      });
    } finally { input.dispose(); output.dispose(); model.dispose(); }
  }, 30000);
});