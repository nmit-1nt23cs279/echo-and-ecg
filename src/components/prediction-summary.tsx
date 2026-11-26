import { Activity, CircleAlert, CircleCheck, ClipboardList, HeartPulse, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/auth";
import type { Assessment, HealthProfile, SymptomReport } from "@/lib/types";
import { diseaseRiskAssessment, modelAssessment, overallCardiacAssessment, predictionSourceNote } from "@/lib/prediction-summary";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm leading-relaxed">{children}</dd></div>;
}
function List({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <ul className="list-disc space-y-1 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul> : <span className="text-muted-foreground">{empty}</span>;
}

/** ECG/ECHO assessment body. Raw scores appear only in the optional technical section. */
export function PredictionFinding({ assessment, kind, showTechnical = false }: { assessment: Assessment; kind: "ecg" | "echo"; showTechnical?: boolean }) {
  const m = modelAssessment(assessment, kind);
  return <div className="space-y-4">
    <div className="flex items-start gap-2">
      {m.available ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <CircleAlert className={`mt-0.5 h-5 w-5 shrink-0 ${m.failed ? "text-destructive" : "text-muted-foreground"}`} />}
      <div><p className="text-xs text-muted-foreground">Predicted condition</p><p className="text-base font-semibold">{m.title}</p></div>
    </div>
    <dl className="space-y-3">
      <Field label={`${kind === "ecg" ? "ECG" : "ECHO"} interpretation`}>{m.interpretation}</Field>
      {m.available && <>
        <Field label="Supporting findings"><List items={m.supporting} empty="None" /></Field>
        <Field label="Clinical significance">{m.significance}</Field>
        <Field label="Recommended next steps"><List items={m.nextSteps} empty="None" /></Field>
        <p className="text-xs text-muted-foreground">{m.limitation}</p>
      </>}
    </dl>
    {showTechnical && m.technical.length > 0 && <details className="border-t pt-3">
      <summary className="cursor-pointer text-xs font-medium text-primary">Technical information (for professionals)</summary>
      <dl className="mt-3 space-y-2 text-xs">{m.technical.map((r) => <div key={r.label} className="flex flex-wrap justify-between gap-2"><dt>{r.label}</dt><dd className="font-mono">{r.value}</dd></div>)}</dl>
      <p className="mt-2 text-xs text-muted-foreground">Model outputs are not calibrated medical probabilities.</p>
    </details>}
  </div>;
}

export function OverallCardiacAssessment({ assessment, profile, health, symptoms }: { assessment: Assessment; profile: Profile | null; health: HealthProfile | null; symptoms: SymptomReport | null }) {
  const o = overallCardiacAssessment(assessment, profile, symptoms, health);
  return <section className="rounded-lg border border-primary/30 bg-card p-5" aria-labelledby="overall-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="overall-heading" className="flex items-center gap-2 text-xl font-semibold"><Activity className="h-5 w-5 text-primary" />Overall Cardiac Assessment</h2>
      <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">{o.status}</span>
    </div>
    <p className="mt-4 text-sm leading-relaxed">{o.overview}</p>
    <dl className="mt-5 grid gap-5 md:grid-cols-2">
      <Field label="ECG interpretation">{o.ecg.available ? <><strong>{o.ecg.title}.</strong> {o.ecg.significance}</> : o.ecg.interpretation}</Field>
      <Field label="ECHO interpretation">{o.echo.available ? <><strong>{o.echo.title}.</strong> {o.echo.significance}</> : o.echo.interpretation}</Field>
      <Field label="Possible conditions for further evaluation">
        {o.possibleConditions.length ? <ul className="list-disc space-y-1 pl-5">{o.possibleConditions.map((c) => <li key={c.name}>{c.name} <span className="text-xs text-muted-foreground">· {c.source}</span></li>)}</ul>
          : <span className="text-muted-foreground">{o.completed ? "None identified by the models." : "Available once the analyses are complete."}</span>}
      </Field>
      <Field label="Supporting findings"><List items={o.supporting} empty="No supporting findings recorded yet." /></Field>
    </dl>
    <div className="mt-5 border-t pt-4"><Field label="Recommended next steps"><List items={o.nextSteps} empty="None" /></Field></div>
    <p className="mt-4 text-xs text-muted-foreground">{predictionSourceNote} ECG and ECHO results come from two separate models and are not averaged into a single score.</p>
  </section>;
}

export function DiseaseRiskSection({ assessment, profile, health, symptoms }: { assessment: Assessment; profile: Profile | null; health: HealthProfile | null; symptoms: SymptomReport | null }) {
  const r = diseaseRiskAssessment(assessment, profile, symptoms, health);
  return <section className="rounded-lg border bg-accent/40 p-5">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><HeartPulse className="h-5 w-5 text-primary" />Disease-Risk Assessment</h2>
    <p className="mt-1 text-sm text-muted-foreground">Assessment status: {r.status}</p>
    <dl className="mt-4 grid gap-5 md:grid-cols-2">
      <Field label="Potential conditions for further evaluation"><List items={r.possibleConditions.map((c) => c.name)} empty="None identified yet." /></Field>
      <Field label="Supporting findings (risk factors)"><List items={r.riskFactors} empty="No risk factors recorded in your health profile." /></Field>
      <Field label="Reported symptoms"><List items={r.symptoms} empty="No symptoms reported." /></Field>
      <Field label="Recommended follow-up">{r.followUp}</Field>
    </dl>
  </section>;
}

export function FollowUpCard({ assessment, profile, health, symptoms, emergency }: { assessment: Assessment; profile: Profile | null; health: HealthProfile | null; symptoms: SymptomReport | null; emergency: string }) {
  const o = overallCardiacAssessment(assessment, profile, symptoms, health);
  return <section className="rounded-lg border bg-card p-5">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Stethoscope className="h-5 w-5 text-primary" />What should you do next?</h2>
    <p className="mt-3 text-sm leading-relaxed">{o.nextSteps[0]}</p>
    <p className="mt-3 flex gap-2 border-l-4 border-destructive bg-destructive/5 p-3 text-sm"><ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{emergency}</p>
  </section>;
}
