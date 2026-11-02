// Display formats: docs/FRONTEND.md §3, prd.md §16

export const usd = (n: number) => `$${n.toFixed(4)}`;

export const doge = (n: number) =>
  `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DOGE`;

export const dogeNum = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Network fees: 4 decimals, or two significant digits when smaller (Chikyū execution fees are ~0.0000004 DOGE). */
export const feeDoge = (n: number) => {
  if (n <= 0) return "0 DOGE";
  if (n >= 0.0001) return `${n.toFixed(4)} DOGE`;
  return `${n.toFixed(Math.min(18, Math.ceil(-Math.log10(n)) + 1))} DOGE`;
};

export const tdollar =(n: number) => `${n.toFixed(2)} tDOLLAR`;

/** Payout lines rounded so the displayed fee and payout always add up to the displayed proceeds. */
export const payoutLines = (proceeds: number, fee: number) => {
  const cents = (n: number) => Math.round(n * 100);
  const toHolder = cents(proceeds - fee);
  const feeC = cents(proceeds) - toHolder;
  return { proceeds: (toHolder + feeC) / 100, fee: feeC / 100, toHolder: toHolder / 100 };
};

export const pct =(n: number) => `${n.toFixed(1)}%`;

export const short = (hex: string) => `${hex.slice(0, 6)}…${hex.slice(-4)}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export const utc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
};

export const utcFull = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(
    d.getUTCMinutes(),
  )}:${pad(d.getUTCSeconds())} UTC`;
};

export const hourLabel = (ms: number) => `${pad(new Date(ms).getUTCHours())}:00`;

export const countdown = (ms: number) => {
  if (ms <= 0) return "Expired";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${min}m`;
  return `${min}m`;
};

/** How far DOGE/USD must fall to reach the stop, as a percent of the current price. ≤ 0 means at or below. */
export const distance = (price: number, stop: number) => ((price - stop) / price) * 100;
