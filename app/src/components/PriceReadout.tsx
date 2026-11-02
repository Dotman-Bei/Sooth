"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { usd } from "@/lib/format";
import { useTween } from "@/lib/useTween";
import styles from "./PriceReadout.module.css";

const R = 5;
const C = 2 * Math.PI * R;

/** The one live element: a ring that empties over the 10 s refresh window (prd.md §10.3). */
export function FreshnessRing({ updatedAt }: { updatedAt: number }) {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" className={styles.ring} aria-hidden="true">
      <circle cx={6} cy={6} r={R} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
      <circle
        key={updatedAt}
        cx={6}
        cy={6}
        r={R}
        fill="none"
        stroke="var(--text-3)"
        strokeWidth={1.5}
        strokeDasharray={C}
        className={styles.sweep}
        style={{ ["--c" as string]: C }}
        transform="rotate(-90 6 6)"
      />
    </svg>
  );
}

export function useAge(updatedAt: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!updatedAt) return "";
  return `${Math.max(0, Math.round((now - updatedAt) / 1000))} s ago`;
}

export function PriceReadout({ compact = false }: { compact?: boolean }) {
  const { price, priceError } = useStore();
  const shown = useTween(price?.value);
  const age = useAge(price?.updatedAt);

  return (
    <div
      className={styles.readout}
      title={priceError ? `Price unavailable: ${priceError}` : price ? `Median of 5 exchanges, 3 of 5 signers, ${age}` : undefined}
    >
      {!compact && <span className={styles.pair}>DOGE/USD</span>}
      <span className={`mono ${styles.value}`}>{shown !== undefined ? usd(shown) : "$—"}</span>
      {price && <FreshnessRing updatedAt={price.updatedAt} />}
    </div>
  );
}
