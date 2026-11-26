import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, selectClass } from "@/components/medical";
import { supabase } from "@/lib/supabase";
import { useAuth, type Profile } from "@/lib/auth";
import { SYMPTOM_OPTIONS, type HealthProfile, type SymptomReport } from "@/lib/types";
import { cn } from "@/lib/utils";

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function ProfileForm({ onSaved, submitLabel = "Save profile" }: { onSaved?: () => void; submitLabel?: string }) {
  const { user, profile, refresh } = useAuth();
  const [f, setF] = useState({ full_name: "", date_of_birth: "", sex: "", height_cm: "", weight_kg: "", blood_group: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setF({
      full_name: profile.full_name ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      sex: profile.sex ?? "",
      height_cm: profile.height_cm?.toString() ?? "",
      weight_kg: profile.weight_kg?.toString() ?? "",
      blood_group: profile.blood_group ?? "",
    });
  }, [profile]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (f.full_name.trim().length < 2) return void setError("Enter your full name.");
    if (f.date_of_birth && new Date(f.date_of_birth) > new Date()) return void setError("Date of birth cannot be in the future.");
    const h = numOrNull(f.height_cm);
    const w = numOrNull(f.weight_kg);
    if (h !== null && (!Number.isFinite(h) || h < 30 || h > 272)) return void setError("Height must be between 30 and 272 cm.");
    if (w !== null && (!Number.isFinite(w) || w < 1 || w > 500)) return void setError("Weight must be between 1 and 500 kg.");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: f.full_name.trim(),
        date_of_birth: f.date_of_birth || null,
        sex: f.sex || null,
        height_cm: h,
        weight_kg: w,
        blood_group: f.blood_group || null,
      } satisfies Partial<Profile>)
      .eq("id", user!.id);
    setBusy(false);
    if (error) return void setError(error.message);
    await refresh();
    toast.success("Profile saved");
    onSaved?.();
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="pf-name">Full name</Label>
        <Input id="pf-name" value={f.full_name} onChange={set("full_name")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-dob">Date of birth</Label>
        <Input id="pf-dob" type="date" value={f.date_of_birth} onChange={set("date_of_birth")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-sex">Sex (optional)</Label>
        <select id="pf-sex" className={selectClass} value={f.sex} onChange={set("sex")}>
          <option value="">—</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-h">Height, cm (optional)</Label>
        <Input id="pf-h" inputMode="decimal" value={f.height_cm} onChange={set("height_cm")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-w">Weight, kg (optional)</Label>
        <Input id="pf-w" inputMode="decimal" value={f.weight_kg} onChange={set("weight_kg")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-bg">Blood group (optional)</Label>
        <select id="pf-bg" className={selectClass} value={f.blood_group} onChange={set("blood_group")}>
          <option value="">—</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>
      {error && <div className="sm:col-span-2"><ErrorState message={error} /></div>}
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button></div>
    </form>
  );
}

type Tri = "" | "yes" | "no";
const toTri = (b: boolean | null | undefined): Tri => (b === true ? "yes" : b === false ? "no" : "");
const fromTri = (t: Tri) => (t === "yes" ? true : t === "no" ? false : null);

export function HealthForm({ initial, onSaved }: { initial: HealthProfile | null; onSaved?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    medical_history: "",
    hypertension: "" as Tri,
    diabetes: "" as Tri,
    cardiovascular_history: "",
    medications: "",
    allergies: "",
    smoking_status: "",
    family_history: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    setF({
      medical_history: initial.medical_history ?? "",
      hypertension: toTri(initial.hypertension),
      diabetes: toTri(initial.diabetes),
      cardiovascular_history: initial.cardiovascular_history ?? "",
      medications: initial.medications ?? "",
      allergies: initial.allergies ?? "",
      smoking_status: initial.smoking_status ?? "",
      family_history: initial.family_history ?? "",
    });
  }, [initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("health_profiles").upsert({
      user_id: user!.id,
      medical_history: f.medical_history.trim() || null,
      hypertension: fromTri(f.hypertension),
      diabetes: fromTri(f.diabetes),
      cardiovascular_history: f.cardiovascular_history.trim() || null,
      medications: f.medications.trim() || null,
      allergies: f.allergies.trim() || null,
      smoking_status: (f.smoking_status || null) as HealthProfile["smoking_status"],
      family_history: f.family_history.trim() || null,
    });
    setBusy(false);
    if (error) return void setError(error.message);
    await qc.invalidateQueries({ queryKey: ["health", user!.id] });
    toast.success("Health history saved");
    onSaved?.();
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value as never });
  const tri = (k: "hypertension" | "diabetes", label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`hf-${k}`}>{label}</Label>
      <select id={`hf-${k}`} className={selectClass} value={f[k]} onChange={set(k)}>
        <option value="">Not stated</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  );
  const area = (k: keyof typeof f, label: string) => (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={`hf-${k}`}>{label}</Label>
      <Textarea id={`hf-${k}`} rows={2} value={f[k] as string} onChange={set(k)} maxLength={2000} />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {tri("hypertension", "Hypertension")}
      {tri("diabetes", "Diabetes")}
      <div className="space-y-1.5">
        <Label htmlFor="hf-smoke">Smoking status</Label>
        <select id="hf-smoke" className={selectClass} value={f.smoking_status} onChange={set("smoking_status")}>
          <option value="">Not stated</option>
          <option value="never">Never</option>
          <option value="former">Former</option>
          <option value="current">Current</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
      {area("cardiovascular_history", "Known cardiovascular history")}
      {area("medical_history", "Other relevant medical history")}
      {area("medications", "Current medications")}
      {area("allergies", "Allergies")}
      {area("family_history", "Family history")}
      {error && <div className="sm:col-span-2"><ErrorState message={error} /></div>}
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save health history"}</Button></div>
    </form>
  );
}

export function SymptomForm({ onCreated }: { onCreated: (r: SymptomReport) => void }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [onset, setOnset] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const symptoms = [...selected, ...other.split(",").map((s) => s.trim()).filter(Boolean)].map((s) => s.slice(0, 100));
    if (symptoms.length === 0 && !notes.trim()) return void setError("Select at least one symptom or add a note (you can write “none”).");
    if (onset && new Date(onset) > new Date()) return void setError("Onset date cannot be in the future.");
    setBusy(true);
    const { data, error } = await supabase
      .from("symptom_reports")
      .insert({
        user_id: user!.id,
        symptoms,
        onset: onset || null,
        duration: duration.trim() || null,
        severity: severity === "" ? null : Number(severity),
        notes: notes.trim() || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return void setError(error.message);
    toast.success("Symptoms recorded");
    onCreated(data as SymptomReport);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Symptoms</legend>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => {
            const on = selected.includes(s);
            return (
              <button
                type="button"
                key={s}
                aria-pressed={on}
                onClick={() => setSelected(on ? selected.filter((x) => x !== s) : [...selected, s])}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  on ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="sf-other">Other symptoms (comma separated)</Label>
        <Input id="sf-other" value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="sf-onset">Onset date</Label>
          <Input id="sf-onset" type="date" value={onset} onChange={(e) => setOnset(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-dur">Duration</Label>
          <Input id="sf-dur" placeholder="e.g. 3 days" value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-sev">Severity (0–10)</Label>
          <select id="sf-sev" className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Not stated</option>
            {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sf-notes">Notes</Label>
        <Textarea id="sf-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
      </div>
      {error && <ErrorState message={error} />}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save symptoms"}</Button>
    </form>
  );
}
