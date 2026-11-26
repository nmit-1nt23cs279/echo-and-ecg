import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SymptomForm } from "@/components/forms";
import { EmergencyNotice, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate, listSymptomReports } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/symptoms")({
  head: () => ({ meta: [{ title: "Symptoms — CardioFusion" }, { name: "description", content: "Your symptom history." }, { property: "og:title", content: "Symptoms — CardioFusion" }, { property: "og:description", content: "Your symptom history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Symptoms,
});

function Symptoms() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["symptoms", user!.id], queryFn: () => listSymptomReports(user!.id) });

  async function remove(id: string) {
    if (!confirm("Delete this symptom report?")) return;
    const { error } = await supabase.from("symptom_reports").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["symptoms", user!.id] });
  }

  return (
    <>
      <PageHeader title="Symptom history" action={!adding && <Button onClick={() => setAdding(true)}>Record symptoms</Button>} />
      <div className="mb-6"><EmergencyNotice compact /></div>
      {adding && (
        <Panel className="mb-6">
          <SymptomForm
            onCreated={() => {
              setAdding(false);
              qc.invalidateQueries({ queryKey: ["symptoms", user!.id] });
            }}
          />
        </Panel>
      )}
      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={(q.error as Error).message} />
      ) : q.data!.length === 0 ? (
        <EmptyState title="No symptoms recorded" />
      ) : (
        <div className="space-y-3">
          {q.data!.map((r) => (
            <Panel key={r.id} className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                  <p className="mt-1 font-medium">{r.symptoms.length ? r.symptoms.join(", ") : "No symptoms listed"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Onset {r.onset ?? "—"} · Duration {r.duration ?? "—"} · Severity {r.severity ?? "—"}/10
                  </p>
                  {r.notes && <p className="mt-2 text-sm">{r.notes}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>Delete</Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
