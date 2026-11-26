import { describe, expect, it } from "vitest";
import { scaleEcg, resizeRgb, preprocessEcho } from "@/lib/browser-preprocessing";
import { ecgOutput, echoOutput } from "@/lib/browser-inference";

describe("Browser inference rules", () => {
  it("preserves fitted 140-feature scaler order and float32 operations", () => {
    const values = Array.from({ length: 140 }, (_, i) => i + 0.1);
    const mean = Array.from({ length: 140 }, (_, i) => i);
    const result = scaleEcg(values, { mean, scale: Array(140).fill(2) });
    expect(result.length).toBe(140);
    expect(result[0]).toBe(Math.fround(Math.fround(Math.fround(0.1) - 0) / 2));
    expect(result[139]).toBe(Math.fround(Math.fround(Math.fround(139.1) - 139) / 2));
    expect(() => scaleEcg(values.slice(1), { mean, scale: Array(140).fill(2) })).toThrow();
  });
  it("selects the ECG normal class (1) at exactly 0.5 using the verified ECG5000 mapping", () => {
    expect(ecgOutput(0.5)).toMatchObject({ predicted_index: 1, threshold: 0.5, label: "Normal heartbeat pattern", label_mapping_verified: true });
    expect(ecgOutput(0.49999)).toMatchObject({ predicted_index: 0, label: "Abnormal heartbeat pattern" });
  });
  it("keeps four ECHO outputs in original order with the verified dataset labels", () => {
    const result = echoOutput([0.1, 0.2, 0.6, 0.1]);
    expect(result.predicted_index).toBe(2);
    expect(result.probabilities.map((v) => v.probability)).toEqual([0.1, 0.2, 0.6, 0.1]);
    expect(result.predicted_label).toBe("cardio_vascular_disease_");
    expect(() => echoOutput([0.1, 0.9])).toThrow();
  });
  it("resizes RGB to 224 by 224 without changing constant pixels", () => {
    const result = resizeRgb(new Uint8Array([10, 30, 255, 10, 30, 255]), 2, 1);
    expect(result.length).toBe(224 * 224 * 3);
    expect(Array.from(result.slice(0, 3))).toEqual([10, 30, 255]);
    expect(Array.from(result.slice(-3))).toEqual([10, 30, 255]);
  });
  it("rejects unsupported ECHO bytes rather than predicting on substitute input", async () => {
    await expect(preprocessEcho(new Uint8Array([0, 1, 2]))).rejects.toThrow();
  });
});