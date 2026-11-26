import { describe, expect, it } from "vitest";
import { parseEcgCsv, validateUploadFile } from "@/lib/validation";

const row = (n: number) => Array.from({ length: n }, (_, i) => (i * 0.01).toFixed(3)).join(",");

describe("ECG CSV validation", () => {
  it("accepts exactly 140 numeric values", () => {
    const r = parseEcgCsv(row(140));
    expect(r.ok && r.values.length).toBe(140);
  });
  it("accepts a header row followed by one data row", () => {
    const header = Array.from({ length: 140 }, (_, i) => `f${i}`).join(",");
    expect(parseEcgCsv(`${header}\n${row(140)}`).ok).toBe(true);
  });
  it("rejects 139 values instead of padding", () => {
    expect(parseEcgCsv(row(139)).ok).toBe(false);
  });
  it("rejects 141 values instead of truncating", () => {
    expect(parseEcgCsv(row(141)).ok).toBe(false);
  });
  it("rejects non-finite values", () => {
    expect(parseEcgCsv(row(139) + ",NaN").ok).toBe(false);
  });
  it("rejects more than one recording", () => {
    expect(parseEcgCsv(`${row(140)}\n${row(140)}`).ok).toBe(false);
  });
});

describe("Upload limits", () => {
  it("rejects files over 10 MB", () => {
    expect(validateUploadFile({ name: "a.png", size: 10 * 1024 * 1024 + 1, type: "image/png" }, "echo_image")).not.toBeNull();
  });
  it("accepts a 10 MB PNG echo image", () => {
    expect(validateUploadFile({ name: "a.png", size: 10 * 1024 * 1024, type: "image/png" }, "echo_image")).toBeNull();
  });
  it("rejects a GIF echo image", () => {
    expect(validateUploadFile({ name: "a.gif", size: 100, type: "image/gif" }, "echo_image")).not.toBeNull();
  });
});
