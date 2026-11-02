// Server only. DOGE/USD from five exchanges, each signed by its own key as a RedStone data package,
// so Sooth's connector checks verify it on-chain (contracts/src/PriceSignersConsumerBase.sol, DECISIONS.md D-018).
// RedStone's public gateways closed on 2026-10-29 and keyed access was not available.
// Keys come from PRICE_SIGNER_KEYS (5, comma-separated, in the same order as SOURCES) and never reach the browser.

import { concat, encodePacked, keccak256, numberToHex, stringToHex, type Hex } from "viem";
import { sign } from "viem/accounts";

const FEED = "DOGE"; // prd.md §9.1 FEED_ID
const DECIMALS = 8;
const THRESHOLD = 3;
const TIMEOUT_MS = 8_000; // first calls after a cold start can take several seconds; prices stay valid for 60 s
// Connector 1.0.0 payload tail, after the packages: packages count (2) | metadata size (3) = 0 | marker (9).
const NO_METADATA = "0x000000";
const MARKER = "0x000002ed57011e0000";

type Source = { name: string; url: string; read: (body: any) => number };

// Signer i signs SOURCES[i]. All keyless public tickers; Gate.io quotes USDT.
export const SOURCES: Source[] = [
  { name: "Bitstamp", url: "https://www.bitstamp.net/api/v2/ticker/dogeusd/", read: (b) => Number(b.last) },
  { name: "Gemini", url: "https://api.gemini.com/v1/pubticker/dogeusd", read: (b) => Number(b.last) },
  { name: "Bitfinex", url: "https://api.bitfinex.com/v2/ticker/tDOGE:USD", read: (b) => Number(b[6]) },
  { name: "Gate.io", url: "https://api.gateio.ws/api/v4/spot/tickers?currency_pair=DOGE_USDT", read: (b) => Number(b[0].last) },
  { name: "CoinGecko", url: "https://api.coingecko.com/api/v3/simple/price?ids=dogecoin&vs_currencies=usd", read: (b) => Number(b.dogecoin.usd) },
];

export class MissingKeyError extends Error {}

function keys(): Hex[] {
  const list = (process.env.PRICE_SIGNER_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  if (list.length !== SOURCES.length) throw new MissingKeyError(`PRICE_SIGNER_KEYS needs ${SOURCES.length} keys`);
  return list.map((k) => (k.startsWith("0x") ? k : `0x${k}`) as Hex);
}

async function quote(source: Source) {
  const res = await fetch(source.url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${source.name} ${res.status}`);
  const price = source.read(await res.json());
  if (!Number.isFinite(price) || price <= 0) throw new Error(`${source.name} returned no price`);
  return price;
}

/** Fails unless at least THRESHOLD exchanges answered, as the contract would.
 * The connector keeps only the first THRESHOLD unique signers it reads (RedstoneConsumerBase.sol:101), so
 * the payload carries exactly the three middle quotes: their median is the median of every exchange that answered. */
export async function fetchDoge() {
  const pks = keys();
  const results = await Promise.allSettled(SOURCES.map(quote));
  const timestamp = Date.now();
  const answered: { name: string; price: number; pk: Hex }[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") answered.push({ name: SOURCES[i].name, price: r.value, pk: pks[i] });
  });
  if (answered.length < THRESHOLD) {
    throw new Error(`Only ${answered.length} of ${SOURCES.length} exchanges answered; ${THRESHOLD} are needed`);
  }
  const sorted = [...answered].sort((a, b) => a.price - b.price);
  const start = Math.floor((sorted.length - THRESHOLD) / 2);
  const signed = sorted.slice(start, start + THRESHOLD);

  const packages: Hex[] = [];
  for (const s of signed) {
    const raw = BigInt(Math.round(s.price * 10 ** DECIMALS));
    // Package without its signature: feedId 32 | value 32 | timestamp 6 | value size 4 | data points 3.
    const body = encodePacked(
      ["bytes32", "uint256", "uint48", "uint32", "uint24"],
      [stringToHex(FEED, { size: 32 }), raw, timestamp, 32, 1],
    );
    // The connector recovers from the raw keccak of the package, with no Ethereum message prefix.
    // to: "hex" packs it as r (32) | s (32) | v (1, 27 or 28), the layout the connector reads.
    packages.push(concat([body, await sign({ hash: keccak256(body), privateKey: s.pk, to: "hex" })]));
  }
  const payload = concat([...packages, numberToHex(packages.length, { size: 2 }), NO_METADATA, MARKER]);

  return {
    payload,
    value: signed[1].price,
    timestamp,
    signers: signed.length,
    sources: answered.map((a) => ({ name: a.name, price: a.price, signed: signed.includes(a) })),
  };
}
