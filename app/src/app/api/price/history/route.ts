// Hourly DOGE/USD over the last 24 h for the chart, from Bitstamp's public candles. Display only:
// trigger never uses these. Cached for 15 minutes.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const URL = "https://www.bitstamp.net/api/v2/ohlc/dogeusd/?step=3600&limit=24";
let cache: { at: number; points: { t: number; p: number }[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 15 * 60_000) return NextResponse.json({ points: cache.points });
  try {
    const res = await fetch(URL, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`Bitstamp ${res.status}`);
    const body = await res.json();
    const points = (body.data?.ohlc ?? []).map((c: { timestamp: string; close: string }) => ({
      t: Number(c.timestamp) * 1000,
      p: Number(c.close),
    }));
    if (points.length) cache = { at: Date.now(), points };
    return NextResponse.json({ points });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, points: [] }, { status: 502 });
  }
}
