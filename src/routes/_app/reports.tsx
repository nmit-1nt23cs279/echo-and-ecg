import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReportActions } from "@/components/report-actions";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate, listAssessments } from "@/lib/queries";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — CardioFusion" }, { name: "description", content: "Download assessment reports." }, { property: "og:title", content: "Reports — CardioFusion" }, { property: "og:description", content: "Download assessment reports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Reports,
});

function Reports() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["assessments", user!.id], queryFn: () => listAssessments(user!.id) });
  return (
    <>
      <PageHeader title="Reports" description="PDF reports are generated in your browser from your saved data." />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={(q.error as Error).message} />
      ) : q.data!.length === 0 ? (
        <EmptyState title="No reports yet">Complete an assessment to generate a report.</EmptyState>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {q.data!.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <Link to="/assessments/$id" params={{ id: a.id }} className="font-mono text-sm font-medium hover:text-primary">
                  CF-{a.id.slice(0, 8).toUpperCase()}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {fmtDate(a.created_at)} · {a.status === "completed" ? "Completed" : "Draft"} · ECG <StatusBadge status={a.ecg_status} /> ECHO{" "}
                  <StatusBadge status={a.echo_status} />
                </p>
              </div>
              <ReportActions assessmentId={a.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
