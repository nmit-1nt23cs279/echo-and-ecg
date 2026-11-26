import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HealthForm, ProfileForm } from "@/components/forms";
import { ErrorState, LoadingState, PageHeader, Panel } from "@/components/medical";
import { useAuth } from "@/lib/auth";
import { fmtDate, getHealthProfile } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — CardioFusion" }, { name: "description", content: "Your profile and health information." }, { property: "og:title", content: "Profile — CardioFusion" }, { property: "og:description", content: "Your profile and health information." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = useAuth();
  const isPro = profile?.account_type === "medical_professional";
  const health = useQuery({ queryKey: ["health", user?.id ?? ""], queryFn: () => getHealthProfile(user?.id ?? ""), enabled: !isPro });

  return (
    <>
      <PageHeader title="Profile & health" description={user?.email ?? undefined} />
      <div className="space-y-6">
        <Panel>
          <h2 className="mb-4 font-semibold">Personal details</h2>
          <ProfileForm />
        </Panel>
        {isPro ? (
          <ProfessionalDetailsPanel />
        ) : (
          <>
            <Panel>
              <h2 className="mb-1 font-semibold">Health history</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Stored for your records and reports. It is not used as model input — the models were not trained on these fields.
              </p>
              {health.isLoading ? <LoadingState /> : health.error ? <ErrorState message={(health.error as Error).message} /> : <HealthForm initial={health.data ?? null} />}
            </Panel>
            <AccessGrantsPanel />
          </>
        )}
      </div>
    </>
  );
}

function AccessGrantsPanel() {
  const qc = useQueryClient();
  const grants = useQuery({
    queryKey: ["grants"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_access_grants");
      if (error) throw new Error(error.message);
      return data as { grant_id: string; full_name: string; email: string; granted_at: string }[];
    },
  });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function grant(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("grant_professional_access", { _email: email.trim() });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setEmail("");
    toast.success("Access granted");
    qc.invalidateQueries({ queryKey: ["grants"] });
  }
  async function revoke(id: string) {
    const { error } = await supabase.from("patient_access_grants").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Access revoked");
    qc.invalidateQueries({ queryKey: ["grants"] });
  }

  return (
    <Panel>
      <h2 className="mb-1 font-semibold">Professional access</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Let a medical professional view your profile, health history, symptoms, assessments and uploads.
      </p>
      <form onSubmit={grant} className="flex flex-wrap items-end gap-2">
        <div className="min-w-60 flex-1 space-y-1.5">
          <Label htmlFor="grant-email">Professional's account email</Label>
          <Input id="grant-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Granting…" : "Grant access"}</Button>
      </form>
      <div className="mt-5">
        {grants.isLoading ? (
          <LoadingState />
        ) : grants.error ? (
          <ErrorState message={(grants.error as Error).message} />
        ) : (grants.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No professional has access to your records.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {(grants.data ?? []).map((g) => (
              <li key={g.grant_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{g.full_name || g.email}</span>
                  <span className="ml-2 text-muted-foreground">{g.email} · since {fmtDate(g.granted_at)}</span>
                </span>
                <Button size="sm" variant="outline" onClick={() => revoke(g.grant_id)}>Revoke</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function ProfessionalDetailsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const req = useQuery({
    queryKey: ["pro-request", user?.id ?? ""],
    queryFn: async () => {
      const { data, error } = await supabase.from("professional_requests").select("*").eq("user_id", user?.id ?? "").maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; qualifications: string; registration_number: string | null; institution: string | null; status: string; review_note: string | null } | null;
    },
  });
  const [f, setF] = useState<{ qualifications: string; registration_number: string; institution: string } | null>(null);
  const data = req.data;
  const form = f ?? { qualifications: data?.qualifications ?? "", registration_number: data?.registration_number ?? "", institution: data?.institution ?? "" };

  async function save(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("professional_requests")
      .update({ qualifications: form.qualifications.trim(), registration_number: form.registration_number.trim() || null, institution: form.institution.trim() || null })
      .eq("user_id", user?.id ?? "");
    if (error) return void toast.error(error.message);
    toast.success("Professional details updated");
    qc.invalidateQueries({ queryKey: ["pro-request", user?.id ?? ""] });
  }

  return (
    <Panel>
      <h2 className="mb-1 font-semibold">Professional details</h2>
      {req.isLoading ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message="No additional professional details have been recorded." />
      ) : (
        <>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pr-q">Qualifications</Label>
                <Textarea id="pr-q" rows={3} value={form.qualifications} onChange={(e) => setF({ ...form, qualifications: e.target.value })} maxLength={2000} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-r">Registration number (optional)</Label>
                <Input id="pr-r" value={form.registration_number} onChange={(e) => setF({ ...form, registration_number: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr-i">Institution (optional)</Label>
                <Input id="pr-i" value={form.institution} onChange={(e) => setF({ ...form, institution: e.target.value })} maxLength={200} />
              </div>
              <div className="sm:col-span-2"><Button type="submit">Save details</Button></div>
            </form>
        </>
      )}
    </Panel>
  );
}
