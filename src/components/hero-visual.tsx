/** Product visualisation: ECG waveform and echo frame feeding two independent analysis paths. */
export function HeroVisual() {
  return (
    <div className="relative rounded-2xl border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Assessment workspace</span>
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
        </span>
      </div>
      <svg viewBox="0 0 440 300" className="h-auto w-full text-primary" role="img" aria-label="ECG and echocardiogram inputs flowing into separate analysis models">
        {/* ECG input */}
        <g>
          <rect x="1" y="1" width="200" height="120" rx="10" className="fill-secondary stroke-border" />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={20 + i * 20} y1="30" x2={20 + i * 20} y2="105" className="stroke-border" strokeWidth="0.6" />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <line key={`h${i}`} x1="14" y1={35 + i * 22} x2="188" y2={35 + i * 22} className="stroke-border" strokeWidth="0.6" />
          ))}
          <path d="M14 72h28l6-10 6 10h14l5 8 7-48 7 62 6-22h20l8-12 8 12h14l5 8 7-48 7 62 6-22h20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <text x="14" y="20" className="fill-foreground" fontSize="11" fontWeight="600">ECG signal</text>
          <text x="188" y="20" textAnchor="end" className="fill-muted-foreground" fontSize="9" fontFamily="monospace">140 features</text>
        </g>
        {/* ECHO input */}
        <g>
          <rect x="239" y="1" width="200" height="120" rx="10" className="fill-navy stroke-border" />
          <path d="M339 34 L289 108 A86 86 0 0 0 389 108 Z" className="fill-navy-foreground" opacity="0.12" />
          <ellipse cx="333" cy="82" rx="16" ry="11" className="fill-navy" opacity="0.9" />
          <ellipse cx="352" cy="88" rx="10" ry="8" className="fill-navy" opacity="0.8" />
          <path d="M318 70 q15 -12 34 2" className="stroke-navy-foreground" opacity="0.5" fill="none" strokeWidth="1.5" />
          <text x="253" y="20" className="fill-navy-foreground" fontSize="11" fontWeight="600">Echocardiogram</text>
          <text x="425" y="20" textAnchor="end" className="fill-navy-foreground" opacity="0.7" fontSize="9" fontFamily="monospace">224×224</text>
        </g>
        {/* connectors */}
        <path d="M101 122 v40" className="stroke-primary" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
        <path d="M339 122 v40" className="stroke-primary" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
        {/* models */}
        <g>
          <rect x="21" y="162" width="160" height="48" rx="8" className="fill-card stroke-primary" strokeWidth="1.2" />
          <text x="101" y="183" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">ECG model</text>
          <text x="101" y="199" textAnchor="middle" className="fill-muted-foreground" fontSize="9">1D convolutional network</text>
        </g>
        <g>
          <rect x="259" y="162" width="160" height="48" rx="8" className="fill-card stroke-primary" strokeWidth="1.2" />
          <text x="339" y="183" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">ECHO model</text>
          <text x="339" y="199" textAnchor="middle" className="fill-muted-foreground" fontSize="9">2D convolutional network</text>
        </g>
        <path d="M101 210 v30 h80" className="stroke-border" strokeWidth="1.5" fill="none" />
        <path d="M339 210 v30 h-80" className="stroke-border" strokeWidth="1.5" fill="none" />
        <g>
          <rect x="140" y="240" width="160" height="52" rx="8" className="fill-muted stroke-border" strokeDasharray="4 3" />
          <text x="220" y="262" textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">Assessment report</text>
          <text x="220" y="278" textAnchor="middle" className="fill-muted-foreground" fontSize="9">Findings shown independently</text>
        </g>
      </svg>
    </div>
  );
}
