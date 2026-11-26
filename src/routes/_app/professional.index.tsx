import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/professional/")({
  head: () => ({ meta: [{ title: "Professional — CardioFusion" }, { name: "description", content: "Authorised patient records." }, { property: "og:title", content: "Professional — CardioFusion" }, { property: "og:description", content: "Authorised patient records." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Professional,
});

function Professional() {
  const { roles, profile } = useAuth();
  const isProfessional = profile?.account_type === "medical_professional" || roles.includes("medical_professional");
  const patients = useQuery({
    queryKey: ["my-patients"],
    enabled: isProfessional,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_granted_patients");
      if (error) throw new Error(error.message);
      return data as { patient_id: string; full_name: string; email: string; granted_at: string }[];
    },
  });

  if (!isProfessional)
    return <ErrorState message="This area is for medical professional accounts." />;

  return (
    <>
      <PageHeader title="Professional dashboard" description="Only patients who granted you access appear here." />
      {patients.isLoading ? (
        <LoadingState />
      ) : patients.error ? (
        <ErrorState message={(patients.error as Error).message} />
      ) : (patients.data ?? []).length === 0 ? (
        <EmptyState title="No patients have granted you access">Patients grant access from their profile using your account email.</EmptyState>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {(patients.data ?? []).map((p) => (
            <Link
              key={p.patient_id}
              to="/professional/patients/$patientId"
              params={{ patientId: p.patient_id }}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/50"
            >
              <span className="font-medium">{p.full_name || p.email}</span>
              <span className="text-xs text-muted-foreground">{p.email} · access since {fmtDate(p.granted_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
