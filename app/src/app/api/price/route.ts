// Latest DOGE/USD from the same signers the contract checks (prd.md §10.3, DECISIONS.md D-018).
// Concurrent requests share one round of exchange calls, so a burst of visitors does not hit rate limits.
import { NextResponse } from "next/server";
import { fetchDoge, MissingKeyError } from "@/lib/price.server";

export const dynamic = "force-dynamic";

let cache: { at: number; body: object } | null = null;
let inflight: Promise<object> | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 5_000) return NextResponse.json(cache.body);
  try {
    inflight ??= fetchDoge()
      .then(({ value, timestamp, signers, sources }) => {
        cache = { at: Date.now(), body: { value, timestamp, signers, sources } };
        return cache.body;
      })
      .finally(() => (inflight = null));
    return NextResponse.json(await inflight);
  } catch (e) {
    const status = e instanceof MissingKeyError ? 503 : 502;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
