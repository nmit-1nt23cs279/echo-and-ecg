import { Link } from "@tanstack/react-router";

export function EcgLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M0 16h34l5-9 6 20 6-28 6 26 4-9h59"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Brand symbol: a "C" with a pulse waveform through its opening. Same artwork as public/favicon.svg. */
export function BrandSymbol({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-navy-brand" />
      <path d="M43.5 18.5A19 19 0 1 0 43.5 45.5" fill="none" className="stroke-primary-foreground" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M20 32h7l4-9 6 18 4-9h9"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" aria-label="CardioFusion home" className="flex items-center gap-2.5 rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <BrandSymbol className="h-8 w-8 shrink-0" />
      <span className="font-display text-[1.05rem] font-bold tracking-tight">
        Cardio<span className="text-primary">Fusion</span>
      </span>
    </Link>
  );
}
