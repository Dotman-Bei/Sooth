# Gate G0 — feasibility (prd.md §7.2)

Status as of 2026-11-02. Raw outputs sit next to this file. **RedStone's public gateways closed for good on 2026-10-29 and no key was available, so G0-1, G0-3 and G0-5 are superseded: Sooth now uses its own five price signers in RedStone's package format (DECISIONS.md D-018), and E-3/E-4/E-5 passed on Chikyū with them. G0-4 (Noah) is still open.**

| ID | Check | Status | Evidence | To finish |
|---|---|---|---|---|
| G0-1 | RedStone primary-prod serves DOGE | **Superseded** (D-018) | Gateway reachable; returns 403 without a key (DECISIONS.md D-003) | Only if a RedStone key appears (D-018, switching back) |
| G0-2 | A contract can `transferFrom` native DOGE | **Pass** (2026-11-01) | `g0-2.json`: probe `0xbe86…4068` pulled exactly 1.00 DOGE from `0x5e3c…7fe6` (42.0148 → 41.0148); the probe's native balance and `balanceOf` both read 1.00 (no double count); returned by `giveBack`. Pull tx [`0x1357…f939`](https://blockscout.testnet.dogeos.com/tx/0x1357e324a8841a247b6e354b15015b354fb20f6edf8eebd675c95c574c9af939). Four txs cost 0.060 DOGE in gas | — |
| G0-3 | A RedStone consumer works on Chikyū | **Superseded** (D-018); the vendored connector runs on Chikyū with Sooth's signers, `evidence/chikyu/e-3.json`, `e-4.json` | `contracts/src/probes/RedstoneProbe.sol` compiles (0.8.24, cancun) against the vendored connector | — (price decimals are 8, set by `price.server.ts`) |
| G0-4 | Noah can deploy a contract inheriting RedStone's base | **Pending** | — | Owner, in Noah (OD-2) |
| G0-5 | Frontend can append the RedStone payload | **Pass with own signers** (D-018): `/api/payload` builds the payload; E-3/E-4 sent it on Chikyū. Earlier note: | Built server-side with sdk/protocol 1.0.0, padded like the connector (removed in D-018). Not built in Noah | Noah question in D-001 |
| G0-6 | DogeOS SDK runs as a top-level page | **Pass** (2026-11-02, localhost) | Sandbox client ID registered for `http://localhost:3000` in console.dogeos.com; the relay accepts it (no CORS). The owner signed in through the DogeOS window in a real browser, then allowed, armed, triggered above the stop (refused), re-armed, triggered below the stop (sold), and cancelled and revoked from the app. Not yet run inside the Noah app | Hosted at https://sooth-sage.vercel.app (2026-11-02): pages and /api/price answer, all 5 exchanges reachable; sign-in there needs the origin added in console.dogeos.com. Re-check inside Noah once G0-4 is settled |
| G0-7 | Source verification on l2scan or Blockscout | **Pass** (2026-11-01) | TestDollar, BackstopVenue and Sooth verified on Blockscout (solc 0.8.24), `evidence/chikyu/e-1.json`. Sooth: [`0x858c…c0a4`](https://blockscout.testnet.dogeos.com/address/0x858c8f47c75e10576a75854274ec679a1d86c0a4?tab=contract) | — |
| G0-8 | Gas floor sizing | **Pass** | One `approve(x, 0)` revoke costs 0.00599 DOGE (execution 0.0000004 + data-and-finality 0.00599). 10× = 0.0599 DOGE, below `MIN_GAS_FLOOR` = 1 DOGE, which covers ~166 revokes. Nearly all of the fee is the L1 part, which moves with L1 gas prices: re-run `read-probes.mjs` before deploy | — |
| G0-9 | Rules allow a test payout token | **Pending** | `docs/RULES.md` does not exist | Owner: paste the official rules (OD-1) |

## Other observations from `read-probes.json`

- EVM: PUSH0, TLOAD/TSTORE and MCOPY execute, so `evm_version = "cancun"` is safe (prd.md §9).
- The RPC reads historical state, so receipts can show balances before and after a trigger.
- `eth_getLogs` is capped at 10,000 blocks per call; Chikyū makes ~3.4 blocks/s (~290k/day). The app scans in chunks (D-010).

## Runs

- `read-probes.json` — `node scripts/g0/read-probes.mjs`, no key needed, re-runnable any time.
- Fork checks — `cd contracts && forge test --match-path "test/probes/*"`. Not evidence; see the test file header.
