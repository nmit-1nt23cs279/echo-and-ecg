import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ErrorState, LoadingState } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/assessments/new")({
  head: () => ({ meta: [{ title: "New assessment — CardioFusion" }, { name: "description", content: "Start a new assessment." }, { property: "og:title", content: "New assessment — CardioFusion" }, { property: "og:description", content: "Start a new assessment." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewAssessment,
});

function NewAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !user) return;
    started.current = true;
    supabase
      .from("assessments")
      .insert({ user_id: user.id })
      .select("id")
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else navigate({ to: "/assessments/$id/workflow", params: { id: data.id }, replace: true });
      });
  }, [user, navigate]);

  return error ? <ErrorState message={`Could not start an assessment: ${error}`} /> : <LoadingState label="Starting assessment…" />;
}
