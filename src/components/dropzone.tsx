import { useRef, useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropZone({
  accept,
  hint,
  disabled,
  progress,
  onFile,
}: {
  accept: string;
  hint: string;
  disabled?: boolean;
  progress: number | null;
  onFile: (f: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !disabled) onFile(f);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        "rounded-xl border border-dashed bg-muted/40 p-6 text-center transition-colors",
        over && "border-primary bg-accent",
        disabled && "opacity-60",
      )}
    >
      <UploadCloud className="mx-auto h-6 w-6 text-primary" />
      <p className="mt-2 text-sm">
        Drag a file here or{" "}
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          browse
        </button>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {progress !== null && (
        <div className="mx-auto mt-4 max-w-xs" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-1.5 rounded-full bg-border">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Uploading… {progress}%</p>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
