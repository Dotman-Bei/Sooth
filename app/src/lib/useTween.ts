"use client";

import { useEffect, useRef, useState } from "react";

/** Tweens a changed number over 400ms with the shared ease-out curve. */
export function useTween(target: number | undefined, duration = 400) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    if (target === undefined) return;
    const start = from.current ?? target;
    if (start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      const v = start + (target - start) * e;
      setValue(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
