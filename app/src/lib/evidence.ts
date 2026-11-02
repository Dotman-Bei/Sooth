// Recorded on-chain facts the pages cite. Copied from evidence/ and deployments/chikyu.json; each value
// traces to a file there. Change them only by re-running the scripts that record them.

export const EXPLORER = "https://blockscout.testnet.dogeos.com";

export const DEPLOYED = {
  // deployments/chikyu.json, evidence/chikyu/e-1.json (source verified on Blockscout)
  // v2, own price signers (DECISIONS.md D-018); v1 is in deployments/chikyu-v1-redstone.json
  Sooth: "0x3ec80687bf8ad5cd1edf4899c1be614a34179db5",
  BackstopVenue: "0x8ddb477f9415c360b6c6980d3592376f3563c2fa",
  TestDollar: "0xc6a3d2bb2fb295e608b13463218f45b3be7c4361",
  NativeDoge: "0x530000000000000000000000000000000000d09e",
} as const;

export const RECORDED = {
  // evidence/g0/g0-2.json: a probe contract pulled exactly 1 DOGE, then gave it back
  pull: { tx: "0x1357e324a8841a247b6e354b15015b354fb20f6edf8eebd675c95c574c9af939", date: "1 November 2026" },
  // evidence/chikyu/e-2.json: exact approve and arm
  arm: { tx: "0x5dd46a87191e7d7d01ed61977e25d23293241ea61387a10486bb1e9d48c30c9d" },
  // evidence/chikyu/e-6.json: Sooth and the venue held 0 of the holder's DOGE while armed
  noCustody: { block: 9120230 },
  // evidence/chikyu/e-7.json: cancel, then trigger reverted NoActiveStop
  afterCancel: { tx: "0xc61ad679597c51578b136c804d9b03c6fca2cde44096d8048cef28e775175879" },
  // evidence/chikyu/e-3.json: stop below the signed price, trigger reverted PriceAboveStop
  aboveStop: { tx: "0x5b05edeef145c301ac2962c1f385f60f8ed5867f288909664a99ab93274af918" },
  // evidence/chikyu/e-4.json, e-5.json: stop above the signed price, trigger sold 5 DOGE and the holder kept 35.39
  sell: { tx: "0x11c8e2216409965712a0611213a4701ba3afb630d8b27b03962e94ce9f76f2fb" },
} as const;

// contracts/test/Sooth.t.sol and DECISIONS.md D-016, D-018
export const TESTED = { tests: 31, mutantsCaught: 18, mutants: 18, fuzzRuns: 256 } as const;

export const txLink = (h: string) => `${EXPLORER}/tx/${h}`;
export const addrLink = (a: string) => `${EXPLORER}/address/${a}?tab=contract`;
export const shortHex = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
