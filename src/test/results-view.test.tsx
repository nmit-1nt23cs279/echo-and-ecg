import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {}, MEDICAL_BUCKET: "medical-uploads", MODEL_API_URL: "" }));
import { AssessmentResults } from "@/components/results";
import { ecgOutput, echoOutput } from "@/lib/browser-inference";
import type { Assessment, MedicalUpload } from "@/lib/types";

const a: Assessment = { id: "view", user_id: "owner", symptom_report_id: null, ecg_upload_id: "ecg", echo_upload_id: "echo", status: "completed", current_step: 5, ecg_status: "completed", ecg_result: ecgOutput(0.0712), ecg_error: null, ecg_model_version: null, echo_status: "completed", echo_result: echoOutput([0.81, 0.09, 0.06, 0.04]), echo_error: null, echo_model_version: null, fusion_status: "not_connected", created_at: "2026-11-01T06:00:00Z", updated_at: "2026-11-01T06:00:00Z", completed_at: null };
const uploads = ["ecg", "echo"].map((id) => ({ id, user_id: "owner", assessment_id: "view", kind: id === "ecg" ? "ecg_csv" : "echo_image", filename: `${id}.file`, storage_path: `owner/${id}`, mime_type: "x", size_bytes: 1, processing_status: "uploaded", created_at: a.created_at })) as MedicalUpload[];

describe("Results page", () => {
  it("shows patients the predicted conditions without raw scores or anonymous labels", () => {
    const { container } = render(<AssessmentResults assessment={a} uploads={uploads} canRun onRefresh={() => {}} />);
    expect(screen.getAllByText("Abnormal heartbeat pattern").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Angina pectoris").length).toBeGreaterThan(0);
    expect(screen.getByText("Overall Cardiac Assessment")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/0\.0712|81\.0%|Unclassified|Output Class|threshold/i);
  });
  it("offers professionals the optional technical information", () => {
    render(<AssessmentResults assessment={a} uploads={uploads} canRun={false} onRefresh={() => {}} />);
    expect(screen.getAllByText("Technical information (for professionals)")).toHaveLength(2);
  });
});
