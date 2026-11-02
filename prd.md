# Sooth: Product Requirements Document

| Field | Value |
|---|---|
| Product | Sooth |
| Mechanism | Tripwire: an oracle-gated pull of native DOGE |
| Event | VIBE CODE ON DOGE (DogeOS with Noah AI) |
| Target prizes | Best DeFi, Grand Prize, Best Overall |
| Network | DogeOS Chikyū testnet, chain ID 6281971 |
| Submission deadline | Before 6 Nov 2026. Timezone not stated, so treat **5 Nov 2026 23:59 UTC** as the hard stop |
| Owner | Heisbei (solo) |
| Status | Pre-build. Gate G0 not yet run |
| Version | 1.0, 2026-10-31 |

Cite this document by section number (`§9.3`) in code comments, commits and `DECISIONS.md`.

---

## 0. Agent Operating Contract

This applies to Noah AI and to any coding agent working on Sooth.

1. Read this PRD end to end before generating anything. When building a surface, re-read its section; do not rebuild requirements from memory.
2. **Noah AI is the build surface.** The submitted app and its contracts are produced through Noah prompts. Every prompt and every hand edit goes in `noah/PROMPTS.md`. Any hand edit Noah could not make is recorded in `DECISIONS.md` with the reason.
3. **Upstream wins.** If an assumption here conflicts with current DogeOS, RedStone or Noah behaviour, the observed behaviour wins. Record the difference in `DECISIONS.md` and adapt while keeping the core claim (§1.4).
4. Never invent an ABI, a contract address, a feed ID or a calldata layout. Read it from the pinned package or a live call first.
5. Never present a mock as shipped. If an integration is blocked, mark the claim `unavailable` in `evidence/claims.json` and say so in the README.
6. Claim only what has executed. Every claim lands in the same commit as its evidence (§15).
7. Ask the owner only for secrets, funds, permissions, or an item marked `OWNER DECISION` (§25).
8. Never print or commit a private key. Use `.env` locally and `.env.example` in the repo.
9. Vocabulary rule: never write "safe", "protected", "guaranteed" or "risk-free" about Sooth in UI, README or claims. Write what the contract enforces: "will not sell above", "leaves at least".

---

## 1. Product Summary

### 1.1 One sentence
Sooth sells a holder's native DOGE only when RedStone's DOGE/USD on DogeOS crosses their stop, pulling it straight from their wallet and always leaving DOGE for gas.

### 1.2 Name
"Sooth" is old English for truth. The sell happens only on a signed price, not on anyone's word.

### 1.3 Judge-compressed narrative
DOGE holders keep coins in self-custody wallets like MyDoge. Those wallets have no stop-loss, so a holder who wants one must move coins to an exchange. DogeOS is the one chain where the native gas coin is also an ERC-20 that a contract can pull. Sooth uses that: the holder approves an exact amount and sets a stop. Anyone can fire the trigger, but the contract checks a RedStone price signed by three independent signers in the same call, and refuses to sell above the stop or take the holder's last DOGE for gas.

### 1.4 Core claim (negative)
> "With Sooth, your DOGE cannot be sold while RedStone's DOGE/USD is above your stop, and the DOGE you set aside for gas can never be taken."

The precise version is in §15. The precise version is the one that ships.

---

## 2. Competition Requirements

| Requirement | Source | Status |
|---|---|---|
| Working application on DogeOS testnet | https://x.com/DogeOS (Oct 19 post) | Verified |
| Built with Noah AI | Entrant write-up: https://github.com/metafrogmeme-droid/001/blob/main/docs/hackathon/VIBE_CODE_ON_DOGE.md | `UNVERIFIED` |
| Submission fields: name, description, "DogeOS Integration" paragraph, Noah AI project, screenshots, demo | Same | `UNVERIFIED` |
| No stakes, wagers, presale or token content | Same | `UNVERIFIED`, see `OWNER DECISION` OD-1 |
| Judging: Functionality, DogeOS integration, Originality, User experience, Potential (unweighted) plus Community Vote | Same | `UNVERIFIED` |
| Prizes: Grand 10,000 · Best Overall 8,000 · Best DeFi 6,000 · Best Gaming 6,000 · Community Vote 6,000 DOGE | Same; total 36,000 verified at https://x.com/DogeOS | Split `UNVERIFIED` |

Before building, the owner pastes the official rules from the listing page into `docs/RULES.md` and re-checks this table.

---

## 3. Problem

**Person:** a DOGE holder who keeps coins in a self-custody wallet such as MyDoge, which markets "your keys, your Dogecoin" (https://dgm-dc1.pages.dev).

**Moment:** DOGE falls hard while they are away, as in the 10 Oct 2025 liquidation cascade that RedStone describes as historic (https://blog.redstone.finance/2025/12/23/redstone-in-2025-redefining-what-blockchain-oracles-and-defi-risk-ratings-can-do/). DOGE is ~60% below a year ago (https://finance.biggo.com/news/7ca48807-48e1-4856-a30d-0b116e427c35).

**Loss:** they had no stop-loss without moving coins to an exchange, which gives up the custody they chose.

**Why now:** DogeOS opened its testnet on 30 Sep 2026, and RedStone price feeds went live there on 26 Oct 2026 as the first oracle in the Dogecoin ecosystem (https://www.tokenpost.com/news/technology/41267). A price-conditioned action on DOGE was not possible on Dogecoin before this month.

---

## 4. Product Thesis

### 4.1 Thesis
A stop-loss does not need custody. It needs three things: (a) authority to move a capped amount, (b) a price nobody in the transaction can choose, and (c) a floor the sell cannot go below. On DogeOS all three fit in one contract call against the holder's own wallet.

### 4.2 Why the obvious fix fails
The obvious build is a limit-order contract: the holder deposits DOGE (or wraps it to wDOGE), and a keeper sells when its own price check passes.
1. **Custody.** The DOGE leaves the wallet for days or weeks. Doge holders remember dogetipbot zeroing custodial balances in 2017 (https://gizmodo.com/reddit-users-lose-real-money-after-meme-currency-bot-di-1795125165). Wrapped DOGE does not convert back to native DOGE automatically (https://docs.dogeos.com/en/developers/native-doge-erc20).
2. **Keeper-chosen price.** If the keeper supplies the price, the keeper can sell early.
3. **DogeOS-specific trap.** Approving native DOGE means approving your gas token. A full-balance sell leaves 0 DOGE, and the holder cannot even pay to revoke the approval.

### 4.3 Why DogeOS only (F1)
On other EVM chains the native gas coin is not an ERC-20, so "native ETH has to be wrapped before you can use it for limit orders" (https://docs.dex.guru/features/limit-orders). On DogeOS, native DOGE is exposed at `0x530000000000000000000000000000000000d09e`, and `balanceOf` returns the native balance (https://docs.dogeos.com/en/developers/native-doge-erc20).

---

## 5. Dominant Mechanism

### 5.1 Flow
```
holder  ── approve(Sooth, 98 DOGE) on native DOGE 0x5300…d09e
holder  ── arm(stopPrice=$0.0700, amount=98 DOGE, gasFloor=2 DOGE, expiry)
anyone  ── trigger(holder) + RedStone payload appended to calldata
Sooth   ── verify ≥3 primary-prod signers, price age ≤ 60 s, price time ≥ armedAt
Sooth   ── price ≤ stopPrice ?            else revert PriceAboveStop
Sooth   ── balanceOf(holder) − 98 ≥ 2 ?   else revert BelowGasFloor
Sooth   ── transferFrom(holder, venue, 98)  → venue pays out at the same price
venue   ── proceeds − 0.5% → holder ; 0.5% → caller ; stop disarmed
```

### 5.2 Invariants (each has a test in §13 and a claim in §15)
- **I-1** No sell when the signed price is above `stopPrice`.
- **I-2** After a sell, `balanceOf(holder) ≥ gasFloor`.
- **I-3** Before a trigger, Sooth and the venue hold none of the holder's DOGE.
- **I-4** The price used must be signed by ≥3 authorised RedStone primary-prod signers, at most 60 s old, and not older than the moment the stop was armed.
- **I-5** A stop fires at most once. After a fire, cancel or expiry, `trigger` reverts.
- **I-6** The caller fee is a fixed 50 bps of proceeds and cannot be changed after deploy.
- **I-7** Sooth never moves more than `amount` from a holder, whatever the allowance.

---

## 6. Trust Boundary

| Party | Trusted for | Not trusted for |
|---|---|---|
| Holder | Choosing stop, amount, floor | n/a |
| Trigger caller (anyone) | Paying gas to submit | Choosing the price. The price must be signed (I-4) |
| RedStone primary-prod signers (3 of 5) | Signing DOGE/USD honestly | n/a. This is the oracle trust assumption, stated plainly |
| DogeOS sequencer, validators, TEE | Ordering and including transactions | n/a. Ordering is "not guaranteed by the protocol" (https://docs.dogeos.com/en/developers/ethereum-and-dogeos-differences) |
| Venue owner (testnet backstop) | Funding the test payout token | n/a. The venue is a testnet stand-in, labelled as such everywhere |

**Residual caller power (state it, don't hide it):** a caller may pick which valid signed package to submit within the 60 s window. Worst case, the trigger uses the lowest valid price in that window. The claim in §15 is written to that bound.

---

## 7. Technical Feasibility Gate (G0)

Run before any other build work. Each item records PASS or FAIL with raw evidence in `evidence/g0/`.

### 7.1 Already verified in package source (2026-10-31)
| Item | Evidence |
|---|---|
| RedStone pull consumer: `getOracleNumericValueFromTxMsg(bytes32)` and `getOracleNumericValuesAndTimestampFromTxMsg(bytes32[])` | `@redstone-finance/evm-connector@1.0.0`, `contracts/core/RedstoneConsumerNumericBase.sol` |
| Primary-prod service: `redstone-primary-prod`, 5 authorised signers, threshold 3 | `contracts/data-services/PrimaryProdDataServiceConsumerBase.sol` |
| `validateTimestamp` is `virtual`; defaults are 3 min delay and 1 min ahead | `contracts/core/RedstoneConsumerBase.sol`, `RedstoneDefaultsLib.sol` |
| Client payload helpers: `WrapperBuilder.wrap(c).usingDataService(...)` and `getRedstonePayloadForManualUsage(contract)` | `dist/src/WrapperBuilder.d.ts`, `dist/src/wrappers/BaseWrapper.d.ts` |
| Test harness: `AuthorisedMockSignersBase`, `usingSimpleNumericMock({ mockSignersCount, ... })` | `contracts/mocks/`, `dist/src/wrappers/SimpleMockNumericWrapper.d.ts` |
| DogeOS SDK v4.0.5: `WalletConnectProvider`, `useAccount`, `useWalletConnect`, social login `"google" \| "x"`, MyDoge native-first | `@dogeos/dogeos-sdk@4.0.5`, `dist/index.d.ts` |
| ecrecover is supported on DogeOS | https://docs.dogeos.com/en/developers/ethereum-and-dogeos-differences |
| `@redstone-finance/evm-connector` depends on ethers v5 (`@ethersproject/*`) | `package.json` |

### 7.2 Must be verified on Chikyū before building
| ID | Check | Pass condition | If it fails |
|---|---|---|---|
| G0-1 | RedStone primary-prod serves a `DOGE` feed | A live package for `DOGE` returns a value; record its decimals (expected 8, `UNVERIFIED`) | Look for a DogeOS push feed address from RedStone or DogeOS. If none, kill (§23 K-1) |
| G0-2 | A contract can call `transferFrom` on native DOGE `0x5300…d09e` | A 20-line probe contract pulls 1 DOGE from an approving EOA; the balance moves | Kill (§23 K-2) |
| G0-3 | A RedStone-consuming contract works on Chikyū | A probe inheriting `PrimaryProdDataServiceConsumerBase` returns the DOGE value in a tx | Try a 120 s delay window. Else kill (§23 K-1) |
| G0-4 | Noah can generate and deploy a contract that inherits RedStone's base and imports from npm | Deployed from Noah to Chikyū | `OWNER DECISION` OD-2 |
| G0-5 | A Noah frontend can append the RedStone payload to a call | One wrapped call succeeds from the Noah app | Use `getRedstonePayloadForManualUsage` + raw calldata via viem. Else OD-2 |
| G0-6 | The DogeOS SDK runs in the Noah app as a top-level page | Connect works with MyDoge native-first and X login | Fall back to injected wallet + X login only; record it |
| G0-7 | Contract verification on l2scan or Blockscout | Source shows as verified | Publish source + bytecode match script in repo |
| G0-8 | Gas floor sizing | Record the fee of one `approve(0)` revoke in DOGE | Set `MIN_GAS_FLOOR` to at least 10× that fee |
| G0-9 | Official rules allow a test payout token | Rules read in `docs/RULES.md` | OD-1 |

**Stop boundary:** nothing past G0 is built until G0-1 to G0-4 pass.

---

## 8. System Architecture

### 8.1 Components
```
┌───────────────── Noah-built web app (top-level page) ─────────────────┐
│ DogeOS SDK v4 connect · Arm · Status · Trigger · Receipt · /verify     │
│ RedStone payload builder (primary-prod, DOGE)                          │
└───────────────┬───────────────────────────────────────┬───────────────┘
                │ approve (exact)                        │ trigger + payload
                ▼                                        ▼
   Native DOGE ERC-20 0x5300…d09e  ◄── transferFrom ── Sooth.sol ── sell() ──► ISellVenue
                                                        (RedStone consumer)    BackstopVenue.sol
                                                                                (testnet stand-in)
```

### 8.2 Repository layout
```
sooth/
├── README.md              # thesis, claim, honesty table, verify-it-yourself
├── JUDGES.md              # timed path (§18)
├── DECISIONS.md           # append-only: D-001, D-002 …
├── BUILD_LOG.md
├── prd.md                 # this file
├── noah/PROMPTS.md        # every Noah prompt, in order, with outcome
├── contracts/
│   ├── src/Sooth.sol
│   ├── src/ISellVenue.sol
│   ├── src/BackstopVenue.sol
│   ├── src/TestDollar.sol           # only if OD-1 allows
│   ├── src/probes/                  # G0 probes
│   └── test/                        # §13
├── app/                   # Noah export of the frontend
├── evidence/
│   ├── claims.json        # §15, source of truth
│   ├── g0/                # raw G0 outputs
│   └── chikyu/            # tx hashes, receipts, balance reads
├── scripts/verify-claims.ts   # re-reads every claim from chain
└── docs/RULES.md · docs/kill-criteria.md
```

---

## 9. Contract Requirements

Solidity `^0.8.24` (matching the connector's `^0.8.17` floor), EVM target `osaka` or `cancun`. Forbidden: `block.prevrandao`, `selfdestruct`, `blobhash`, calls to precompiles 0x09 to 0x11 (https://docs.dogeos.com/en/developers/ethereum-and-dogeos-differences).

### 9.1 `Sooth.sol`
Inherits `PrimaryProdDataServiceConsumerBase` and a reentrancy guard.

**Constants and immutables**
| Name | Value | Note |
|---|---|---|
| `DOGE` | `0x530000000000000000000000000000000000d09e` | Native DOGE ERC-20 |
| `FEED_ID` | `bytes32("DOGE")` | Confirm in G0-1 |
| `MAX_PRICE_AGE` | 60 s | Overrides the 3 min default |
| `MAX_PRICE_AHEAD` | 30 s | Overrides the 1 min default |
| `CALLER_FEE_BPS` | 50 | Immutable (I-6) |
| `MIN_GAS_FLOOR` | 1 DOGE, raised by G0-8 if needed | |
| `venue` | `ISellVenue`, set in constructor | Immutable |

**Storage**
```solidity
struct Stop {
    uint128 amount;     // DOGE wei to sell
    uint128 gasFloor;   // DOGE wei that must remain
    uint64  stopPrice;  // RedStone units (expected 8 decimals)
    uint64  armedAt;    // block.timestamp at arm, seconds
    uint64  expiry;     // seconds; 0 = none
    bool    active;
}
mapping(address => Stop) public stops;
```

**Functions**
| Function | Behaviour |
|---|---|
| `arm(uint64 stopPrice, uint128 amount, uint128 gasFloor, uint64 expiry)` | Requires `amount > 0`, `gasFloor ≥ MIN_GAS_FLOOR`, `stopPrice > 0`, expiry in the future or 0. Overwrites any existing stop. Sets `armedAt`. Emits `Armed`. Does **not** move DOGE |
| `cancel()` | Sets `active = false`. Emits `Cancelled`. The UI then prompts a revoke (`approve(Sooth, 0)`) |
| `trigger(address holder)` | Payload appended to calldata. Checks in order: active, not expired, price and timestamp via `getOracleNumericValuesAndTimestampFromTxMsg([FEED_ID])`, `ts ≥ armedAt × 1000`, `price ≤ stopPrice`, `DOGE.balanceOf(holder) ≥ amount + gasFloor`. Then sets `active = false` before any external call, calls `DOGE.transferFrom(holder, venue, amount)`, then `venue.sell(holder, amount, price, msg.sender, CALLER_FEE_BPS)`. Emits `Triggered` |
| `validateTimestamp(uint256 ms)` (override) | Reverts if older than `MAX_PRICE_AGE` or more than `MAX_PRICE_AHEAD` ahead of `block.timestamp` |
| `preview(address holder, uint256 price)` view | Returns whether a trigger at `price` would pass each check, for the UI |

**Errors** (decoded by the UI, §10.5): `NoActiveStop()`, `StopExpired()`, `PriceAboveStop(uint256 price, uint256 stopPrice)`, `PriceOlderThanArm(uint256 priceTs, uint256 armedAt)`, `BelowGasFloor(uint256 balance, uint256 amount, uint256 gasFloor)`, `GasFloorTooLow()`, `BadAmount()`.

**Events:** `Armed(holder, stopPrice, amount, gasFloor, expiry)`, `Cancelled(holder)`, `Triggered(holder, caller, price, priceTimestamp, amount, proceeds, fee)`.

### 9.2 `ISellVenue.sol`
```solidity
function sell(address holder, uint256 dogeAmount, uint256 price, address caller, uint256 feeBps)
    external returns (uint256 proceeds);
```
Only `Sooth` may call it. The venue must pay out using the `price` passed in, so the sell price equals the trigger price.

### 9.3 `BackstopVenue.sol` (testnet stand-in)
- Pays `proceeds = dogeAmount × price / 10^priceDecimals` in the payout token, minus the fee, to `holder`, and the fee to `caller`.
- Holds the received DOGE. Uses `DOGE.balanceOf(this)` only and never adds the native balance on top (double-count rule, https://docs.dogeos.com/en/developers/native-doge-erc20).
- Reverts `VenueInsolvent` if it lacks the payout token. Seeded at deploy.
- Labelled "testnet backstop, not market liquidity" in the UI, README and claims.

### 9.4 Payout token
Default: `TestDollar.sol` ("Sooth Test Dollar", symbol `tDOLLAR`, 18 decimals, minted once to the venue, no market). Preferred alternative: a DogeOS testnet stablecoin such as USDoge, if one exists and can be held by the venue (`UNVERIFIED`). The choice is `OWNER DECISION` OD-1.

### 9.5 Decimals
DOGE: 18. RedStone value: expected 8 (`UNVERIFIED` until G0-1). Payout token: 18. All math in `uint256`, multiply before divide, round down in the holder's disfavour by at most 1 wei and document it.

---

## 10. Client Requirements

### 10.1 Stack
The Noah-generated frontend (React/Next.js as Noah outputs it). If Noah's output uses viem/wagmi and the RedStone wrapper needs ethers v5, keep ethers v5 isolated to the trigger module, or use `getRedstonePayloadForManualUsage` and append the payload to viem calldata (G0-5).

### 10.2 Wallet connect
- `@dogeos/dogeos-sdk@^4.0.5` `WalletConnectProvider` with `dogeOSChikyuTestnet` (chain 6281971) under `chains.evm`.
- Logins: MyDoge native-first, X, Google, external wallets. Requires a DogeOS `clientId` (owner provides).
- Must run as a **top-level page**. Native wallet calls fail from a child frame in MyDoge (https://docs.dogeos.com/en/sdk/embedded-wallets).
- Gate wallet actions on `isWalletReady`, not on sign-in. Sign-in alone is not wallet-ready (same source).

### 10.3 Price
Show the current RedStone DOGE/USD from the same data service the contract uses, with its timestamp and the "3 of 5 signers" note. Refresh every 10 s.

### 10.4 Balances and history
- Read DOGE with `balanceOf` / `eth_getBalance`. **Never** build DOGE history by summing `Transfer` logs: gas, value sends and bridge moves emit none (https://docs.dogeos.com/en/developers/native-doge-erc20).
- Build the activity feed from Sooth's own events.

### 10.5 Fees and errors
- Show the full fee in DOGE: execution plus data-and-finality fee, read from `L1GasPriceOracle.getL1Fee` at `0x5300000000000000000000000000000000000002` (https://docs.dogeos.com/en/developers/transaction-fees-on-dogeos).
- Decode every custom error from §9.1 into one plain sentence, and link the failed tx on l2scan.

### 10.6 Approvals
Approve the **exact** `amount`, never unlimited, as the docs advise. After `cancel`, offer a one-click revoke.

---

## 11. Product Surfaces

| Surface | Contents | Success state | Failure state |
|---|---|---|---|
| **Landing** `/` | One sentence (§1.1), the core claim (§1.4), live DOGE/USD, "Connect" | Connected, routed to Arm | SDK not ready: "Wallet is still starting. Try again in a moment." |
| **Arm** `/arm` | Wallet DOGE balance, amount, gas floor (default 2 DOGE), stop price, expiry; a preview line: "Sooth will sell 98 DOGE only if DOGE/USD ≤ $0.0700, and will leave at least 2 DOGE." Buttons: "Allow Sooth to sell up to 98 DOGE" then "Arm stop" | Armed, routed to Status | `GasFloorTooLow`, `BadAmount`, insufficient balance shown inline |
| **Status** `/status` | Stop, live price, distance to stop in %, expiry countdown, allowance left, "Cancel" and "Revoke" | Live view | Stop inactive: show the last event |
| **Trigger** `/trigger/[holder]` | Public. Current price vs stop, `preview()` result per check, "Trigger" button | Receipt | Decoded revert with l2scan link, e.g. "Not sold: DOGE/USD $0.0771 is above the stop $0.0700." |
| **Receipt** `/receipt/[tx]` | Price used and its timestamp, DOGE sold, payout received, fee to caller, holder DOGE before and after, gas floor met, l2scan link | n/a | n/a |
| **Verify** `/verify` | For judges: contract addresses (verified source), `CALLER_FEE_BPS`, `MAX_PRICE_AGE`, signer threshold, links to the two demo txs (revert and sell), a "Try a trigger above the stop" button on a demo holder | n/a | n/a |

Copy rules: short declarative sentences; numbers over adjectives; the vocabulary rule (§0.9). No green "safe" badge.

---

## 12. Security Model

### 12.1 Assets
The holder's DOGE under allowance; the venue's payout token; the integrity of the stop condition.

### 12.2 Adversaries and required properties
| Adversary | Attack | Required property |
|---|---|---|
| Trigger caller | Sell early with a fake price | I-4: signed by ≥3 authorised signers, else revert |
| Trigger caller | Replay an old low price | `MAX_PRICE_AGE` 60 s and `ts ≥ armedAt` |
| Trigger caller | Pick the lowest valid package in the window | Accepted residual; bounded by 60 s; disclosed (§6, §15) |
| Trigger caller | Drain the holder's gas | I-2: `BelowGasFloor` |
| Trigger caller | Take more than armed | I-7: transfer exactly `amount` |
| Trigger caller | Fire twice | I-5: `active = false` before external calls |
| Malicious venue | Underpay | Venue is immutable and part of the audited set; proceeds checked against `price` in tests |
| Holder's other dApps | Spend the allowance elsewhere | The allowance is per spender; Sooth's allowance is used only by Sooth |
| Reentrancy | Re-enter via venue | Native DOGE transfers run no recipient code (docs); guard anyway |
| Sequencer | Delay or reorder | Out of scope; disclosed. Reorg depth up to 17 blocks (https://docs.dogeos.com/en/developers/ethereum-and-dogeos-differences) |

### 12.3 Known limitations (shown in README)
- Sooth sells only when someone calls `trigger`. There is no hosted keeper in this build.
- Gap risk: if the price falls far below the stop before a trigger, the sell happens at that lower signed price.
- The venue is a testnet stand-in with a test payout token.
- Oracle trust: 3 of 5 RedStone primary-prod signers.

---

## 13. Testing Strategy

Harness: a `SoothHarness` that inherits Sooth and `AuthorisedMockSignersBase` and uses the connector's mock wrappers. Mock native DOGE with an ERC-20 whose `balanceOf` mirrors the native balance, plus one test on Chikyū against the real `0x5300…d09e`.

| ID | Test | Expects |
|---|---|---|
| T-P1 | Arm, price below stop, trigger | Sold; holder DOGE = before − amount; proceeds = amount × price minus fee; caller got fee |
| T-N1 | Price above stop | `PriceAboveStop` (I-1) |
| T-N2 | Balance − amount < gasFloor | `BelowGasFloor` (I-2) |
| T-N3 | Package older than 60 s | Timestamp revert (I-4) |
| T-N4 | Package timestamp before `armedAt` | `PriceOlderThanArm` (I-4) |
| T-N5 | Only 2 authorised signers | Insufficient signers revert (I-4) |
| T-N6 | One unauthorised signer | `SignerNotAuthorised` (I-4) |
| T-N7 | Second trigger after a fire | `NoActiveStop` (I-5) |
| T-N8 | Trigger after cancel / after expiry | `NoActiveStop` / `StopExpired` (I-5) |
| T-N9 | Allowance larger than amount | Exactly `amount` moved (I-7) |
| T-N10 | Non-Sooth calls `venue.sell` | Revert |
| T-N11 | Venue lacks payout token | `VenueInsolvent`, and no DOGE moved |
| T-I1 | Sooth and venue hold 0 of holder's DOGE before trigger | I-3 |
| T-F1 | Fuzz: price, amount, floor, balance | I-1, I-2, I-7 hold for all inputs |

All negative tests must assert the specific custom error, not just "reverts".

---

## 14. Evidence Plan (Chikyū)

Each item lands in `evidence/chikyu/` with tx hash, block, and the read that proves it.

| ID | Evidence |
|---|---|
| E-1 | Deploy txs and verified source links for Sooth, venue, payout token |
| E-2 | Demo holder `approve` (exact amount) and `arm` txs |
| E-3 | `trigger` with price above stop → reverted tx, decoded `PriceAboveStop` |
| E-4 | `trigger` with price below stop (stop armed above the live price) → success tx; `Triggered` event |
| E-5 | Balance reads before and after E-4: holder DOGE ≥ gasFloor; venue DOGE += amount |
| E-6 | `balanceOf(Sooth) == 0` and `balanceOf(venue)` before E-4 (I-3) |
| E-7 | `cancel` then `trigger` → `NoActiveStop` |
| E-8 | Noah project link and `noah/PROMPTS.md` |

`scripts/verify-claims.ts` re-reads E-1 to E-7 from chain and fails on any mismatch.

---

## 15. Claim and Evidence Ledger

Source of truth: `evidence/claims.json`. A claim may not state more than its evidence reaches. Tiers: `executed-chikyu` › `tested-local` › `designed`.

| ID | Claim (precise) | Target tier | Evidence | Limitations |
|---|---|---|---|---|
| SOOTH-C1 | `trigger` reverts when the RedStone DOGE/USD value in the call, signed by ≥3 primary-prod signers and ≤60 s old, is above the holder's stop | executed-chikyu | E-3, T-N1, T-N3 to T-N6 | Caller may choose among valid packages within 60 s |
| SOOTH-C2 | After any successful trigger, the holder's native DOGE balance is ≥ their gas floor | executed-chikyu | E-5, T-N2, T-F1 | Floor is set in DOGE, not in fee units; the holder can still spend it themselves |
| SOOTH-C3 | Before a trigger, Sooth and the venue hold none of the holder's DOGE | executed-chikyu | E-6, T-I1 | An allowance is still authority; revoke after cancel |
| SOOTH-C4 | A stop fires at most once and never moves more than its armed amount | tested-local, then executed-chikyu | E-7, T-N7 to T-N9 | n/a |
| SOOTH-C5 | The payout uses the same signed price as the trigger | tested-local | T-P1 | Testnet backstop venue and test payout token; no market liquidity or slippage |
| SOOTH-C6 | The app and contracts were built with Noah AI | executed | E-8 | Hand edits listed in `DECISIONS.md` |

**Deliberately not claimed:** that Sooth prevents losses; execution at exactly the stop price; real liquidity; mainnet readiness; that anyone will call `trigger` in time.

---

## 16. Design Requirements

- Tone: plain and numeric. The interface shows prices, amounts and tx links, not adjectives.
- The core claim sentence appears on Landing, Arm (as the preview line), Receipt and README.
- Prices to 4 decimals in USD, DOGE to 2 decimals in display, full precision in tooltips.
- Use DogeOS brand assets only as permitted by the brand kit (https://docs.dogeos.com/en/home, "Brand kit").
- Accessible contrast; works on a phone inside MyDoge's dApp browser.

---

## 17. Judging-Criteria Mapping

| Criterion (unweighted, `UNVERIFIED`) | How Sooth answers it | Where a judge sees it |
|---|---|---|
| Functionality | Two clickable outcomes on Chikyū: revert above the stop, sell below it | `/verify`, E-3, E-4 |
| DogeOS integration | Native DOGE ERC-20 pull with no wrapping; RedStone on DogeOS; SDK v4 MyDoge and X login; full DogeOS fee readout | §9.1, §10.2, §10.5 |
| Originality | A stop-loss where the native coin stays in the wallet, with a gas floor that only matters on a chain where the gas token is approvable | README thesis, §4.3 |
| User experience | One approval, one stop price, no deposit; every revert explained in one sentence | `/arm`, `/trigger` |
| Potential | MyDoge's 500k+ holders at mainnet (https://cryptobriefing.com/dogecoin-labs-mydoge-dogeos-such-app/); the venue adapter can point at a DogeOS DEX later | README "After the hackathon" |

---

## 18. Judge Experience (`JUDGES.md`)

Top line of `JUDGES.md`: the true gate count, for example "Gates passed: 5 of 6".

1. **0:00 to 0:30** Read the README's first paragraph and the core claim.
2. **0:30 to 1:15** Open `/verify`. Click "Try a trigger above the stop". See the decoded revert and its l2scan link.
3. **1:15 to 2:00** Open the E-4 sell tx. Check that holder DOGE after ≥ gas floor.
4. **2:00 to 2:30** Read `Sooth.sol` `trigger()` (about 30 lines) and the "Not claimed" list.
5. **2:30 to 3:00** Open `evidence/claims.json` and run `pnpm verify:claims`.

---

## 19. Demo Script

### 19.1 Core moment (under 30 s)
1. "100 DOGE in a MyDoge wallet on DogeOS. Stop armed at $0.0700."
2. Press Trigger while DOGE/USD is above the stop. "Reverted. Price above stop." Show l2scan.
3. Re-arm the stop just above the live price. Press Trigger. "98 DOGE sold at the signed price. 2 DOGE left for gas. Before this second, the DOGE never left the wallet."

### 19.2 Full video (2 minutes)
Problem (15 s) → core moment (30 s) → why it only works on DogeOS (20 s) → one negative test running (15 s) → `/verify` and the claims ledger (25 s) → limitations, read aloud (15 s).

---

## 20. Competitive Positioning

| Existing | What it does | What Sooth does differently |
|---|---|---|
| Super Order, 1inch bounty 1st (https://ethglobal.com/showcase/super-order-x6z63) | Stop-market orders on ERC-20s | Sells the native coin from the wallet; gas floor |
| 1inch Limit Order Protocol (https://github.com/1inch/limit-order-protocol) | Oracle-conditioned orders; native ETH via wrap | No wrap step exists on DogeOS |
| Exchange stop orders | Stop-loss under exchange custody | Self-custody until the trigger |
| DogeOS ecosystem (27 listed apps, https://trustswap.com/dogeos/ecosystem) | DEX, perps, lending, launchpads, games | None listed offers conditional sells |

---

## 21. Non-Goals

- Real DEX liquidity or routing (the venue adapter allows it later)
- Take-profit ladders, trailing stops, multiple assets
- A hosted keeper service or keeper incentives beyond the 50 bps caller fee
- Mainnet deployment
- Any token launch, presale or speculative token
- Bridging from Dogecoin L1
- Mobile native app

---

## 22. Acceptance Gates

| Gate | Passes when |
|---|---|
| **G0 Feasibility** | §7.2 items G0-1 to G0-4 PASS with raw evidence; G0-5 to G0-9 PASS or recorded with a fallback |
| **G1 Contracts** | All §13 tests pass locally; every negative test asserts its custom error |
| **G2 Deployed** | Sooth, venue and payout token deployed on Chikyū and source-verified (E-1) |
| **G3 On-chain evidence** | E-2 to E-7 recorded; `pnpm verify:claims` passes against chain |
| **G4 App** | Every §11 surface works from a fresh browser with X login, and inside MyDoge with native-first connect; every revert decodes to one sentence |
| **G5 Submission** | §24 deliverables complete; `JUDGES.md` shows the true gate count |

---

## 23. Kill Criteria and Escalation

If a condition becomes true: stop claiming the affected capability, mark it `unavailable` in `claims.json` with a plain blocker, keep building what still stands, and do not hide the gap behind a mock.

| ID | Condition | Affected | Action |
|---|---|---|---|
| K-1 | No DOGE/USD from RedStone on Chikyū (pull or push) | All claims | Stop. Switch to the runner-up (Tab) only if it has a price source; otherwise rethink |
| K-2 | Contracts cannot `transferFrom` native DOGE | C1 to C4 | Stop. The DogeOS-only thesis is gone |
| K-3 | Noah cannot produce a RedStone-consuming contract, and rules require Noah-built contracts | C6, eligibility | OD-2 |
| K-4 | Official rules forbid any payout token | C5 | OD-1; if no permitted venue, drop |
| K-5 | Price age cannot be held to ≤120 s on Chikyū | C1 wording | Narrow C1 to the observed bound and say so |

---

## 24. Submission Deliverables

- Public repo with README (thesis, claim, honesty table "What's real vs testnet stand-in", "Not claimed", verify-it-yourself), `JUDGES.md`, `DECISIONS.md`, `BUILD_LOG.md`, `evidence/claims.json`, `noah/PROMPTS.md`
- Live app URL (Noah deployment)
- Noah AI project link
- Verified contract addresses on Chikyū
- Demo video (§19.2) and screenshots of each §11 surface
- "DogeOS Integration" paragraph:
  > "Sooth pulls native DOGE through the DogeOS native DOGE ERC-20 (0x5300…d09e), so holders never wrap or deposit. It checks RedStone's DOGE/USD on DogeOS in the same transaction, connects through the DogeOS SDK v4 (MyDoge native-first and X login), and shows the full DogeOS fee including the data-and-finality component."

---

## 25. Open Owner Decisions

| ID | Decision | Default if no answer |
|---|---|---|
| OD-1 | Payout token: `TestDollar` vs a DogeOS testnet stablecoin, subject to the official token rules | Use a DogeOS testnet stablecoin if one exists and is permitted; else `TestDollar` labelled as test-only |
| OD-2 | If Noah cannot build the RedStone contract: hand-write the contract and Noah-build the app, or switch ideas | Hand-write `Sooth.sol` only, record it in `DECISIONS.md`, and state it in the submission |
| OD-3 | Confirm the hard stop timezone from the listing | 5 Nov 2026 23:59 UTC |
| OD-4 | DogeOS SDK `clientId` (Sandbox vs Live) | Sandbox |

---

## 26. Definition of Done

Sooth is done when **every** line below is true and its evidence is in the repo. A line that cannot be made true is marked `unavailable` in `evidence/claims.json` and listed in the README. Done does not mean every line passed; it means every line is either passed or honestly reported.

**Feasibility and rules**
- [ ] G0-1 to G0-4 recorded as PASS in `evidence/g0/` with raw output
- [ ] Official rules pasted into `docs/RULES.md`; OD-1 to OD-4 resolved and logged in `DECISIONS.md`

**Contracts**
- [ ] `Sooth.sol`, `ISellVenue.sol`, `BackstopVenue.sol` (and the payout token if used) compile for the chosen EVM target with no forbidden opcodes or precompiles (§9)
- [ ] Every test in §13 passes; every negative test asserts its specific custom error
- [ ] Invariants I-1 to I-7 each map to at least one passing test
- [ ] `MAX_PRICE_AGE`, `CALLER_FEE_BPS` and the signer threshold are readable on-chain and match this PRD (or `DECISIONS.md` explains the difference)

**On-chain (Chikyū)**
- [ ] All contracts deployed and source-verified on l2scan or Blockscout
- [ ] A recorded `trigger` above the stop that reverts with `PriceAboveStop`
- [ ] A recorded `trigger` below the stop that sells exactly the armed amount and leaves the holder with ≥ gas floor
- [ ] A recorded `trigger` after `cancel` that reverts with `NoActiveStop`
- [ ] `pnpm verify:claims` re-reads all of the above from chain and passes

**App**
- [ ] Built and deployed through Noah AI; `noah/PROMPTS.md` lists every prompt; every hand edit is in `DECISIONS.md`
- [ ] Runs as a top-level page; connects with MyDoge native-first and with X login; wallet actions wait for `isWalletReady`
- [ ] All six §11 surfaces work end to end on Chikyū from a fresh browser
- [ ] Approvals are exact, never unlimited; revoke is one click after cancel
- [ ] Every custom error shows as one plain sentence with an l2scan link
- [ ] DOGE balances come from `balanceOf`, never from summed `Transfer` logs
- [ ] The fee readout includes the data-and-finality fee
- [ ] No UI or README text uses "safe", "protected", "guaranteed" or "risk-free"

**Claims and honesty**
- [ ] `evidence/claims.json` contains SOOTH-C1 to C6, each at a tier its evidence reaches, each with limitations
- [ ] README has the core claim, the precise claim, "What's real vs testnet stand-in", "Not claimed" and "Known limitations" (§12.3)
- [ ] `JUDGES.md` opens with the true gate count and follows the §18 path

**Submission**
- [ ] Demo video follows §19, with the core moment under 30 s
- [ ] Submission form filled: name, description, the "DogeOS Integration" paragraph (§24), Noah project link, screenshots, demo
- [ ] A clean clone, following README setup alone, reproduces the verify script's pass
- [ ] Submitted before 5 Nov 2026 23:59 UTC (or the confirmed OD-3 deadline)
