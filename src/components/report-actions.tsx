import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildReportPdf } from "@/lib/pdf";
import { getAssessment, getHealthProfile, getProfessionalReviews, getProfile, getSymptomReport, getUploads } from "@/lib/queries";
import { getBrowserPredictions } from "@/lib/browser-predictions";
import { resolveAssessmentFindings } from "@/lib/assessment-session";
import { supabase } from "@/lib/supabase";

async function loadReport(assessmentId: string) {
  const assessment = await getAssessment(assessmentId);
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new Error("Please sign in to prepare this report.");
  const [profile, health, symptoms, uploads, predictions, reviews] = await Promise.all([
    getProfile(assessment.user_id),
    getHealthProfile(assessment.user_id),
    getSymptomReport(assessment.symptom_report_id),
    getUploads(assessment.id),
    getBrowserPredictions(assessment.id),
    getProfessionalReviews(assessment.id),
  ]);
  const current = resolveAssessmentFindings(assessment, uploads, auth.user.id, predictions);
  const review = reviews.find((r) => r.status === "completed") ?? null;
  return buildReportPdf({
    assessment: current.assessment,
    includesSessionResults: current.includesSessionResults,
    browserSources: current.browserSources,
    profile,
    health,
    symptoms,
    uploads,
    review,
  });
}

export function ReportActions({ assessmentId, size = "sm" }: { assessmentId: string; size?: "sm" | "default" }) {
  const [busy, setBusy] = useState(false);
  async function run(mode: "preview" | "download") {
    // Open the tab synchronously so pop-up blockers allow it.
    const win = mode === "preview" ? window.open("", "_blank") : null;
    setBusy(true);
    try {
      const { doc, reportId } = await loadReport(assessmentId);
      if (mode === "download") doc.save(`${reportId}.pdf`);
      else {
        const url = URL.createObjectURL(doc.output("blob"));
        if (win) win.location.href = url;
        else window.open(url, "_blank");
      }
    } catch (e) {
      win?.close();
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size={size} variant="outline" disabled={busy} onClick={() => run("preview")}>
        <Eye className="h-4 w-4" /> Preview PDF
      </Button>
      <Button size={size} disabled={busy} onClick={() => run("download")}>
        <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
