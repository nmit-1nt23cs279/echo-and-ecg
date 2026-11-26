import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, FileText, History, KeyRound, Layers, Lock, ScanHeart } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";
import { HeroVisual } from "@/components/hero-visual";
import { Button } from "@/components/ui/button";
import { EmergencyNotice } from "@/components/medical";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CardioFusion — Cardiac Assessment Platform" },
      {
        name: "description",
        content: "ECG signal analysis and echocardiogram image assessment in one secure workflow, with transparent findings and reports.",
      },
      { property: "og:title", content: "CardioFusion — Cardiac Assessment Platform" },
      {
        property: "og:description",
        content: "ECG signal analysis and echocardiogram image assessment in one secure workflow, with transparent findings and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const modalities = [
  { icon: Activity, title: "ECG signal analysis", text: "A 1D convolutional model reads 140 numerical ECG features, scaled exactly as in training.", tag: "Independent model" },
  { icon: ScanHeart, title: "Echocardiogram image analysis", text: "A 2D convolutional model classifies a 224×224 echo frame into four dataset classes.", tag: "Independent model" },
  { icon: Layers, title: "CardioFusion Combined Assessment", text: "ECG and ECHO model findings are brought together in one consolidated assessment summary for review.", tag: "Combined summary" },
];

const steps = [
  ["Add patient information", "Profile, symptoms and relevant history."],
  ["Upload supported files", "ECG feature CSV and echocardiogram image."],
  ["Review model findings", "Each model's output and processing status."],
  ["Access the report", "Download a structured PDF report."],
];

function Landing() {
  return (
    <PublicLayout>
      <section id="overview" className="bg-surface-gradient">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary">CARDIAC ASSESSMENT PLATFORM</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-foreground md:text-5xl">A clearer view of cardiac health.</h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Bring ECG signal analysis and echocardiogram image assessment into one secure workflow, with transparent
              findings and accessible assessment reports.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/signup">Get Started</Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#platform">Explore the Platform</a></Button>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">MULTIMODAL ASSESSMENT</p>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">Two models, one workflow.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {modalities.map((m) => (
            <div key={m.title} className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <m.icon className="h-5 w-5 text-primary" />
                <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{m.tag}</span>
              </div>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary">HOW IT WORKS</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">From upload to report in four steps.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {steps.map(([t, d], i) => (
              <li key={t} className="border-t-2 border-primary/70 pt-4">
                <span className="font-mono text-xs text-primary">0{i + 1}</span>
                <h3 className="mt-1 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary">SECURE HEALTH RECORDS</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Your records stay yours.</h2>
          <ul className="mt-6 space-y-4 text-sm">
            {[
              [KeyRound, "Account-based access", "Every record is tied to your account and protected by row-level security."],
              [Lock, "Private file storage", "Uploads live in a private bucket and open only through short-lived links."],
              [History, "Assessment history", "Revisit previous assessments and share them only with professionals you authorise."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Lock;
              return (
                <li key={t as string} className="flex gap-3">
                  <I className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span><strong className="font-semibold">{t as string}.</strong> <span className="text-muted-foreground">{d as string}</span></span>
                </li>
              );
            })}
          </ul>
        </div>
        <div id="reports">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary">REPORTS</p>
          <div className="mt-4 rounded-xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b bg-secondary px-5 py-3">
              <span className="flex items-center gap-2 font-display text-sm font-bold"><FileText className="h-4 w-4 text-primary" /> CardioFusion report</span>
              <span className="rounded bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">SAMPLE DATA</span>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 px-5 py-4 text-sm">
              <dt className="text-muted-foreground">Reference</dt><dd className="font-mono">CF-SAMPLE01</dd>
              <dt className="text-muted-foreground">Patient</dt><dd>Sample Patient</dd>
              <dt className="text-muted-foreground">ECG model output</dt><dd className="font-mono">0.0000 (example)</dd>
              <dt className="text-muted-foreground">ECHO top class</dt><dd className="font-mono">example_class</dd>
              <dt className="text-muted-foreground">Combined Assessment</dt><dd>Consolidated findings</dd>
            </dl>
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">Illustrative layout only — not a real patient or result.</p>
          </div>
        </div>
      </section>

      <section id="limitations" className="mx-auto max-w-6xl space-y-3 px-4 pb-16">
        <EmergencyNotice />
        <p className="text-xs text-muted-foreground">
          CardioFusion is not a medical device and has not been clinically validated or approved by any regulator. Model
          findings are not diagnoses. Reported evaluation metrics and full limitations are on the{" "}
          <Link to="/disclaimer" className="text-primary hover:underline">medical disclaimer</Link> page.
        </p>
      </section>
    </PublicLayout>
  );
}
