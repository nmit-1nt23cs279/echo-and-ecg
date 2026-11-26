import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public-layout";
import { EmergencyNotice } from "@/components/medical";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Medical disclaimer — CardioFusion" },
      { name: "description", content: "Limitations of CardioFusion model findings." },
      { property: "og:title", content: "Medical disclaimer — CardioFusion" },
      { property: "og:description", content: "Limitations of CardioFusion model findings." },
    ],
  }),
  component: Disclaimer,
});

function Disclaimer() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl space-y-5 px-4 py-14 text-sm leading-relaxed">
        <h1 className="text-3xl font-bold">Medical disclaimer</h1>
        <EmergencyNotice />
        <p>
          CardioFusion is <strong>not a medical device</strong>, has not been clinically validated, and must not be used to diagnose, treat or rule out any
          condition. It does not prescribe medication.
        </p>
        <h2 className="text-lg font-semibold">About the models</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>ECG: 1D CNN on 140 numerical features. Notebook metrics: accuracy 98.90%, precision 99.65%, recall 98.46%, F1 99.05%.</li>
          <li>ECHO: 2D CNN on 224×224 images, four dataset classes. Notebook metrics: accuracy 91.27%, precision 92.10%, recall 91.27%, F1 91.43%.</li>
          <li>These are reported evaluation metrics on the training datasets, not independently validated clinical performance.</li>
          <li>ECHO outputs are dataset class labels, not confirmed diagnoses.</li>
          <li>
            No fusion model is connected. The two datasets share no patients, so CardioFusion does not produce a
            combined risk score.
          </li>
        </ul>
        <p>Always consult a qualified clinician about symptoms or results.</p>
      </article>
    </PublicLayout>
  );
}
