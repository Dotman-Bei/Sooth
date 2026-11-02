# Decisions

Append-only. Each entry cites the PRD section it touches (prd.md §n). Newest at the bottom.

---

## D-001 · 2026-10-31 · Frontend built by hand, not through Noah AI

**PRD:** §0.2, §15 SOOTH-C6, §26 App.
**Decision:** The frontend in `app/` (all six §11 surfaces, design spec in `docs/FRONTEND.md`) was written in a Claude Code session at the owner's request, not generated through Noah prompts.
**Why:** The owner asked for it directly, ahead of the Noah build.
**Consequence:** SOOTH-C6 ("built with Noah AI") cannot cover `app/` as it stands. Either the app is regenerated or ported through Noah with prompts logged in `noah/PROMPTS.md`, or the submission states this hand edit plainly. Owner to decide.
**Resolved (owner, 2026-11-02):** SOOTH-C6 is dropped. The app and contracts were built in Claude Code, not ported through Noah, and the Verify page and `evidence/claims.json` no longer list a Noah claim. G0-4 is not pursued.

## D-002 · 2026-10-31 · `@redstone-finance/evm-connector@1.0.0` cannot be installed from npm

**PRD:** §7.1, §10.1, G0-5.
**Observed:** `pnpm add @redstone-finance/evm-connector@1.0.0` fails with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. The published package lists `@redstone-finance/protocol`, `sdk`, `signing` and `utils` as `workspace:*`. Version 0.9.0 pins real versions.
**Decision:** The browser does not need the connector. Payloads are built with `@redstone-finance/sdk@1.0.0` (`requestDataPackages`) and `@redstone-finance/protocol@1.0.0` (`RedstonePayload.prepare`), padded to 32 bytes exactly as the connector's `BaseWrapper.prepareRedstonePayload` does (`app/src/lib/redstone.server.ts`).
**Contracts:** The Solidity bases still come from 1.0.0. Get them with `npm pack @redstone-finance/evm-connector@1.0.0` and vendor `contracts/`, or use 0.9.0 after diffing. Not yet decided.

## D-003 · 2026-10-31 · RedStone primary-prod needs an API key

**PRD:** §7.1 (assumed keyless `WrapperBuilder.usingDataService`), §10.3, G0-1, G0-5.
**Observed:** In `@redstone-finance/sdk@1.0.0`, `requestDataPackages` requires `authenticatedGateways: [{ apiKey }]`. Even the connector's `DataServiceWrapper` throws without it. `GET https://oracle-gateway.a.redstone.finance/v2/data-packages/latest/redstone-primary-prod` returns `403 {"message":"Forbidden"}` without a key.
**Decision:** Prices and trigger payloads are fetched by Next.js route handlers (`/api/price`, `/api/price/history`, `/api/payload`) that read `REDSTONE_API_KEY` on the server. The key never reaches the browser. Without it the routes return 503 and the UI shows "DOGE/USD is unavailable right now".
**Owner input needed:** a RedStone API key (new; not in §25). If the Noah deployment cannot run server routes, this needs another home.
**Signers:** Payload requests are limited to the 5 signers in `PrimaryProdDataServiceConsumerBase.sol` (1.0.0), threshold 3, matching §7.1. The SDK's registry lists 17 primary-prod nodes; using those would make `trigger` revert with `SignerNotAuthorised`.

## D-004 · 2026-10-31 · DogeOS SDK 4.0.5 chain config differs from the PRD

**PRD:** §10.2 ("`dogeOSChikyuTestnet` under `chains.evm`").
**Observed:** 4.0.5 has no `dogeOSChikyuTestnet` export. Its types say chains "must be obtained through `getChains()`", which fetches `https://web3-assets.mydoge.com/api/chains`. On 2026-10-31 that list included chain 6281971. With a placeholder `clientId` on `localhost`, `relay.mydoge.com/v1/auth/session` was refused by CORS.
**Decision:** `app/src/components/DogeOSProvider.tsx` calls `getChains()` and `getConnectors()`, keeps only Chikyū under `chains.evm`, and reads the RPC and explorer URL from that entry. Nothing chain-specific is hard-coded.
**Owner input needed:** a DogeOS `clientId` (OD-4) that allows the deployed app's origin.

## D-005 · 2026-10-31 · Sooth ABI transcribed from the PRD until the contract exists

**PRD:** §0.4, §9.1, §11 (Trigger shows `preview()` per check).
**Decision:** `app/src/lib/abi.ts` transcribes §9.1. Where §9.1 is silent, the frontend expects:
- `Armed(address indexed holder, uint64 stopPrice, uint128 amount, uint128 gasFloor, uint64 expiry)`
- `Cancelled(address indexed holder)`
- `Triggered(address indexed holder, address indexed caller, uint256 price, uint256 priceTimestamp, uint256 amount, uint256 proceeds, uint256 fee)`, with `priceTimestamp` in ms
- public `uint256` getters `CALLER_FEE_BPS`, `MAX_PRICE_AGE`, `MAX_PRICE_AHEAD`, `MIN_GAS_FLOOR`
- the public `stops(address)` getter returning the §9.1 struct in order

Sooth.sol should match this, or the file is replaced with the compiled ABI after G1. Event types change the topic hash, so a mismatch makes Status and Receipt silently empty.
**`preview()`:** §9.1 does not define its return shape, so the frontend does not call it. The Trigger page computes the six checks from `stops()`, `balanceOf` and the signed price, in the order `trigger()` runs them. The contract stays the authority; a failed call is decoded from its revert.

## D-006 · 2026-10-31 · Webpack instead of Turbopack; optional modules aliased

**Observed:** `next build --turbopack` panics on the DogeOS SDK bundle ("The high bits of the position 2552625 are not all 0s or 1s"). Webpack builds, but the SDK's import of `injected` from the `wagmi/connectors` barrel pulls in Coinbase's CDP SDK, which imports optional `@x402/*` modules that are not installed.
**Decision:** `dev` and `build` use webpack. `next.config.ts` aliases the five `@x402/*` modules to empty modules; Sooth never reaches that payment code. The chain module (viem) loads lazily, so preview pages ship 116–120 kB first-load JS.

## D-007 · 2026-10-31 · Trigger is sent with a fixed gas limit

**PRD:** §14 E-3, §10.5 (link the failed tx on l2scan).
**Decision:** `trigger` is sent with a fixed gas limit (`NEXT_PUBLIC_TRIGGER_GAS_LIMIT`, default 600,000), so a trigger above the stop is mined and reverts with a hash to link, instead of being stopped by wallet gas estimation. The reason is recovered by repeating the call with `eth_call` one block earlier and decoding it against the ABI.
**To check on Chikyū:** that 600,000 covers a successful trigger, and that MyDoge honours a dapp-supplied gas limit.

## D-008 · 2026-10-31 · Preview mode until live inputs exist

**PRD:** §0.5.
**Decision:** Until both `NEXT_PUBLIC_SOOTH_ADDRESS` and `NEXT_PUBLIC_DOGEOS_CLIENT_ID` are set, the app runs on sample values from §5.1 and §19.1. A bar on every page says so, sample tx hashes are marked "sample" and never linked, and Verify shows each claim at its true tier (`designed`). The landing preview wallet is labelled "Example wallet" in both modes.

## D-009 · 2026-10-31 · Chikyū's explorer is Blockscout

**PRD:** §0.3, §10.5 ("link the failed tx on l2scan"), G0-7.
**Observed:** DogeOS's chain list gives `https://blockscout.testnet.dogeos.com/` for 6281971; its API answers.
**Decision:** UI copy says "Blockscout" instead of "l2scan". Links use `NEXT_PUBLIC_EXPLORER_URL` or the URL from the chain list.

## D-010 · 2026-10-31 · Event reads are chunked to 10,000 blocks

**Observed:** Chikyū's RPC rejects `eth_getLogs` spans over 10,000 blocks ("query exceeds max block range 10000"), at ~3.4 blocks/s.
**Decision:** `app/src/lib/live.ts` scans Sooth's events in 10k-block chunks, six at a time, from `NEXT_PUBLIC_SOOTH_DEPLOY_BLOCK` (or ~1 day back if unset), caches what it has scanned, and filters by holder in code. Set the deploy block when deploying.

## D-011 · 2026-10-31 · Footer no longer says "Built with Noah AI"

**PRD:** §0.6, §15 SOOTH-C6.
**Decision:** The footer read "Built with Noah AI for VIBE CODE ON DOGE", which is not true of the current app (D-001). It now reads "Made for VIBE CODE ON DOGE" until D-001 is resolved.

## D-012 · 2026-10-31 · Connector Solidity vendored for the probes

**PRD:** §7.1, G0-3. Follows D-002.
**Decision:** The 1.0.0 Solidity is copied unchanged into `contracts/lib/redstone-evm-connector-1.0.0/` with checksums in `VENDORED.md`, remapped as `@redstone-finance/evm-connector/`. Ten of its files are BUSL-1.1 despite package.json saying MIT; read the licence before any production use.

## D-013 · 2026-10-31 · Native DOGE moves through a precompile; forks cannot test it

**PRD:** §13 (test harness), I-2, I-7, G0-2.
**Observed:** On a Foundry fork of Chikyū, `0x5300…d09e.transferFrom` calls a DogeOS precompile at `0x…fd` with `(from, to, amount)`. The fork has no code there, so the call returns `true` and emits `Transfer` while no balance moves.
**Decision:** Fork tests must never assert DOGE balance changes. Sooth's unit tests mock native DOGE (as §13 already says), and every balance-moving claim (C2, C3, C4) needs its Chikyū run. `contracts/test/probes/DogePullProbe.fork.t.sol` documents this and checks only the call path.

## D-014 · 2026-11-01 · Build past G0 while the RedStone key is chased

**PRD:** §7.2 stop boundary, §23 K-1, §25.
**Observed:** No keyless DOGE price exists on Chikyū. RedStone has no push feed there: its only contract, `RedstoneMulticall3` at `0xaD6C…678c`, was deployed on 2026-08-31 and never called. The explorer shows no Pyth, Stork, Chainlink, API3, Supra or DIA contracts. RedStone's public gateways are shut, and primary-prod needs an API key that has not been obtained.
**Decision (owner, 2026-11-01):** Override the G0 stop boundary. Build Sooth.sol, the venue, the payout token and the §13 tests now against RedStone's mock signers (the PRD's own harness); keep chasing a key with DogeOS and RedStone. Only the on-chain RedStone evidence (G0-1, G0-3, E-3, E-4) waits for the key. G0-2 passed (2026-11-01), so the DogeOS-only thesis stands.
**Consequence:** Without a key by the deadline, SOOTH-C1 and C5 cannot reach `executed-chikyu`; they stay at `tested-local` and are reported that way.

## D-015 · 2026-11-01 · Sooth validates the price timestamp itself

**PRD:** I-4, §9.1 `validateTimestamp`.
**Observed:** In evm-connector 1.0.0, `getOracleNumericValuesAndTimestampFromTxMsg` returns the package timestamp but does not validate it (comment in `RedstoneConsumerNumericBase.sol`).
**Decision:** `trigger` calls the overridden `validateTimestamp(ts)` explicitly. Without it, a caller could replay an old, low signed price. T-N3 covers it.

## D-016 · 2026-11-01 · Revert assertions are checked by hand, proven by mutation

**PRD:** §13 ("every negative test must assert the specific custom error").
**Observed:** `vm.expectRevert` (Foundry 1.7.1) did not fail tests whose low-level `call` to `trigger` succeeded. With `validateTimestamp` deleted, T-N3 still passed while the trigger completed a full sell.
**Decision:** Negative tests that go through a low-level call use `_assertRevert(ok, ret, expected)`, which requires `ok == false` and byte-equal revert data. A mutation run (16 mutants: each safety check in Sooth and the venue removed or weakened) now fails at least one test for every mutant. Re-run it after any change to `Sooth.sol` or `BackstopVenue.sol`.

## D-017 · 2026-11-01 · Deployed to Chikyū

**PRD:** §14 E-1, E-2, E-6, E-7; §22 G2.
**Record:** `deployments/chikyu-v1-redstone.json` (superseded by D-018). TestDollar `0x421a…0dff`, BackstopVenue `0x0bf7…3aea`, Sooth `0x858c…c0a4` (block 9,094,775), all source-verified on Blockscout. The deploy cost 0.58 DOGE; E-2/E-6/E-7 cost 0.037 DOGE. `priceDecimals = 8` in the venue is still UNVERIFIED until G0-3; if G0-3 finds otherwise, redeploy the venue and Sooth.
**Not yet possible:** E-3, E-4, E-5 (need the RedStone key) and live mode in the app (needs the DogeOS clientId).

## D-018 · 2026-11-02 · Own price signers replace RedStone primary-prod

**PRD:** §1.4, §5, §7.2 G0-1/G0-3/G0-5, §9.1 I-4, §23 K-1. §3 "upstream wins".
**Observed:** RedStone's public gateways stopped serving for good on 2026-10-29 (gateway reply: "No API key works on these hosts"), and the owner could not get an API key. No other oracle is live on DogeOS (searched 2026-11-02). K-1 says stop; the owner chose to continue with an operator-run signer instead.
**Decision:** Sooth trusts five keys fixed at deploy (`contracts/src/PriceSignersConsumerBase.sol`) in place of primary-prod's five signers; threshold stays 3. Each key signs one exchange's DOGE/USD (Bitstamp, Gemini, Bitfinex, Gate.io in USDT, CoinGecko) in RedStone's data-package format, so the vendored connector still verifies every signature, counts unique signers, takes the median and Sooth still enforces 60 s age and arm-time freshness. The connector keeps only the first 3 unique signers it reads, so the server (`app/src/lib/price.server.ts`) signs exactly the three middle quotes: the on-chain median equals the median of every exchange that answered (checked on a Chikyū fork, then on-chain). Keys live in `PRICE_SIGNER_KEYS` in `app/.env.local` (server only, gitignored); `scripts/price-signers.mjs` creates them and prints addresses only.
**What this gives up:** the price is no longer signed by independent parties. Whoever holds the keys could sign any price, so the oracle trust is now "the Sooth operator". The app, claims and landing say so; "RedStone on DogeOS" is no longer claimed.
**Redeployed (v2):** TestDollar `0xc6a3…4361`, BackstopVenue `0x8ddb…2fa`, Sooth `0x3ec8…9db5` (block 9,120,114), source-verified on Blockscout (`evidence/chikyu/e-1.json`); deploy 0.84 DOGE. v1 records moved to `deployments/chikyu-v1-redstone.json` and `evidence/chikyu/v1-redstone/`.
**Recorded on v2:** E-2, E-3 (reverted `PriceAboveStop`), E-4 (sold 5 DOGE at $0.075304), E-5 (holder kept 35.39 DOGE, floor 2; venue +5 DOGE exactly), E-6, E-7, plus a second trigger after the sell reverting `NoActiveStop`. All PASS. Tests: 31 contract tests; 2 new mutants (duplicate-signer check, fifth signer) both caught.
**To switch back to RedStone:** make `Sooth` inherit `PrimaryProdDataServiceConsumerBase` again, restore the SDK fetch with a key, redeploy.
