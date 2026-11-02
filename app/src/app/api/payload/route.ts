// A freshly signed price payload to append to trigger calldata (prd.md §5.1, §10.1, DECISIONS.md D-018).
// Never cached: the contract rejects prices older than MAX_PRICE_AGE.
import { NextResponse } from "next/server";
import { fetchDoge, MissingKeyError } from "@/lib/price.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { payload, value, timestamp, signers, sources } = await fetchDoge();
    return NextResponse.json({ payload, value, timestamp, signers, sources });
  } catch (e) {
    const status = e instanceof MissingKeyError ? 503 : 502;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
