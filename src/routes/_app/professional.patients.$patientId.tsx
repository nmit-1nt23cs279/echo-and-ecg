import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/medical";
import { effectiveStatus, listBrowserPredictions } from "@/lib/browser-predictions";
import { ageFrom, fmtDate, getHealthProfile, getProfile, listAssessments, listSymptomReports } from "@/lib/queries";

export const Route = createFileRoute("/_app/professional/patients/$patientId")({
  head: () => ({ meta: [{ title: "Patient record — CardioFusion" }, { name: "description", content: "Authorised patient record." }, { property: "og:title", content: "Patient record — CardioFusion" }, { property: "og:description", content: "Authorised patient record." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PatientRecord,
});

const yn = (b: boolean | null | undefined) => (b === true ? "Yes" : b === false ? "No" : "Not stated");

function PatientRecord() {
  const { patientId } = Route.useParams();
  const profile = useQuery({ queryKey: ["p-profile", patientId], queryFn: () => getProfile(patientId) });
  const health = useQuery({ queryKey: ["p-health", patientId], queryFn: () => getHealthProfile(patientId) });
  const symptoms = useQuery({ queryKey: ["p-symptoms", patientId], queryFn: () => listSymptomReports(patientId) });
  const assessments = useQuery({ queryKey: ["p-assess", patientId], queryFn: () => listAssessments(patientId) });
  const predictions = useQuery({
    queryKey: ["p-predictions", patientId],
    queryFn: () => listBrowserPredictions((assessments.data ?? []).map((a) => a.id)),
    enabled: !!assessments.data,
  });

  if (profile.isLoading) return <LoadingState />;
  if (!profile.data) return <ErrorState message="You do not have access to this patient's records." />;
  const p = profile.data;
  const h = health.data;

  return (
    <>
      <PageHeader title={p.full_name || p.email} description={p.email} action={<Link to="/professional" className="text-sm text-primary hover:underline">All patients</Link>} />
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <h2 className="mb-3 font-semibold">Profile</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Age</dt><dd>{ageFrom(p.date_of_birth) ?? "—"}</dd>
              <dt className="text-muted-foreground">Sex</dt><dd>{p.sex?.replace(/_/g, " ") ?? "—"}</dd>
              <dt className="text-muted-foreground">Height / weight</dt><dd>{p.height_cm ?? "—"} cm / {p.weight_kg ?? "—"} kg</dd>
              <dt className="text-muted-foreground">Blood group</dt><dd>{p.blood_group ?? "—"}</dd>
            </dl>
          </Panel>
          <Panel>
            <h2 className="mb-3 font-semibold">Health history</h2>
            {h ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Hypertension</dt><dd>{yn(h.hypertension)}</dd>
                <dt className="text-muted-foreground">Diabetes</dt><dd>{yn(h.diabetes)}</dd>
                <dt className="text-muted-foreground">Smoking</dt><dd>{h.smoking_status ?? "—"}</dd>
                <dt className="text-muted-foreground">Cardiovascular</dt><dd>{h.cardiovascular_history ?? "—"}</dd>
                <dt className="text-muted-foreground">Medications</dt><dd>{h.medications ?? "—"}</dd>
                <dt className="text-muted-foreground">Allergies</dt><dd>{h.allergies ?? "—"}</dd>
                <dt className="text-muted-foreground">Family history</dt><dd>{h.family_history ?? "—"}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Not recorded.</p>
            )}
          </Panel>
        </div>
        <Panel>
          <h2 className="mb-3 font-semibold">Assessments</h2>
          {(assessments.data ?? []).length === 0 ? (
            <EmptyState title="No assessments" />
          ) : (
            <ul className="divide-y text-sm">
              {assessments.data!.map((a) => (
                <li key={a.id}>
                  <Link to="/assessments/$id" params={{ id: a.id }} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary">
                    <span>{fmtDate(a.created_at)}</span>
                    <span className="flex items-center gap-2 text-xs">ECG <StatusBadge status={effectiveStatus(a, "ecg", predictions.data ?? [])} /> ECHO <StatusBadge status={effectiveStatus(a, "echo", predictions.data ?? [])} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Symptom reports</h2>
          {(symptoms.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="divide-y text-sm">
              {symptoms.data!.map((s) => (
                <li key={s.id} className="py-2">
                  <span className="text-muted-foreground">{fmtDate(s.created_at)} · </span>
                  {s.symptoms.join(", ") || "—"} · severity {s.severity ?? "—"}/10
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
