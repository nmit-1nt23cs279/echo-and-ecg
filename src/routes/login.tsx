import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/medical";
import { supabase } from "@/lib/supabase";
import { signedInDestination } from "@/lib/account-navigation";
import type { Role } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Sign in — CardioFusion" },
      { name: "description", content: "Sign in to your CardioFusion account." },
      { property: "og:title", content: "Sign in — CardioFusion" },
      { property: "og:description", content: "Sign in to your CardioFusion account." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("Email not confirmed")
          ? "Please confirm your email first — check your inbox for the confirmation link."
          : error.message.includes("Invalid login")
            ? "Incorrect email or password."
            : error.message,
      );
      return;
    }
    if (!data.user) return;
    const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    navigate({ to: signedInDestination((rows ?? []).map((r) => r.role as Role)) });
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to CardioFusion.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <ErrorState message={error} />}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account? <Link to="/signup" className="text-primary hover:underline">Create one</Link>
        </p>
      </form>
    </AuthCard>
  );
}
