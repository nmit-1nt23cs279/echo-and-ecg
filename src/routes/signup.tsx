import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { AuthCard } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/medical";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { signedInDestination } from "@/lib/account-navigation";
import type { Role } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Create account — CardioFusion" },
      { name: "description", content: "Register as a patient or medical professional." },
      { property: "og:title", content: "Create account — CardioFusion" },
      { property: "og:description", content: "Register as a patient or medical professional." },
    ],
  }),
  component: Signup,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(200),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
    accountType: z.enum(["patient", "medical_professional"]),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
    accountType: "patient" as "patient" | "medical_professional",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        // The signup trigger accepts only patient/professional; admin is never a registration option.
        data: {
          full_name: parsed.data.fullName,
          account_type: parsed.data.accountType,
        },
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
      navigate({ to: signedInDestination((rows ?? []).map((r) => r.role as Role)) });
    } else setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a confirmation link to ${form.email}.`}>
        <p className="text-sm text-muted-foreground">
          Open the link to activate your account, then sign in.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" subtitle="Email and password only.">
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Account type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["patient", "Patient"],
                ["medical_professional", "Medical professional"],
              ] as const
            ).map(([v, label]) => (
              <Button
                type="button"
                key={v}
                variant="outline"
                onClick={() => setForm({ ...form, accountType: v })}
                aria-pressed={form.accountType === v}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  form.accountType === v ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="name" required value={form.fullName} onChange={set("fullName")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" required value={form.password} onChange={set("password")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput id="confirm" autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} />
          </div>
        </div>
        {error && <ErrorState message={error} />}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthCard>
  );
}
