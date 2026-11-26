import type { Profile } from "./auth";
import type { Assessment, HealthProfile, MedicalUpload, ProfessionalReview, SymptomReport } from "./types";
import { assessmentDate, assessmentReference, emergencyGuidance, patientDetails, reportDisclaimer, symptomDetails } from "./assessment-findings";
import { diseaseRiskAssessment, overallCardiacAssessment, type ModelAssessment } from "./prediction-summary";

export type ReportData = {
  assessment: Assessment;
  profile: Profile | null;
  health: HealthProfile | null;
  symptoms: SymptomReport | null;
  uploads: MedicalUpload[];
  includesSessionResults?: boolean;
  browserSources?: { ecg: boolean; echo: boolean };
  review?: ProfessionalReview | null;
};

export async function buildReportPdf(d: ReportData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const reportId = assessmentReference(d.assessment);
  const overall = overallCardiacAssessment(d.assessment, d.profile, d.symptoms, d.health);
  const risk = diseaseRiskAssessment(d.assessment, d.profile, d.symptoms, d.health);
  let y = 0;
  // Print palette retains the existing CardioFusion report brand.
  const navy: [number, number, number] = [22, 38, 77];
  const blue: [number, number, number] = [37, 99, 200];
  const grey: [number, number, number] = [100, 112, 135];
  const ensure = (height: number) => {
    if (y + height > H - 55) {
      doc.addPage();
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...blue).text("CardioFusion Health Assessment Report", M, 30);
      y = 55;
    }
  };
  const heading = (title: string) => {
    ensure(62);
    y += 12;
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...blue).text(title, M, y);
    y += 8;
    doc.setDrawColor(...grey).setLineWidth(0.3).line(M, y, W - M, y);
    y += 19;
  };
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal").setFontSize(10);
    const labels: string[] = doc.splitTextToSize(label, 145);
    const lines: string[] = doc.splitTextToSize(value, W - 2 * M - 160);
    for (let i = 0; i < Math.max(labels.length, lines.length); i++) {
      ensure(15);
      doc.setFont("helvetica", "normal").setFontSize(10);
      const labelLine = labels[i];
      const valueLine = lines[i];
      if (labelLine) doc.setTextColor(...grey).text(labelLine, M, y);
      if (valueLine) doc.setTextColor(...navy).text(valueLine, M + 160, y);
      y += 13;
    }
    y += 3;
  };
  const para = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal").setFontSize(size);
    const lines: string[] = doc.splitTextToSize(text, W - 2 * M);
    for (const line of lines) {
      ensure(16);
      doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(...navy).text(line, M, y);
      y += 13;
    }
    y += 5;
  };
  const bullets = (items: string[], empty: string) => {
    if (!items.length) return para(empty);
    for (const item of items) {
      doc.setFont("helvetica", "normal").setFontSize(10);
      const lines: string[] = doc.splitTextToSize(item, W - 2 * M - 14);
      lines.forEach((line, i) => {
        ensure(15);
        doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...navy);
        if (i === 0) doc.text("\u2022", M + 2, y);
        doc.text(line, M + 14, y);
        y += 13;
      });
      y += 2;
    }
    y += 3;
  };
  const modelSection = (m: ModelAssessment, browser: boolean | undefined, uploadId: string | null) => {
    row("Assessment status", m.status);
    row("Predicted condition", m.title);
    row("Interpretation", m.interpretation);
    if (m.available) {
      row("Supporting findings", m.supporting.join("; "));
      if (m.significance) row("Clinical significance", m.significance);
      row("Recommended next steps", m.nextSteps.join(" "));
      row("Model limitation", m.limitation);
      row("Source", browser ? "AI model prediction (browser-based analysis)" : "AI model prediction");
    }
    const file = d.uploads.find((u) => u.id === uploadId && u.assessment_id === d.assessment.id && u.user_id === d.assessment.user_id);
    if (file) row("Uploaded file", file.filename);
  };

  doc.setFillColor(236, 243, 252).rect(0, 0, W, 110, "F");
  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(...navy).text("CardioFusion", M, 42);
  doc.setFont("helvetica", "normal").setFontSize(12).text("Health Assessment Report", M, 62);
  doc.setFontSize(9).setTextColor(...grey).text(`Reference: ${reportId}`, M, 84);
  doc.text(`Assessment date: ${assessmentDate(d.assessment)}`, W - M, 84, { align: "right" });
  y = 134;
  row("Report type", d.review ? "Reviewed Assessment Report — includes a completed professional review" : "AI Assessment Report — professional review pending");

  heading("1. Patient Information");
  patientDetails(d.profile, d.assessment).forEach((r) => row(r.label, r.value));
  heading("2. Reported Symptoms");
  const symptoms = symptomDetails(d.symptoms, d.health);
  if (symptoms.length) symptoms.forEach((r) => row(r.label, r.value));
  else para("No symptoms or relevant history have been provided for this assessment.");

  heading("3. ECG Assessment and Interpretation");
  modelSection(overall.ecg, d.browserSources?.ecg, d.assessment.ecg_upload_id);

  heading("4. ECHO Assessment and Interpretation");
  modelSection(overall.echo, d.browserSources?.echo, d.assessment.echo_upload_id);

  heading("5. Overall Cardiac Assessment");
  row("Assessment status", overall.status);
  para(overall.overview);
  row("Disease-risk status", risk.status);
  row("Recommended follow-up", risk.followUp);

  heading("6. Possible Conditions for Further Evaluation");
  bullets(overall.possibleConditions.map((c) => `${c.name} (${c.source})`), overall.completed ? "No condition for further evaluation was identified by the models." : "Available once both analyses are complete.");

  heading("7. Supporting Findings");
  bullets(overall.supporting, "No supporting findings recorded.");

  heading("8. Recommended Next Steps");
  bullets(overall.nextSteps, "None.");
  para(emergencyGuidance, 9);

  heading("9. Assessment Date");
  row("Assessment date", assessmentDate(d.assessment));
  if (d.assessment.completed_at) row("Completed", new Date(d.assessment.completed_at).toLocaleDateString(undefined, { dateStyle: "medium" }));
  row("Report generated", new Date().toLocaleString());

  if (d.review) {
    heading("10. Professional Review");
    row("Review status", "Professional review completed");
    row("Reviewed by", d.review.professional_name || "Authorised medical professional");
    if (d.review.completed_at) row("Review date", new Date(d.review.completed_at).toLocaleString());
    const reviewRows: [string, string][] = [
      ["ECG interpretation", d.review.ecg_interpretation],
      ["ECHO interpretation", d.review.echo_interpretation],
      ["Overall professional assessment", d.review.overall_assessment],
      ["Clinical observations", d.review.clinical_observations],
      ["Additional investigations", d.review.further_investigations],
      ["Follow-up recommendations", d.review.follow_up],
      ["Treatment recommendations", d.review.recommendations],
      ["Medication recommendations", d.review.medication_recommendations ?? ""],
      ["Additional notes", d.review.notes],
    ];
    const filled = reviewRows.filter(([, v]) => v.trim());
    if (filled.length) filled.forEach(([label, value]) => row(label, value));
    else para("The review was completed without additional comments.");
    para("Written by the reviewing professional. The AI predictions above are unchanged by this review.", 9);
  }

  y += 6;
  para(reportDisclaimer, 8);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...grey);
    if (d.includesSessionResults && i === pages) {
      doc.setFontSize(7).text("Session findings are not permanently saved; refresh or sign-out clears them.", M, H - 42);
      doc.setFontSize(8);
    }
    doc.text(`CardioFusion | ${reportId}`, M, H - 28);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 28, { align: "right" });
  }
  return { doc, reportId };
}
