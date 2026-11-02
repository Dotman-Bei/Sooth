// The signature: a taut wire with a pin at each end. Marks a stop level and nothing else.
export function WireMark({ width = 16, className }: { width?: number; className?: string }) {
  const h = 8;
  return (
    <svg
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <line x1={2} y1={h / 2} x2={width - 2} y2={h / 2} stroke="var(--accent)" strokeWidth={1} />
      <circle cx={2} cy={h / 2} r={1.5} fill="var(--accent)" />
      <circle cx={width - 2} cy={h / 2} r={1.5} fill="var(--accent)" />
    </svg>
  );
}

/** A stop figure, always preceded by the wire. */
export function StopFigure({ value, className, wire = 16 }: { value: string; className?: string; wire?: number }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <WireMark width={wire} />
      <span className="mono" style={{ color: "var(--accent)" }}>
        {value}
      </span>
    </span>
  );
}
