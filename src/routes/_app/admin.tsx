import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState, PageHeader, Panel } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { getModelHealth, modelApiConfigured } from "@/lib/model-api";
import { fmtDate } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — CardioFusion" }, { name: "description", content: "Administration." }, { property: "og:title", content: "Admin — CardioFusion" }, { property: "og:description", content: "Administration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Admin,
});

type Req = { id: string; user_id: string; qualifications: string; registration_number: string | null; institution: string | null; status: string; created_at: string };

function Admin() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw new Error(error.message);
      return data as Record<string, number>;
    },
  });
  const requests = useQuery({
    queryKey: ["admin-requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("professional_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (r.error) throw new Error(r.error.message);
      const names = new Map((p.data ?? []).map((x) => [x.id, x]));
      return (r.data as Req[]).map((x) => ({ ...x, person: names.get(x.user_id) }));
    },
  });
  const health = useQuery({ queryKey: ["model-health"], enabled: isAdmin && modelApiConfigured(), queryFn: getModelHealth, retry: false });

  if (!isAdmin) return <ErrorState message="Administrator privileges are required." />;

  return (
    <>
      <PageHeader title="Administration" />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stats.isLoading ? (
            <LoadingState />
          ) : stats.error ? (
            <ErrorState message={(stats.error as Error).message} />
          ) : (
            Object.entries(stats.data ?? {}).map(([k, v]) => (
              <Panel key={k} className="p-4 md:p-4">
                <p className="text-xs capitalize text-muted-foreground">{k.replace(/_/g, " ")}</p>
                <p className="font-display text-2xl font-bold">{v}</p>
              </Panel>
            ))
          )}
        </div>

        <Panel>
          <h2 className="mb-2 font-semibold">Model service</h2>
          {!modelApiConfigured() ? (
            <p className="text-sm text-muted-foreground">Not configured. Set VITE_MODEL_API_URL in your hosting dashboard.</p>
          ) : health.isLoading ? (
            <LoadingState label="Contacting model service (may be waking up)…" />
          ) : health.error ? (
            <ErrorState message={`Unreachable: ${(health.error as Error).message}`} />
          ) : (
            <p className="text-sm">
              Status <strong>{health.data?.status}</strong> · ECG model {health.data?.ecg_model_loaded ? "loaded" : "not loaded"} · ECHO model{" "}
              {health.data?.echo_model_loaded ? "loaded" : "not loaded"}
            </p>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-3 font-semibold">Professional accounts</h2>
          {requests.isLoading ? <LoadingState /> : requests.error ? <ErrorState message={(requests.error as Error).message} /> : (requests.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No professional accounts yet.</p> : (
            <ul className="divide-y text-sm">
              {(requests.data ?? []).map((r) => <li key={r.id} className="py-3">
                <p className="font-medium">{r.person?.full_name || r.person?.email}</p>
                <p className="text-xs text-muted-foreground">{r.person?.email} · joined {fmtDate(r.created_at)}</p>
                {r.qualifications && <p className="mt-1">{r.qualifications}</p>}
                {(r.registration_number || r.institution) && <p className="text-xs text-muted-foreground">{[r.registration_number,r.institution].filter(Boolean).join(" · ")}</p>}
              </li>)}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
