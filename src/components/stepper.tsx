import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  completed,
  onSelect,
}: {
  steps: string[];
  current: number;
  completed: (step: number) => boolean;
  onSelect: (step: number) => void;
}) {
  return (
    <>
      <ol className="hidden items-center gap-2 md:flex" aria-label="Assessment steps">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = n === current;
          const done = !active && completed(n);
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(n)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    active ? "border-primary-foreground/40" : "border-border",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : n}
                </span>
                <span className="truncate font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="md:hidden">
        <p className="text-xs text-muted-foreground">
          Step {current} of {steps.length}
        </p>
        <p className="font-display font-semibold">{steps[current - 1]}</p>
        <div className="mt-2 flex gap-1">
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-label={`Go to ${s}`}
              onClick={() => onSelect(i + 1)}
              className={cn("h-1.5 flex-1 rounded-full", i + 1 === current ? "bg-primary" : "bg-border")}
            />
          ))}
        </div>
      </div>
    </>
  );
}
