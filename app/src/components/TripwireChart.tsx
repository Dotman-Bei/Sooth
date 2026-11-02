"use client";

import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/store";
import { hourLabel, usd } from "@/lib/format";
import styles from "./TripwireChart.module.css";

type Note = { anchor: "dot" | "wire"; text: string };

type Props = {
  series: Point[] | undefined;
  stopPrice: number;
  height?: number;
  notes?: Note[];
  label?: string;
  /** Shown in the well when there is no series to draw */
  empty?: string;
};

const PAD = { top: 20, right: 72, bottom: 32, left: 16 };
const CHAR = 7.22; // IBM Plex Mono at 12px
const NARROW = 520;

// Monotone cubic (Fritsch–Carlson): smooth without overshooting the data.
function smoothPath(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    m.push((ys[i + 1] - ys[i]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${xs[i] + h},${ys[i] + t[i] * h} ${xs[i + 1] - h},${ys[i + 1] - t[i + 1] * h} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

export function TripwireChart({ series, stopPrice, height = 320, notes = [], label, empty }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  
  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const narrow = w > 0 && w < NARROW;
  const h = narrow ? Math.min(height, 220) : height;
  const ready = series && series.length > 1 && w > 0;

  let body = null;
  if (ready) {
    const prices = series.map((s) => s.p);
    const lo = Math.min(stopPrice, ...prices) - 0.0012;
    const hi = Math.max(stopPrice, ...prices) + 0.0008;
    const t0 = series[0].t;
    const t1 = series[series.length - 1].t;
    const pr = narrow ? 64 : PAD.right;
    const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * (w - PAD.left - pr);
    const y = (p: number) => PAD.top + (1 - (p - lo) / (hi - lo)) * (h - PAD.top - PAD.bottom);

    const xs = series.map((s) => x(s.t));
    const ys = series.map((s) => y(s.p));
    const line = smoothPath(xs, ys);
    const plotBottom = h - PAD.bottom;
    const wy = y(stopPrice);
    const last = series[series.length - 1];
    const lx = xs[xs.length - 1];
    const ly = ys[ys.length - 1];
    const plotRight = w - pr;

    // Grid every 0.0025, labels in the right gutter, skipping ones that collide with the tags.
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / 0.0025) * 0.0025; v <= hi; v += 0.0025) ticks.push(+v.toFixed(4));
    const tickLabels = ticks.filter((v) => Math.abs(y(v) - wy) > 16 && Math.abs(y(v) - ly) > 16);

    // Time labels on hours divisible by 6.
    const times: number[] = [];
    const firstHour = Math.ceil(t0 / 3_600_000) * 3_600_000;
    for (let t = firstHour; t <= t1; t += 3_600_000) if (new Date(t).getUTCHours() % 6 === 0) times.push(t);

    const noteBoxes = narrow
      ? []
      : notes.map((n) => {
          const bw = Math.round(n.text.length * CHAR + 20);
          if (n.anchor === "dot") {
            // Sit in the calm space under the line, clear of every point it spans.
            const bx = Math.max(PAD.left, lx - bw - 40);
            const under = xs.reduce((m, xv, i) => (xv >= bx - 8 && xv <= lx ? Math.max(m, ys[i]) : m), ly);
            const by = Math.min(under + 20, wy - 40);
            return { ...n, bw, bx, by, ax: lx, ay: ly };
          }
          const ax = PAD.left + (plotRight - PAD.left) * 0.3;
          const bx = ax + 24;
          const by = Math.min(plotBottom - 28, wy + 28);
          return { ...n, bw, bx, by, ax, ay: wy };
        });

    body = (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>


        {ticks.map((v) => (
          <line key={v} x1={PAD.left} x2={plotRight} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
        ))}
        {tickLabels.map((v) => (
          <text key={v} x={plotRight + 12} y={y(v) + 4} className={styles.axis}>
            {usd(v)}
          </text>
        ))}
        {times.map((t) => (
          <text key={t} x={x(t)} y={h - 10} textAnchor="middle" className={styles.axis}>
            {hourLabel(t)}
          </text>
        ))}
        <path d={line} fill="none" stroke="var(--text)" strokeWidth={1.5} strokeLinejoin="round" />

        {/* The wire */}
        <line x1={PAD.left} x2={plotRight} y1={wy} y2={wy} stroke="var(--accent)" strokeWidth={1} />
        <circle cx={PAD.left} cy={wy} r={3} fill="var(--accent)" />
        <circle cx={plotRight} cy={wy} r={3} fill="var(--accent)" />
        <rect x={plotRight + 8} y={wy - 11} width={pr - 12} height={22} rx={4} fill="var(--accent-dim)" />
        <text x={plotRight + 14} y={wy + 4} className={styles.stopTag}>
          {usd(stopPrice)}
        </text>

        {/* Current signed price */}
        <line x1={lx} x2={plotRight + 8} y1={ly} y2={ly} stroke="var(--line-strong)" strokeDasharray="2 3" />
        <circle cx={lx} cy={ly} r={8} fill="none" stroke="var(--line-strong)" />
        <circle cx={lx} cy={ly} r={3.5} fill="var(--text)" />
        <rect x={plotRight + 8} y={ly - 11} width={pr - 12} height={22} rx={4} fill="var(--raised)" />
        <text x={plotRight + 14} y={ly + 4} className={styles.priceTag}>
          {usd(last.p)}
        </text>

        {noteBoxes.map((n) => {
          const cx = n.bx + (n.anchor === "dot" ? n.bw : 0);
          const cy = n.by + 12;
          return (
            <g key={n.text}>
              <path
                d={
                  n.anchor === "dot"
                    ? `M${cx},${cy} L${n.ax},${cy} L${n.ax},${n.ay + 8}`
                    : `M${n.ax},${n.ay} L${n.ax},${cy} L${n.bx},${cy}`
                }
                fill="none"
                stroke="var(--text-3)"
                strokeWidth={1}
              />
              <rect x={n.bx} y={n.by} width={n.bw} height={24} rx={4} fill="var(--raised)" stroke="var(--line-strong)" />
              <text x={n.bx + 10} y={n.by + 16} className={styles.note}>
                {n.text}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div className={styles.wrap}>
      <div ref={wrap} className={styles.well} style={{ height: h }}>
        {body ?? (empty && <p className={styles.empty}>{empty}</p>)}
      </div>
      {narrow && notes.length > 0 && (
        <ul className={styles.legend}>
          {notes.map((n) => (
            <li key={n.text} className="mono">
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
