import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { clearSessionFindings } from "./assessment-session";

export type Role = "patient" | "medical_professional" | "admin";
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  account_type: "patient" | "medical_professional";
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_group: string | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  const loadUserData = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p.data as Profile) ?? null);
    setRoles(((r.data ?? []) as { role: Role }[]).map((x) => x.role));
  }, []);

  useEffect(() => {
    let previousUser: string | undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (previousUser && previousUser !== s?.user.id) clearSessionFindings();
      previousUser = s?.user.id;
      setSession(s);
      // Defer DB calls out of the auth callback.
      setTimeout(() => {
        loadUserData(s?.user.id).finally(() => setLoading(false));
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadUserData(data.session?.user.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    refresh: () => loadUserData(session?.user.id),
    signOut: async () => {
      clearSessionFindings();
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
