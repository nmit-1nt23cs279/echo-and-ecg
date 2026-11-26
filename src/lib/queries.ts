import { supabase } from "./supabase";
import type { Assessment, HealthProfile, MedicalUpload, SymptomReport } from "./types";

function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function listAssessments(userId: string) {
  return unwrap<Assessment[]>(
    await supabase.from("assessments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  );
}

export async function getAssessment(id: string) {
  const a = unwrap<Assessment | null>(await supabase.from("assessments").select("*").eq("id", id).maybeSingle());
  if (!a) throw new Error("Assessment not found or you do not have access to it.");
  return a;
}

export async function getUploads(assessmentId: string) {
  return unwrap<MedicalUpload[]>(
    await supabase.from("medical_uploads").select("*").eq("assessment_id", assessmentId).order("created_at"),
  );
}

export async function getSymptomReport(id: string | null) {
  if (!id) return null;
  return unwrap<SymptomReport | null>(await supabase.from("symptom_reports").select("*").eq("id", id).maybeSingle());
}

export async function listSymptomReports(userId: string) {
  return unwrap<SymptomReport[]>(
    await supabase.from("symptom_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  );
}

export async function getHealthProfile(userId: string) {
  return unwrap<HealthProfile | null>(
    await supabase.from("health_profiles").select("*").eq("user_id", userId).maybeSingle(),
  );
}

export async function getProfile(userId: string) {
  return unwrap<import("./auth").Profile | null>(
    await supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  );
}

export async function getProfessionalReviews(assessmentId: string) {
  return unwrap<import("./types").ProfessionalReview[]>(
    await supabase.from("professional_reviews").select("*").eq("assessment_id", assessmentId).order("updated_at", { ascending: false }),
  );
}

export function ageFrom(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
