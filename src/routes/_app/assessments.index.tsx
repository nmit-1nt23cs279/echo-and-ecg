import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate, listAssessments } from "@/lib/queries";

export const Route = createFileRoute("/_app/assessments/")({
  head: () => ({ meta: [{ title: "Assessments — CardioFusion" }, { name: "description", content: "Your assessment history." }, { property: "og:title", content: "Assessments — CardioFusion" }, { property: "og:description", content: "Your assessment history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AssessmentList,
});

function AssessmentList() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["assessments", user!.id], queryFn: () => listAssessments(user!.id) });
  return (
    <>
      <PageHeader title="Assessment history" action={<Button asChild><Link to="/assessments/new">New assessment</Link></Button>} />
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={(q.error as Error).message} />
      ) : q.data!.length === 0 ? (
        <EmptyState title="No assessments yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">ECG</th>
                <th className="px-4 py-3 font-medium">ECHO</th>
                <th className="px-4 py-3 font-medium">Fusion</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {q.data!.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3">{fmtDate(a.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.ecg_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.echo_status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">Not connected</td>
                  <td className="px-4 py-3">{a.status === "completed" ? "Completed" : `Draft · step ${a.current_step}`}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={a.status === "completed" ? "/assessments/$id" : "/assessments/$id/workflow"}
                      params={{ id: a.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.status === "completed" ? "View" : "Continue"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
