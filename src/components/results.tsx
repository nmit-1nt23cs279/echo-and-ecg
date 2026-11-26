import { useState } from "react";
import { Activity, ScanHeart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DiseaseRiskSection, FollowUpCard, OverallCardiacAssessment, PredictionFinding } from "@/components/prediction-summary";
import { useAuth } from "@/lib/auth";
import { saveSessionFinding, useAssessmentFindings } from "@/lib/assessment-session";
import { saveBrowserPrediction } from "@/lib/browser-predictions";
import { PatientAssessmentSummary } from "@/components/patient-assessment-summary";
import type { Profile } from "@/lib/auth";
import { emergencyGuidance, findingStatus, nextSteps, sessionNotice } from "@/lib/assessment-findings";
import { predictionSourceNote } from "@/lib/prediction-summary";
import { modelApiConfigured, requestPrediction } from "@/lib/model-api";
import { supabase, MEDICAL_BUCKET } from "@/lib/supabase";
import type { Assessment, BrowserPrediction, MedicalUpload, HealthProfile, SymptomReport } from "@/lib/types";

function ModelCard({
  kind,
  assessment,
  upload,
  canRun,
  browserSource,
  showTechnical,
  onDone,
}: {
  kind: "ecg" | "echo";
  assessment: Assessment;
  upload: MedicalUpload | undefined;
  canRun: boolean;
  browserSource: boolean;
  showTechnical: boolean;
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const browser = !modelApiConfigured();
  const savedStatus = kind === "ecg" ? assessment.ecg_status : assessment.echo_status;
  const status = savedStatus === "completed" ? savedStatus : localError ? "failed" : savedStatus;
  const error = localError ?? (kind === "ecg" ? assessment.ecg_error : assessment.echo_error);
  const ecgImageOnly = kind === "ecg" && upload?.kind === "ecg_image";
  const runnable = canRun && !!upload && !ecgImageOnly && (browser || status === "pending" || status === "failed" || status === "unavailable");

  async function run() {
    setRunning(true);
    setLocalError(null);
    try {
      if (browser) {
        if (!upload || upload.assessment_id !== assessment.id || upload.user_id !== assessment.user_id)
          throw new Error("Upload does not belong to this assessment.");
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || auth.user?.id !== assessment.user_id) throw new Error("Please sign in as the assessment owner.");
        const { data: file, error: downloadError } = await supabase.storage.from(MEDICAL_BUCKET).download(upload.storage_path);
        if (downloadError || !file) throw new Error(downloadError?.message ?? "Could not read the uploaded file.");
        const { predictLocal } = await import("@/lib/browser-inference");
        const scope = { userId: assessment.user_id, assessmentId: assessment.id, uploadId: upload.id };
        const result = await predictLocal(kind, file);
        saveSessionFinding({ ...scope, kind, result } as Parameters<typeof saveSessionFinding>[0]);
        // Persist so authorised professionals and later sessions see the same finding.
        // The row is explicitly marked as browser-produced and never touches trusted columns.
        await saveBrowserPrediction({ assessment, upload, kind, result });
      } else await requestPrediction(kind, assessment.id);
      toast.success(`${kind.toUpperCase()} analysis finished`);
    } catch (e) {
      const message = (e as Error).message;
      setLocalError(message);
      if (browser && upload && savedStatus !== "completed") {
        saveSessionFinding({ userId: assessment.user_id, assessmentId: assessment.id, uploadId: upload.id, kind, error: message });
        try {
          await saveBrowserPrediction({ assessment, upload, kind, error: message });
        } catch {
          // Persistence is best-effort; the session finding still shows the failure.
        }
      }
      toast.error(message);
    } finally {
      setRunning(false);
      onDone();
    }
  }

  return (
    <section className="min-w-0 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
            {kind === "ecg" ? <Activity className="h-4 w-4" /> : <ScanHeart className="h-4 w-4" />}
          </span>
          <div>
            <h3 className="font-semibold">{kind === "ecg" ? "ECG Assessment" : "ECHO Assessment"}</h3>

          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">{kind === "ecg" ? "ECG" : "ECHO"} assessment status: {running ? "In progress" : findingStatus(status, status === "completed" && !!(kind === "ecg" ? assessment.ecg_result : assessment.echo_result))}</span>
      </div>
      <div className="mt-4 border-t pt-4">
        {ecgImageOnly ? (
          <p className="text-sm text-muted-foreground">
            Your ECG image is available for professional review. Upload an ECG CSV file to request an automated assessment.
          </p>
        ) : !upload && status !== "completed" ? (
          <p className="text-sm text-muted-foreground">Pending — no file has been provided yet.</p>
        ) : (
          <PredictionFinding assessment={assessment} kind={kind} showTechnical={showTechnical} />
        )}
        {status === "completed" && browserSource && (
          <p className="mt-3 text-xs text-muted-foreground">Source: AI model prediction (browser-based analysis).</p>
        )}
        {upload && <p className="mt-3 break-words text-xs text-muted-foreground">Uploaded file: <span >{upload.filename}</span></p>}
        {localError && savedStatus === "completed" && <p role="alert" className="mt-3 text-sm text-destructive">Latest attempt failed. Previous result remains shown.</p>}
        {runnable && (
          <Button className="mt-4" size="sm" onClick={run} disabled={running}>
            {running ? "Analysing…" : status === "failed" ? "Retry prediction" : "Predict"}
          </Button>
        )}
      </div>
    </section>
  );
}

export function AssessmentResults({
  assessment,
  uploads,
  canRun,
  onRefresh,
  profile = null,
  health = null,
  symptoms = null,
  browserPredictions = [],
}: {
  assessment: Assessment;
  uploads: MedicalUpload[];
  canRun: boolean;
  onRefresh: () => void;
  profile?: Profile | null;
  health?: HealthProfile | null;
  symptoms?: SymptomReport | null;
  browserPredictions?: BrowserPrediction[];
}) {
  const { user } = useAuth();
  const { assessment: current, includesSessionResults, browserSources } = useAssessmentFindings(assessment, uploads, user?.id, browserPredictions);
  const find = (id: string | null) => uploads.find((u) => u.id === id);
  return (
    <div className="space-y-4">
      {nextSteps(symptoms).priority === "urgent" && <div role="alert" className="border-l-4 border-destructive bg-destructive/5 p-4 text-sm font-medium">{emergencyGuidance}</div>}
      <PatientAssessmentSummary assessment={current} profile={profile} health={health} symptoms={symptoms} section="details" />
      <div className="pt-4"><h2 className="text-xl font-semibold">AI-Based Predictions</h2><p className="mt-1 text-xs text-muted-foreground">{predictionSourceNote}</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ModelCard key={`ecg-${assessment.id}-${assessment.ecg_upload_id}`} kind="ecg" assessment={current} upload={find(assessment.ecg_upload_id)} canRun={canRun} showTechnical={!canRun} browserSource={browserSources.ecg} onDone={onRefresh} />
        <ModelCard key={`echo-${assessment.id}-${assessment.echo_upload_id}`} kind="echo" assessment={current} upload={find(assessment.echo_upload_id)} canRun={canRun} showTechnical={!canRun} browserSource={browserSources.echo} onDone={onRefresh} />
      </div>
      <OverallCardiacAssessment assessment={current} profile={profile} health={health} symptoms={symptoms} />
      <DiseaseRiskSection assessment={current} profile={profile} health={health} symptoms={symptoms} />
      <FollowUpCard assessment={current} profile={profile} health={health} symptoms={symptoms} emergency={emergencyGuidance} />
      {includesSessionResults && <p className="text-xs text-muted-foreground">{sessionNotice}</p>}
    </div>
  );
}
