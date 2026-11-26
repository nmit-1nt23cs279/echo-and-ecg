import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/medical";
import { fmtDate } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { ProfessionalReview } from "@/lib/types";

const FIELDS = [
  ["ecg_interpretation", "ECG interpretation"],
  ["echo_interpretation", "ECHO interpretation"],
  ["overall_assessment", "Overall assessment"],
  ["clinical_observations", "Clinical observations"],
  ["further_investigations", "Additional investigations that may be appropriate"],
  ["follow_up", "Recommended follow-up"],
  ["recommendations", "Treatment recommendations"],
  ["medication_recommendations", "Medication recommendations"],
  ["notes", "Additional notes"],
] as const;

type FieldKey = (typeof FIELDS)[number][0];
type Draft = Record<FieldKey, string>;

const emptyDraft: Draft = {
  ecg_interpretation: "",
  echo_interpretation: "",
  overall_assessment: "",
  clinical_observations: "",
  further_investigations: "",
  follow_up: "",
  recommendations: "",
  medication_recommendations: "",
  notes: "",
};

function draftFrom(review: ProfessionalReview | null | undefined): Draft {
  if (!review) return emptyDraft;
  return {
    ecg_interpretation: review.ecg_interpretation,
    echo_interpretation: review.echo_interpretation,
    overall_assessment: review.overall_assessment,
    clinical_observations: review.clinical_observations,
    further_investigations: review.further_investigations,
    follow_up: review.follow_up,
    recommendations: review.recommendations,
    medication_recommendations: review.medication_recommendations ?? "",
    notes: review.notes,
  };
}

export function reviewStatusLabel(review: ProfessionalReview | null | undefined, aiCompleted: boolean) {
  if (review?.status === "completed") return "Professional review completed";
  if (review) return "Professional review pending";
  return aiCompleted ? "AI analysis completed — professional review pending" : "AI analysis pending";
}

// Read-only view of a completed review, shown to the patient and other authorised viewers.
export function ProfessionalReviewView({ review }: { review: ProfessionalReview }) {
  const rows = FIELDS.map(([key, label]) => ({ label, value: (review[key] ?? "").trim() })).filter((r) => r.value);
  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Professional review</h2>
        <span className="text-xs font-medium text-primary">{reviewStatusLabel(review, true)}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Reviewed by {review.professional_name || "the authorised medical professional"}
        {review.completed_at ? ` on ${fmtDate(review.completed_at)}` : ""}.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">The review was completed without additional comments.</p>
      ) : (
        <dl className="space-y-3 text-sm">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="whitespace-pre-wrap">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

// Editor for the authorised professional. AI results above it stay read-only and unchanged.
export function ProfessionalReviewEditor({
  assessmentId,
  professionalId,
  review,
  onSaved,
}: {
  assessmentId: string;
  professionalId: string;
  review: ProfessionalReview | null | undefined;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(review));
  const [busy, setBusy] = useState(false);
  const set = (key: FieldKey) => (e: { target: { value: string } }) => setDraft({ ...draft, [key]: e.target.value });

  async function save(status: "draft" | "completed") {
    if (status === "completed" && !draft.overall_assessment.trim()) {
      toast.error("Enter an overall assessment before completing the review.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("professional_reviews").upsert(
      { assessment_id: assessmentId, professional_id: professionalId, ...draft, status },
      { onConflict: "assessment_id,professional_id" },
    );
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(status === "completed" ? "Review completed and saved" : "Draft saved");
    onSaved();
  }

  return (
    <Panel>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Professional assessment</h2>
        <span className="text-xs font-medium text-primary">{reviewStatusLabel(review, true)}</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Your review is stored separately from the automated AI results, which remain unchanged. Medication or treatment
        entries are your own professional recommendations and are never generated by the AI.
      </p>
      <div className="grid gap-4">
        {FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`review-${key}`}>{label}</Label>
            <Textarea id={`review-${key}`} rows={key === "overall_assessment" ? 3 : 2} maxLength={4000} value={draft[key]} onChange={set(key)} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => save("draft")}>
          Save draft
        </Button>
        <Button size="sm" disabled={busy} onClick={() => save("completed")}>
          {busy ? "Saving…" : review?.status === "completed" ? "Update completed review" : "Complete review"}
        </Button>
      </div>
    </Panel>
  );
}
