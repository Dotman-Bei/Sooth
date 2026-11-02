import { config } from "./config";

// Mirror of the claim ledger, prd.md §15. Source of truth: evidence/claims.json. Keep tiers in step with it.

export type Tier = "executed-chikyu" | "executed" | "tested-local" | "designed" | "unavailable";

export type Claim = { id: string; claim: string; tier: Tier; target: string; limitation: string };

export const CLAIMS: Claim[] = [
  {
    id: "SOOTH-C1",
    claim:
      "Sooth's trigger function reverts when the DOGE/USD value in the call, the median of at least 3 of its 5 price signers and at most 60 s old, is above the holder's stop",
    tier: "executed-chikyu",
    target: "executed-chikyu",
    limitation: "The five price-signer keys are held by the Sooth operator, not an independent oracle (D-018). Caller may choose among valid packages within 60 s",
  },
  {
    id: "SOOTH-C2",
    claim: "After any successful trigger, the holder's native DOGE balance is at least their gas floor",
    tier: "executed-chikyu",
    target: "executed-chikyu",
    limitation: "Floor is set in DOGE, not in fee units; the holder can still spend it themselves",
  },
  {
    id: "SOOTH-C3",
    claim: "Before a trigger, Sooth and the venue hold none of the holder's DOGE",
    tier: "executed-chikyu",
    target: "executed-chikyu",
    limitation: "An allowance is still authority; revoke after cancel",
  },
  {
    id: "SOOTH-C4",
    claim: "A stop fires at most once and never moves more than its armed amount",
    tier: "executed-chikyu",
    target: "tested-local, then executed-chikyu",
    limitation: "None stated",
  },
  {
    id: "SOOTH-C5",
    claim: "The payout uses the same signed price as the trigger",
    tier: "executed-chikyu",
    target: "tested-local",
    limitation: "Testnet backstop venue and test payout token; no market liquidity or slippage",
  },
  {
    id: "SOOTH-C6",
    claim: "The app and contracts were built with Noah AI",
    tier: "unavailable",
    target: "executed",
    limitation: "Not built in Noah yet (DECISIONS.md D-001)",
  },
];

export const NOT_CLAIMED = [
  "That Sooth prevents losses",
  "That a sell happens at exactly the stop price",
  "Real liquidity",
  "Mainnet readiness",
  "That anyone will call trigger in time",
];

// Demo transactions, prd.md §14. Hashes come from env once recorded in evidence/chikyu.
export const DEMO_TXS: { id: string; label: string; outcome: string; hash: string }[] = [
  { id: "E-3", label: "Trigger above the stop", outcome: "Reverted with PriceAboveStop", hash: config.demoTxs.revert ?? "" },
  { id: "E-4", label: "Trigger below the stop", outcome: "Sold 5.00 DOGE at $0.0753, holder kept 35.39", hash: config.demoTxs.sell ?? "" },
  { id: "E-7", label: "Trigger after cancel", outcome: "Reverted with NoActiveStop", hash: config.demoTxs.cancelled ?? "" },
];
