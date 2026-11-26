import type { Profile } from "@/lib/auth";
import type { Assessment, HealthProfile, SymptomReport } from "@/lib/types";
import { patientDetails, symptomDetails, type DetailRow } from "@/lib/assessment-findings";

function Details({ rows }: { rows: DetailRow[] }) {
  return <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">{rows.map((row) => <div key={row.label} className="min-w-0"><dt className="text-xs text-muted-foreground">{row.label}</dt><dd className="mt-1 break-words text-sm font-medium">{row.value}</dd></div>)}</dl>;
}

export function PatientAssessmentSummary({ assessment, profile, health, symptoms, section }: {
  assessment: Assessment; profile: Profile | null; health: HealthProfile | null; symptoms: SymptomReport | null;
  section: "details";
}) {
  if (section === "details") {
    const rows = symptomDetails(symptoms, health);
    return <>
      <section className="py-5"><h2 className="text-lg font-semibold">Patient Information</h2><Details rows={patientDetails(profile, assessment)} /></section>
      <section className="border-t py-5"><h2 className="text-lg font-semibold">Reported Symptoms</h2>{rows.length ? <Details rows={rows} /> : <p className="mt-3 text-sm text-muted-foreground">No symptoms or relevant history have been provided for this assessment.</p>}</section>
    </>;
  }
  return null;
}