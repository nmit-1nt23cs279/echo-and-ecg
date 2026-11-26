import { createClient } from "@supabase/supabase-js";

// Publishable values only (safe in the browser — RLS protects data).
// Set VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in your host; the fallbacks
// point at the project owner's Supabase project so local previews work.
const SUPABASE_URL =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || "https://dtskgccxtvilrlzrdtfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
  "sb_publishable_zUiDtzdzS5OTcV248JqFeg_eHrQStc9";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
  },
});

export const SUPABASE_PUBLIC = { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };

export const MEDICAL_BUCKET = "medical-uploads";

/** Base URL of the independent Python model service (no secrets). Empty = not configured. */
export const MODEL_API_URL = ((import.meta.env["VITE_MODEL_API_URL"] as string | undefined) || "").replace(/\/+$/, "");
