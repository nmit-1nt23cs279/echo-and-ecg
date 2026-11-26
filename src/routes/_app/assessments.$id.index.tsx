import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AssessmentResults } from "@/components/results";
import { ReportActions } from "@/components/report-actions";
import { ProfessionalReviewEditor, ProfessionalReviewView } from "@/components/professional-review";
import { ErrorState, LoadingState, PageHeader, Panel } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { assessmentReference } from "@/lib/assessment-findings";
import { getBrowserPredictions } from "@/lib/browser-predictions";
import { fmtDate, getAssessment, getHealthProfile, getProfessionalReviews, getProfile, getSymptomReport, getUploads } from "@/lib/queries";
import { signedUrl } from "@/lib/upload";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/assessments/$id/")({
  head: () => ({ meta: [{ title: "Assessment results — CardioFusion" }, { name: "description", content: "Assessment results." }, { property: "og:title", content: "Assessment results — CardioFusion" }, { property: "og:description", content: "Assessment results." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const a = useQuery({ queryKey: ["assessment", id], queryFn: () => getAssessment(id) });
  const uploads = useQuery({ queryKey: ["uploads", id], queryFn: () => getUploads(id) });
  const symptom = useQuery({
    queryKey: ["symptom", a.data?.symptom_report_id],
    queryFn: () => getSymptomReport(a.data?.symptom_report_id ?? null),
    enabled: !!a.data,
  });

  const patient = useQuery({ queryKey: ["profile", a.data?.user_id], queryFn: () => getProfile(a.data?.user_id ?? ""), enabled: !!a.data?.user_id });
  const health = useQuery({ queryKey: ["health", a.data?.user_id], queryFn: () => getHealthProfile(a.data?.user_id ?? ""), enabled: !!a.data?.user_id });
  const predictions = useQuery({ queryKey: ["browser-predictions", id], queryFn: () => getBrowserPredictions(id) });
  const reviews = useQuery({ queryKey: ["professional-reviews", id], queryFn: () => getProfessionalReviews(id) });

  if (a.isLoading) return <LoadingState />;
  if (a.error) return <ErrorState message={(a.error as Error).message} />;
  const asmt = a.data;
  if (!asmt || !user) return <ErrorState message="Assessment unavailable. Please sign in and try again." />;
  const isOwner = asmt.user_id === user.id;
  const myReview = (reviews.data ?? []).find((r) => r.professional_id === user.id) ?? null;
  const completedReview = (reviews.data ?? []).find((r) => r.status === "completed") ?? null;
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["assessment", id] });
    qc.invalidateQueries({ queryKey: ["browser-predictions", id] });
  };

  async function open(path: string) {
    try {
      window.open(await signedUrl(path), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove() {
    if (!confirm("Delete this assessment and its uploaded files?")) return;
    const paths = (uploads.data ?? []).map((u) => u.storage_path);
    if (paths.length) await supabase.storage.from("medical-uploads").remove(paths);
    const { error } = await supabase.from("assessments").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["assessments", user?.id] });
    navigate({ to: "/assessments" });
  }

  return (
    <>
      <PageHeader
        title="Assessment results"
        description={`Reference ${assessmentReference(asmt)} · ${fmtDate(asmt.created_at)} · ${asmt.status === "completed" ? "Completed " + fmtDate(asmt.completed_at) : "Draft"}`}
        action={<ReportActions assessmentId={asmt.id} size="default" />}
      />
      <div className="space-y-6">
        <AssessmentResults
          assessment={asmt}
          profile={patient.data ?? null}
          health={health.data ?? null}
          symptoms={symptom.data ?? null}
          uploads={uploads.data ?? []}
          canRun={isOwner}
          onRefresh={refreshAll}
          browserPredictions={predictions.data ?? []}
        />
        {!isOwner && (
          <ProfessionalReviewEditor
            assessmentId={asmt.id}
            professionalId={user.id}
            review={myReview}
            onSaved={() => qc.invalidateQueries({ queryKey: ["professional-reviews", id] })}
          />
        )}
        {isOwner && completedReview && <ProfessionalReviewView review={completedReview} />}
        {isOwner && !completedReview && (
          <p className="text-xs text-muted-foreground">
            Professional review pending. The automated AI assessment above is available immediately and does not wait for a professional review.
          </p>
        )}
          <Panel>
            <h2 className="mb-3 font-semibold">Uploaded files</h2>
            {(uploads.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No files uploaded.</p>
            ) : (
              <ul className="divide-y text-sm">
                {(uploads.data ?? []).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs">{u.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        {u.kind.replace("_", " ")} · {(u.size_bytes / 1024).toFixed(0)} KB
                        {[asmt.ecg_upload_id, asmt.echo_upload_id].includes(u.id) ? " · in use" : " · replaced"}
                      </span>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => open(u.storage_path)}>Open</Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

        {isOwner && (
          <div className="flex flex-wrap justify-between gap-2">
            <Button asChild variant="outline"><Link to="/assessments">Assessment history</Link></Button>
            <div className="flex gap-2">
              {asmt.status !== "completed" && (
                <Button asChild variant="outline"><Link to="/assessments/$id/workflow" params={{ id }}>Continue editing</Link></Button>
              )}
              <Button variant="ghost" onClick={remove}>Delete</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
