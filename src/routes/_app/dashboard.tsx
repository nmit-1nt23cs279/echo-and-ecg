import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DisclaimerNote,
  EmergencyNotice,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate, listAssessments, listSymptomReports } from "@/lib/queries";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CardioFusion" }, { name: "description", content: "Your CardioFusion overview." }, { property: "og:title", content: "Dashboard — CardioFusion" }, { property: "og:description", content: "Your CardioFusion overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const uid = user!.id;
  const assessments = useQuery({ queryKey: ["assessments", uid], queryFn: () => listAssessments(uid) });
  const symptoms = useQuery({ queryKey: ["symptoms", uid], queryFn: () => listSymptomReports(uid) });

  if (profile?.account_type === "medical_professional") return <Navigate to="/professional" replace />;

  const list = assessments.data ?? [];
  const completed = list.filter((a) => a.status === "completed").length;

  return (
    <>
      <PageHeader
        title={`Hello${profile?.full_name ? ", " + profile.full_name.split(" ")[0] : ""}`}
        description="Your assessments and health records."
        action={<Button asChild><Link to="/assessments/new">New assessment</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Assessments", assessments.isLoading ? "…" : list.length],
          ["Completed", assessments.isLoading ? "…" : completed],
          ["Symptom reports", symptoms.isLoading ? "…" : (symptoms.data?.length ?? 0)],
        ].map(([label, val]) => (
          <Panel key={label as string} className="p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{val}</p>
          </Panel>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent assessments</h2>
      {assessments.isLoading ? (
        <LoadingState />
      ) : assessments.error ? (
        <ErrorState message={(assessments.error as Error).message} />
      ) : list.length === 0 ? (
        <EmptyState title="No assessments yet">Start one to upload an ECG file or an echocardiogram image.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {list.slice(0, 5).map((a) => (
            <Link
              key={a.id}
              to="/assessments/$id"
              params={{ id: a.id }}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/50"
            >
              <span className="font-medium">{fmtDate(a.created_at)}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                ECG <StatusBadge status={a.ecg_status} /> ECHO <StatusBadge status={a.echo_status} />
                <span className="rounded-full bg-muted px-2 py-0.5">{a.status === "completed" ? "Completed" : "Draft"}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="font-semibold">Profile completion</h2>
          {(() => {
            const fields = [profile?.full_name, profile?.date_of_birth, profile?.sex, profile?.height_cm, profile?.weight_kg, profile?.blood_group];
            const pct = Math.round((fields.filter((f) => f !== null && f !== undefined && f !== "").length / fields.length) * 100);
            return (
              <>
                <div className="mt-3 h-1.5 rounded-full bg-border"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                <p className="mt-2 text-xs text-muted-foreground">{pct}% complete · <Link to="/profile" className="text-primary hover:underline">Update profile</Link></p>
              </>
            );
          })()}
        </Panel>
        <Panel>
          <h2 className="font-semibold">Recent reports</h2>
          {completed === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Reports appear here once an assessment is completed.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {list.filter((a) => a.status === "completed").slice(0, 3).map((a) => (
                <li key={a.id}><Link to="/assessments/$id" params={{ id: a.id }} className="font-mono text-primary hover:underline">CF-{a.id.slice(0, 8).toUpperCase()}</Link> <span className="text-xs text-muted-foreground">{fmtDate(a.completed_at)}</span></li>
              ))}
            </ul>
          )}
          <Link to="/reports" className="mt-3 inline-block text-xs text-primary hover:underline">All reports</Link>
        </Panel>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <EmergencyNotice compact />
        <DisclaimerNote />
      </div>
    </>
  );
}
