import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthForm, ProfileForm, SymptomForm } from "@/components/forms";
import { DropZone } from "@/components/dropzone";
import { Stepper } from "@/components/stepper";
import { AssessmentResults } from "@/components/results";
import { ReportActions } from "@/components/report-actions";
import { EmergencyNotice, ErrorState, LoadingState, PageHeader, Panel } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate, getAssessment, getHealthProfile, getSymptomReport, getUploads } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { uploadMedicalFile } from "@/lib/upload";
import { parseEcgCsv, validateUploadFile, type UploadKind } from "@/lib/validation";
import type { Assessment } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/assessments/$id/workflow")({
  head: () => ({ meta: [{ title: "Assessment — CardioFusion" }, { name: "description", content: "Assessment workflow." }, { property: "og:title", content: "Assessment — CardioFusion" }, { property: "og:description", content: "Assessment workflow." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Workflow,
});

const STEPS = ["Patient details", "Symptoms & history", "ECG input", "ECHO input", "Results & report"];

function Workflow() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const a = useQuery({ queryKey: ["assessment", id], queryFn: () => getAssessment(id) });
  const uploads = useQuery({ queryKey: ["uploads", id], queryFn: () => getUploads(id) });
  const symptom = useQuery({
    queryKey: ["symptom", a.data?.symptom_report_id],
    queryFn: () => getSymptomReport(a.data?.symptom_report_id ?? null),
    enabled: !!a.data,
  });
  const health = useQuery({ queryKey: ["health", user?.id], queryFn: () => getHealthProfile(user?.id ?? ""), enabled: !!user });
  const [step, setStep] = useState<number | null>(null);

  if (a.isLoading) return <LoadingState />;
  if (a.error) return <ErrorState message={(a.error as Error).message} />;
  const asmt = a.data;
  if (!asmt || !user) return <ErrorState message="Assessment unavailable. Please sign in and try again." />;
  if (asmt.user_id !== user.id) return <ErrorState message="Only the owner can edit this assessment." />;
  const current = Math.min(step ?? asmt.current_step, 5);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["assessment", id] });
    qc.invalidateQueries({ queryKey: ["uploads", id] });
    qc.invalidateQueries({ queryKey: ["assessments", user?.id ?? ""] });
  };

  async function patch(values: Partial<Assessment>) {
    const { error } = await supabase.from("assessments").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    refresh();
    return true;
  }

  async function go(n: number) {
    setStep(n);
    if (asmt && n > asmt.current_step) await patch({ current_step: n });
  }

  const completed = (n: number) =>
    n === 1
      ? !!profile?.date_of_birth
      : n === 2
        ? !!asmt.symptom_report_id
        : n === 3
          ? !!asmt.ecg_upload_id
          : n === 4
            ? !!asmt.echo_upload_id
            : asmt.status === "completed";

  return (
    <>
      <PageHeader
        title="Assessment"
        description={`Reference CF-${asmt.id.slice(0, 8).toUpperCase()} · started ${fmtDate(asmt.created_at)}`}
        action={<Link to="/assessments" className="text-sm text-primary hover:underline">All assessments</Link>}
      />
      <div className="mb-6">
        <Stepper steps={STEPS} current={current} completed={completed} onSelect={(n) => go(n)} />
      </div>

      {current === 1 && (
        <Panel>
          <h2 className="mb-1 font-semibold">Patient details</h2>
          <p className="mb-4 text-sm text-muted-foreground">These details appear on your report. They are not used as model inputs.</p>
          <ProfileForm submitLabel="Save and continue" onSaved={() => go(2)} />
        </Panel>
      )}

      {current === 2 && (
        <div className="space-y-6">
          <EmergencyNotice compact />
          <Panel>
            <h2 className="mb-4 font-semibold">Current symptoms</h2>
            {symptom.data ? (
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Recorded {fmtDate(symptom.data.created_at)}: </span>
                  {symptom.data.symptoms.join(", ") || "No symptoms listed"} · severity {symptom.data.severity ?? "—"}/10
                </p>
                <Button variant="outline" size="sm" onClick={() => patch({ symptom_report_id: null })}>Record new symptoms instead</Button>
              </div>
            ) : (
              <SymptomForm
                onCreated={async (r) => {
                  await patch({ symptom_report_id: r.id });
                  qc.invalidateQueries({ queryKey: ["symptoms", user?.id ?? ""] });
                }}
              />
            )}
          </Panel>
          <Panel>
            <h2 className="mb-4 font-semibold">Health history</h2>
            {health.isLoading ? <LoadingState /> : <HealthForm initial={health.data ?? null} />}
          </Panel>
          <StepNav onBack={() => go(1)} onNext={() => go(3)} />
        </div>
      )}

      {current === 3 && (
        <div className="space-y-6">
          <EcgStep asmt={asmt} userId={user?.id ?? ""} uploads={uploads.data ?? []} patch={patch} />
          <StepNav onBack={() => go(2)} onNext={() => go(4)} nextLabel={asmt.ecg_upload_id ? "Continue" : "Skip ECG"} />
        </div>
      )}

      {current === 4 && (
        <div className="space-y-6">
          <UploadPanel
            title="Echocardiogram image"
            icon={<ImageIcon className="h-4 w-4" />}
            description="RGB echocardiogram frame. It is resized to 224×224 for prediction."
            kind="echo_image"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            hint="JPG, JPEG or PNG · max 10 MB"
            asmt={asmt}
            userId={user?.id ?? ""}
            current={(uploads.data ?? []).find((u) => u.id === asmt.echo_upload_id)?.filename}
            onUploaded={(upId) => patch({ echo_upload_id: upId, echo_status: "pending" })}
          />
          <StepNav onBack={() => go(3)} onNext={() => go(5)} nextLabel={asmt.echo_upload_id ? "Continue" : "Skip ECHO"} />
        </div>
      )}

      {current === 5 && (
        <div className="space-y-6">
          {uploads.isLoading ? <LoadingState /> : <AssessmentResults assessment={asmt} profile={profile} health={health.data ?? null} symptoms={symptom.data ?? null} uploads={uploads.data ?? []} canRun onRefresh={refresh} />}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Assessment report</h2>
                <p className="text-sm text-muted-foreground">
                  {!asmt.ecg_upload_id || !asmt.echo_upload_id
                    ? "Partial assessment — missing inputs are marked as not provided in the report."
                    : "The report includes recorded details and available model findings from this assessment."}
                </p>
              </div>
              <ReportActions assessmentId={asmt.id} />
            </div>
            {asmt.status !== "completed" && (
              <Button
                className="mt-4"
                variant="outline"
                onClick={async () => {
                  if (await patch({ status: "completed", completed_at: new Date().toISOString() })) {
                    toast.success("Assessment completed");
                    navigate({ to: "/assessments/$id", params: { id } });
                  }
                }}
              >
                Mark assessment complete
              </Button>
            )}
          </Panel>
          <StepNav onBack={() => go(4)} />
        </div>
      )}
    </>
  );
}

function StepNav({ onBack, onNext, nextLabel = "Continue" }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="flex justify-between">
      {onBack ? <Button variant="ghost" onClick={onBack}>Back</Button> : <span />}
      {onNext && <Button onClick={onNext}>{nextLabel}</Button>}
    </div>
  );
}

function EcgStep({
  asmt,
  userId,
  uploads,
  patch,
}: {
  asmt: Assessment;
  userId: string;
  uploads: { id: string; filename: string; kind: string }[];
  patch: (v: Partial<Assessment>) => Promise<boolean>;
}) {
  const linked = uploads.find((u) => u.id === asmt.ecg_upload_id);
  const [mode, setMode] = useState<"csv" | "image">(linked?.kind === "ecg_image" ? "image" : "csv");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-card p-1" role="tablist">
        {(
          [
            ["csv", "Numerical CSV (analysed)"],
            ["image", "ECG image (stored only)"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              mode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "csv" ? (
        <UploadPanel
          title="ECG feature file"
          icon={<FileSpreadsheet className="h-4 w-4" />}
          description="One recording: exactly 140 numeric values in training order, in a single row. An optional header row is allowed. Values are never padded, truncated or reordered."
          kind="ecg_csv"
          accept=".csv,text/csv"
          hint="CSV · 140 values · max 10 MB"
          asmt={asmt}
          userId={userId}
          current={linked?.kind === "ecg_csv" ? linked.filename : undefined}
          onUploaded={(upId) => patch({ ecg_upload_id: upId, ecg_status: "pending" })}
        />
      ) : (
        <UploadPanel
          title="ECG image"
          icon={<ImageIcon className="h-4 w-4" />}
          description="Stored privately for review by a professional you authorise. The ECG model does not analyse images."
          kind="ecg_image"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          hint="JPG, JPEG or PNG · max 10 MB"
          asmt={asmt}
          userId={userId}
          current={linked?.kind === "ecg_image" ? linked.filename : undefined}
          onUploaded={(upId) => patch({ ecg_upload_id: upId, ecg_status: "not_provided" })}
        />
      )}
    </div>
  );
}

function UploadPanel(props: {
  title: string;
  icon: React.ReactNode;
  description: string;
  kind: UploadKind;
  accept: string;
  hint: string;
  asmt: Assessment;
  userId: string;
  current?: string | undefined;
  onUploaded: (uploadId: string) => Promise<boolean>;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setError(null);
    const invalid = validateUploadFile(file, props.kind);
    if (invalid) return void setError(invalid);
    if (props.kind === "ecg_csv") {
      const parsed = parseEcgCsv(await file.text());
      if (!parsed.ok) return void setError(parsed.error);
    }
    setProgress(0);
    try {
      const row = await uploadMedicalFile({ file, kind: props.kind, userId: props.userId, assessmentId: props.asmt.id, onProgress: setProgress });
      await props.onUploaded(row.id);
      toast.success("File uploaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">{props.icon}</span>
        <div>
          <h2 className="font-semibold">{props.title}</h2>
          <p className="text-sm text-muted-foreground">{props.description}</p>
        </div>
      </div>
      {props.current && (
        <p className="mb-3 rounded-md bg-secondary px-3 py-2 text-sm">
          Current file: <span className="font-mono">{props.current}</span> — uploading another replaces it in this assessment.
        </p>
      )}
      <DropZone accept={props.accept} hint={props.hint} progress={progress} disabled={progress !== null} onFile={handle} />
      {error && <div className="mt-3"><ErrorState message={error} /></div>}
    </Panel>
  );
}
