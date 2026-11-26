import type { ReactNode } from "react";
import { Info, Loader2, Phone } from "lucide-react";
import { statusLabel, type ModelStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<ModelStatus, string> = {
  not_provided: "bg-muted text-muted-foreground border-border",
  pending: "bg-card text-accent-foreground border-primary/30",
  processing: "bg-accent text-accent-foreground border-primary/30",
  completed: "bg-accent text-accent-foreground border-primary/40",
  failed: "bg-muted text-foreground border-foreground/25",
  unavailable: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: ModelStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {statusLabel[status]}
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string | undefined; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-5 shadow-card md:p-6", className)}>{children}</div>;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 p-8 text-center">
      <p className="font-display font-semibold text-foreground">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function EmergencyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-foreground">
      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p>
        <strong>Emergency:</strong> severe or persistent chest pain, severe difficulty breathing, collapse or fainting
        may need emergency care. In India, call <strong>112</strong>
        {compact ? "." : " immediately. Do not wait for any result from this app."}
      </p>
    </div>
  );
}

export function DisclaimerNote() {
  return (
    <div className="flex gap-3 rounded-lg border bg-secondary p-4 text-sm text-secondary-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        CardioFusion is not a medical device and its models are not clinically validated. Model findings are not
        diagnoses and must not replace assessment by a qualified clinician.
      </p>
    </div>
  );
}

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
