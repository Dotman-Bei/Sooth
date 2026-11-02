// Contract addresses and explorer come from env only (prd.md §0.4: never invent an address).
// Live mode needs the Sooth address and a DogeOS clientId. Without both the app runs in preview mode
// with labelled sample values (§0.5).

export const NATIVE_DOGE = "0x530000000000000000000000000000000000d09e" as const;
export const L1_GAS_PRICE_ORACLE = "0x5300000000000000000000000000000000000002" as const; // prd.md §10.5
export const CHAIN_ID = 6281971;

const addr = (v: string | undefined) => (v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as `0x${string}`) : undefined);
const hash = (v: string | undefined) => (v && /^0x[0-9a-fA-F]{64}$/.test(v) ? (v as `0x${string}`) : undefined);

export const config = {
  sooth: addr(process.env.NEXT_PUBLIC_SOOTH_ADDRESS),
  venue: addr(process.env.NEXT_PUBLIC_VENUE_ADDRESS),
  payoutToken: addr(process.env.NEXT_PUBLIC_PAYOUT_TOKEN_ADDRESS),
  clientId: process.env.NEXT_PUBLIC_DOGEOS_CLIENT_ID ?? "",
  stage: process.env.NEXT_PUBLIC_DOGEOS_STAGE ?? "",
  explorer: (process.env.NEXT_PUBLIC_EXPLORER_URL ?? "").replace(/\/$/, ""),
  // Signed price decimals: 8 (lib/price.server.ts).
  priceDecimals: Number(process.env.NEXT_PUBLIC_PRICE_DECIMALS ?? 8),
  demoHolder: addr(process.env.NEXT_PUBLIC_DEMO_HOLDER),
  demoTxs: {
    revert: hash(process.env.NEXT_PUBLIC_DEMO_TX_ABOVE_STOP),
    sell: hash(process.env.NEXT_PUBLIC_DEMO_TX_BELOW_STOP),
    cancelled: hash(process.env.NEXT_PUBLIC_DEMO_TX_AFTER_CANCEL),
  },
};

export const LIVE = !!config.sooth && !!config.clientId;
export const PREVIEW = !LIVE;

// Contract parameters, prd.md §9.1. In live mode Verify reads them from the contract.
export const PARAMS = {
  callerFeeBps: 50,
  maxPriceAge: 60,
  maxPriceAhead: 30,
  signerThreshold: 3,
  signerCount: 5,
  minGasFloor: 1,
  dataService: "sooth-price-signers", // DECISIONS.md D-018
  feed: "DOGE",
};

// The explorer can also come from the DogeOS chain list at runtime (see DogeOSProvider).
let runtimeExplorer = "";
export const setRuntimeExplorer = (url: string) => (runtimeExplorer = url.replace(/\/$/, ""));
const explorer = () => config.explorer || runtimeExplorer;

export const txUrl = (h: string) => (explorer() ? `${explorer()}/tx/${h}` : "");
export const addressUrl = (a: string) => (explorer() ? `${explorer()}/address/${a}` : "");
