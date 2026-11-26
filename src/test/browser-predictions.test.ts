import { beforeEach, describe, expect, it } from "vitest";
import { clearSessionFindings, resolveAssessmentFindings, saveSessionFinding } from "@/lib/assessment-session";
import { effectiveStatus } from "@/lib/browser-predictions";
import { ecgOutput, echoOutput } from "@/lib/browser-inference";
import { assessment, uploads } from "./assessment-findings.test";
import type { BrowserPrediction } from "@/lib/types";

const ecg = ecgOutput(0.7321);
const echo = echoOutput([0.1, 0.2, 0.6, 0.1]);

function persisted(kind: "ecg" | "echo", overrides: Partial<BrowserPrediction> = {}): BrowserPrediction {
  return {
    id: `bp-${kind}`,
    assessment_id: assessment.id,
    upload_id: kind === "ecg" ? "ecg-a" : "echo-a",
    user_id: assessment.user_id,
    kind,
    status: "completed",
    result: kind === "ecg" ? ecg : echo,
    error: null,
    model_version: "browser-tfjs",
    created_at: assessment.created_at,
    updated_at: assessment.created_at,
    ...overrides,
  };
}

beforeEach(clearSessionFindings);

describe("Persisted browser predictions", () => {
  it("shows persisted browser predictions to a non-owner authorised viewer", () => {
    const current = resolveAssessmentFindings({ ...assessment }, uploads, "professional-x", [persisted("ecg"), persisted("echo")]);
    expect(current.assessment.ecg_status).toBe("completed");
    expect(current.assessment.ecg_result).toEqual(ecg);
    expect(current.assessment.echo_status).toBe("completed");
    expect(current.assessment.echo_result).toEqual(echo);
    expect(current.browserSources).toEqual({ ecg: true, echo: true });
    expect(current.includesSessionResults).toBe(false);
  });

  it("never shows session findings to a non-owner viewer", () => {
    saveSessionFinding({ kind: "ecg", userId: "owner-a", assessmentId: "assessment-a", uploadId: "ecg-a", result: ecg });
    const current = resolveAssessmentFindings({ ...assessment }, uploads, "professional-x");
    expect(current.assessment.ecg_status).toBe("pending");
    expect(current.assessment.ecg_result).toBeNull();
  });

  it("keeps a trusted model-service result ahead of any browser prediction", () => {
    const trusted = { ...assessment, ecg_status: "completed" as const, ecg_result: ecgOutput(0.1111), ecg_model_version: "service-v1" };
    const current = resolveAssessmentFindings(trusted, uploads, "owner-a", [persisted("ecg")]);
    expect(current.assessment.ecg_result?.output).toBeCloseTo(0.1111);
    expect(current.assessment.ecg_model_version).toBe("service-v1");
    expect(current.browserSources.ecg).toBe(false);
  });

  it("ignores a persisted prediction saved against a replaced upload", () => {
    const stale = persisted("ecg", { upload_id: "ecg-old" });
    const current = resolveAssessmentFindings({ ...assessment }, uploads, "owner-a", [stale]);
    expect(current.assessment.ecg_status).toBe("pending");
    expect(current.assessment.ecg_result).toBeNull();
    expect(current.browserSources.ecg).toBe(false);
  });

  it("marks a persisted failure as failed, never as completed", () => {
    const failed = persisted("echo", { status: "failed", result: null, error: "Unsupported image file." });
    const current = resolveAssessmentFindings({ ...assessment }, uploads, "owner-a", [failed]);
    expect(current.assessment.echo_status).toBe("failed");
    expect(current.assessment.echo_error).toBe("Unsupported image file.");
    expect(current.assessment.echo_result).toBeNull();
  });
});

describe("Effective status for list views", () => {
  it("reports the persisted browser status when no trusted result exists", () => {
    expect(effectiveStatus({ ...assessment }, "ecg", [persisted("ecg")])).toBe("completed");
    expect(effectiveStatus({ ...assessment }, "echo", [persisted("echo", { status: "failed", result: null, error: "x" })])).toBe("failed");
  });

  it("keeps the trusted status when the model service completed or is processing", () => {
    const done = { ...assessment, ecg_status: "completed" as const, ecg_result: ecg, echo_status: "processing" as const };
    expect(effectiveStatus(done, "ecg", [persisted("ecg", { status: "failed", result: null, error: "x" })])).toBe("completed");
    expect(effectiveStatus(done, "echo", [persisted("echo")])).toBe("processing");
  });

  it("falls back to the database status with no predictions", () => {
    expect(effectiveStatus({ ...assessment }, "ecg", [])).toBe("pending");
  });
});
