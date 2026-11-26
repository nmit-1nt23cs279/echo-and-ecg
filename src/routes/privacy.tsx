import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/public-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Privacy — CardioFusion" },
      { name: "description", content: "How CardioFusion stores and protects your health data." },
      { property: "og:title", content: "Privacy — CardioFusion" },
      { property: "og:description", content: "How CardioFusion stores and protects your health data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl space-y-5 px-4 py-14 text-sm leading-relaxed text-foreground">
        <h1 className="text-3xl font-bold">Privacy</h1>
        <p>CardioFusion stores only what you enter or upload.</p>
        <h2 className="text-lg font-semibold">What is stored</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your account (email, name, account type) and optional profile details.</li>
          <li>Health history, symptom reports and assessments you create.</li>
          <li>ECG and echocardiogram files you upload, in a private storage bucket.</li>
          <li>Model outputs produced for your uploads.</li>
        </ul>
        <h2 className="text-lg font-semibold">Who can see it</h2>
        <p>
          Only you, by default. A medical professional can view your records only after
          you have explicitly granted them access. You can revoke access at any
          time from your profile. Files are never published through public links.
        </p>
        <h2 className="text-lg font-semibold">Processing</h2>
        <p>
          To run a model, your uploaded file is read by the separate CardioFusion model service, which writes the result
          back to your assessment. Reports are generated in your browser.
        </p>
        <h2 className="text-lg font-semibold">Deleting data</h2>
        <p>You can delete assessments and symptom reports yourself. Contact the project owner to delete your account.</p>
      </article>
    </PublicLayout>
  );
}
