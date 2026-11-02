# Sooth: Frontend Spec (v2)

Derived from `prd.md` (cited as §n). Follows the design-taste-frontend skill. Replaces v1 (the dark "tripwire" build).
The landing is a **page** (the skill's page run); Arm, Status, Trigger, Receipt and Verify are **app screens** (its app run).
Where this file and the PRD disagree, the PRD wins. The data layer (`app/src/lib/*`) does not change; only presentation does.

Direction sheets: `.taste-skill/direction.json` (page) and `.taste-skill/app/direction.json` (app screens).

---

## 1. Who it is for

**A DOGE holder in a self-custody wallet** (§3), usually MyDoge, often on a phone. They chose custody on purpose and will not move coins to an exchange for a stop-loss. They read numbers, not adjectives (§16).

**A hackathon judge** (§18): on a laptop for three minutes, wants both outcomes and the proof behind every claim.

**A trigger caller**: anyone with a holder's trigger link, who wants to know whether a call will sell and what it earns.

| Page | Route | Kind | The one main action | The one question it answers first |
|---|---|---|---|---|
| Landing | `/` | page | Open app (to Arm; the wallet connects inside the app) | What is this, and why does it not need my coins? |
| Arm | `/arm` | app | Allow, then arm (one two-step job) | What will Sooth do with my DOGE? |
| Status | `/status` | app | Copy the trigger link (no keeper, §12.3) | How far is DOGE/USD from my stop? |
| Trigger | `/trigger/[holder]` | app | Trigger | Will this call sell, and why or why not? |
| Receipt | `/receipt/[tx]` | app | Open on Blockscout | What happened in this sale? |
| Verify | `/verify` | app | Try a trigger above the stop | Can I check every claim myself? |

---

## 2. Visual direction

### Thesis

**The printed annual** (page, seed 1601610367) and **Achromatic ledger** (app, seed 732920145), sharing one face and one red.
Sooth's name means truth, and it publishes only what has executed. So the landing is laid out like an edited findings report:
grey paper, oxblood ink, a masthead photograph, one column line, solid pages of red. The app screens are the ledger behind the
report: ink figures on white panels, and the one red only on the line that matters, your stop.

**The idea:** on this page, Sooth's ledger of claims and their on-chain proof becomes the findings of a printed report.
**The live thing:** "Set a stop, read it back": the reader moves a stop price, an amount and a gas floor, and a pinned stop
ticket rewrites itself in the PRD's own preview sentence (§11 Arm), with the wallet split and the payout at the stop.

### Palette (exact values)

Page (the printed annual, oxblood and grey):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#e2e2e2` | Paper: the page ground |
| `--surface` | `#d6d6d6` | One tone step: panels, calls, the live field's surround |
| `--ink` | `#7d0c14` | All running text and headings (8.0:1 on `--bg`) |
| `--muted` | `#7a4a4e` | Second ink: run-in continuations, captions (5.6:1 on `--bg`) |
| `--accent` | `#7d0c14` | The solid button; the red pages |
| `--accent-ink` / `--field-1-ink` | `#e2e2e2` | Text on red |
| `--field-1` | `#7d0c14` | Whole-section colour pages, CTA, footer |

App screens (achromatic ledger; brand mapped onto its roles):

| Token | Value | Use |
|---|---|---|
| `--ground` | `#efeeee` | Page ground, one level off white, a grey from the paper |
| `--surface` | `#ffffff` | Panels |
| `--raised` | `#f6f5f5` | Settings panels, action tiles |
| `--active` | `#e6e4e4` | Active rail icon band, pressed |
| `--border` | `#e6e3e3` | Panel edges (1px) |
| `--rule` | `#f0eeee` | Row rules |
| `--control` | `#cfcaca` | Input borders |
| `--text` | `#1c1213` | Ink: a near-black from the oxblood |
| `--muted` | `#5f5657` | Secondary (6.5:1 on white) |
| `--faint` | `#6b6263` | Placeholders, meta (5.6:1) |
| `--primary` | `#1c1213` | The one primary button (near-black, white label) |
| `--accent` | `#7d0c14` | The one data hue: the stop line, the stop figure. Under 1% of the screen |
| `--positive` | `#247b50` | A check that passes, a sale that settled |
| `--negative` | `#b4232a` | A check that fails, a revert |
| Pills | `#dcfae5`/`#04250e`, `#ffedea`/`#831c1e`, `#fffbeb`/`#92400e` | Status beside a value only |

### Type (one family)

**Hanken Grotesk** 400 and 500 only (Google Fonts). No second face, no monospace anywhere: every figure uses Hanken's tabular figures.

| Page step | Size | Use |
|---|---|---|
| `--step-small` | 13–14px | Captions, credits, legal |
| `--step-body` | 17–19px | Running text (full ink) |
| `--step-lead` | 20–26px | Supporting sentence, lead paragraph, exchange sentences |
| `--step-head` | 32–64px | Every section heading, one size |
| Display | 44–60px (3.9vw) hero; 9–11vw CTA | The h1 and the closing line |

Display: weight 500, tracking -0.05em, leading 0.9–1.08. Text: leading 1.45. Sentence case everywhere.

App: 12 / 14 / 16 / 20 / 24 / 32px; title 24px/500; the one headline figure per screen 32px/500; cells 14px; labels 12–13px grey.

### Spacing

4px base: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 88, 120, 160.
Page: margins 32px desktop, 20px tablet, 16px phone; section gap 120–160px desktop, 72–96px phone; the column axis at 42% of the width.
App: rail 56px; canvas gutter 32px desktop, 16px phone; card gap 16px; card padding 20px; control height 36px (44px on phone).
Radius: page square (0) everywhere, buttons included. App tight pair: panels 8px, controls 6px, pills 999px.

### Motion

Page (signature: **slow crossfade**): the hero photograph crossfades between three greyscale pictures of the same framing
(Taiki, the black-ground coin, the cream Shiba), 1.6s fade, 5.5s hold, paused when the tab is hidden; only the first under reduced
motion. Every section's parts enter once (heading, text, picture; 70ms stagger; rise 24px with opacity). Feedback on every
control (press 0.98, hover a tone step). One moving picture: Ron's clip as a muted loop with a poster. Transform and opacity only.
App screens: no entrances. Feedback only: hover tone step, press, focus ring, a menu or toast rising 6px.

---

## 3. Pages and sections, in build order

### 0. Shared frame

- **Preview line** (both kinds, while not live, §0.5): "Preview. Sooth is deployed on Chikyū, but wallet sign-in or the live price is not connected, so prices, balances and transactions here are samples. Verify shows the real contracts." (Before deployment: "Preview. Sooth is not deployed on Chikyū yet, so prices, balances and transactions here are samples.")
- **Page bar** (landing): wordmark "Sooth" left on the 32px margin; right: "Verify" as a menu word and **Open app** (to `/arm`) as a solid red rectangle.
- **App shell**: a 56px icon rail on the ground with a 1px edge: the Sooth mark (a stop wire glyph in red) at the top; Home, Arm, Status, Verify; at the bottom the wallet (address and balance, or Connect). A 56px top line on each screen carries the title, the live DOGE/USD and the primary action. Phone: a bottom bar of Home, Arm, Status, Verify with labels; the title row stays.

### 1. Landing `/` (page)

**Hero: View with two cards in the corner.** Full-viewport photograph, greyscale, subject in the right half (Taiki), slow crossfade to the coin and the cream Shiba. Dark neutral scrim under columns 1–6.
- h1: "A DOGE stop-loss in your own wallet" (break after "stop-loss")
- Sentence: "Sooth sells your native DOGE only when the signed DOGE/USD price falls to your stop, and always leaves DOGE for gas."
- Pinned fact on the picture's calm lower area, beside an 8px dot: "100 DOGE, still in your wallet"
- Two corner cards: "Both outcomes" (coin photograph → `/verify`) and "The contract" (Shiba photograph → Sooth on Blockscout). Short titles so each fits one line in its 40px bar on a phone.
- Action top-right: **Open app**.

**Intro: Lead line over four columns.**
- Lead: "MyDoge and other self-custody wallets have no stop-loss, so a holder who wants one has to hand coins to an exchange. Sooth adds one without moving a coin until the moment it sells."
- **Kept in your wallet.** You approve an exact amount, never unlimited. Sooth holds nothing before a trigger: on Chikyū, the contract and the venue held 0 of the test holder's DOGE while the stop was armed.
- **Sold at a signed price.** The contract reads DOGE/USD in the same call: the median of five exchanges, each signed by its own key. It needs 3 of 5 signers, a price no more than 60 seconds old, and a price at or below your stop. Nobody sending the transaction can choose it.
- **Gas left behind.** Approving your gas token is a trap: sell all of it and you can no longer pay to revoke. Every stop keeps a floor of at least 1 DOGE that the contract will not sell.
- **Fired by anyone.** There is no hosted keeper. Anyone can call trigger when the price reaches your stop, and earns 0.5% of the proceeds for paying the gas.
- **Mosaic** (gutterless, 4 cells, full bleed): Taiki close crop · red tile "2 DOGE kept for gas" · the wood-ground coin · Ron's clip.

**How it works: Call and response.** Left of the column line, sticky: the heading "Three calls, no deposit", the note "Two of them come from you. The third can come from anyone, and it only sells if the signed price says so." and the cream Shiba photograph. The exchanges hang from the line:
1. "First, allow Sooth to move an exact amount." Call: the amount field reading 98.00 DOGE. Response: allowance 98.00 DOGE, approve(Sooth, 98.00), network fee 0.0060 DOGE.
2. "Then arm the stop." Call: stop $0.0700, gas floor 2.00 DOGE. Response: Armed · stop $0.0700 · 98.00 DOGE · floor 2.00.
3. "When DOGE/USD reaches it, anyone fires it." Call: trigger(0x7a3f…91c2) with the signed price $0.0698. Response (wide): the receipt: sold 98.00 DOGE at $0.0698; paid 6.81 tDOLLAR; caller fee 0.03; holder kept 2.00 DOGE.

**Features: Fixed output, live controls (the live thing).** Heading "Set a stop, read it back".
Left, sticky red field: a stop ticket (data-ui) with the preview sentence, the wallet split and the payout at the stop. Right, four blocks:
- "Pick the price that ends it." The stop is the most DOGE/USD can be when it sells. Slider $0.0500–$0.0800.
- "Choose how much it may sell." It moves exactly this amount and no more, whatever the allowance. Slider 1–98 DOGE of a 100 DOGE wallet.
- "Keep DOGE for gas." What the contract leaves so you can still revoke. Choice 1 / 2 / 5 / 10 DOGE.
- "Give it an end." After this the stop cannot fire. Choice None / 24 hours / 7 days / 30 days.

**Why only DogeOS** (a red page). Heading "Only on DogeOS". Paragraph: "On other chains the gas coin is not a token, so a stop-loss means wrapping it or depositing it first. On DogeOS, native DOGE is also an ERC-20 at 0x5300…d09e, and a contract can pull it from your wallet directly." The proof beside it: "On 1 November 2026 a 20-line contract pulled exactly 1.00 DOGE from a test wallet on Chikyū, then gave it back." with the pull transaction linked. Picture: the black-ground coin, large.

**Proof: Plain names in columns.** Heading "Checked on Chikyū". Kinds, each starting a column:
- Deployed, source verified: Sooth · BackstopVenue · TestDollar · Native DOGE (each linked to Blockscout)
- Recorded on-chain: A contract pulled 1 DOGE · An exact approve and arm · No custody before trigger · Trigger after cancel, refused
- Tested: 28 contract tests · 16 of 16 breaks caught · 256 fuzzed stops
- Triggered at a signed price: Above the stop, refused · Below the stop, sold (E-3, E-4)

**List: Cards that fold into spines.** Heading "What Sooth does not do". Five cards in three red tones:
- "No hosted keeper": Sooth sells only when someone calls trigger.
- "Gap risk is yours": if the price falls far below your stop before a trigger, it sells at that lower signed price.
- "A testnet venue": the buyer is a backstop paying a test dollar, not market liquidity.
- "Oracle trust, stated": the price is the median of five exchanges, signed by keys the Sooth operator holds: 3 of 5, at most 60 seconds old. Not an independent oracle (DECISIONS.md D-018).
- "No promises it cannot keep": Sooth does not claim to prevent losses or to sell at exactly the stop.
Pinned for 2.2 screens on wide screens: each step slides the next card in; earlier cards fold to 120px spines that show their title set vertically, and a spine click brings its card back. Below: "5 limits, stated in the README and on the claims ledger".

**CTA: The idea again, inverted.** Red field. "Keep the DOGE. Set the stop." Sentence: "Approve an exact amount, arm a stop, keep at least 1 DOGE for gas." Button **Open app**.

**Footer: Columns above, wordmark below.** Network: "DogeOS Chikyū testnet, chain 6281971". Pages: Arm, Status, Verify. Contracts: Sooth, BackstopVenue, TestDollar. Pictures: credits for every photograph and the clip. Wordmark "Sooth" across the full width. Legal: "Made for VIBE CODE ON DOGE. Testnet only; tDOLLAR has no value."

### 2. Arm `/arm` (app, settings in two columns)

Title "Arm a stop". Under it, the finding: "Sooth will sell 98.00 DOGE only if DOGE/USD ≤ $0.0700, and will leave at least 2.00 DOGE." Rows, each a label column and a panel:
- **Stop price**: input in USD; help "Now $0.0771. Your stop is 9.2% below."
- **Amount to sell**: input in DOGE with Max; help "Up to 98.00 DOGE with your gas floor."
- **Gas floor**: input; help "DOGE the contract will leave in your wallet. At least 1 DOGE."
- **Expiry**: None / 24 hours / 7 days / 30 days; help "After this the stop cannot fire."
- **What it costs**: network fee (execution plus data and finality), payout at the stop; "Paid by the testnet backstop, not market liquidity."
- **Two transactions**: "Allow Sooth to sell up to 98.00 DOGE" then "Arm stop" (near-black primary). Inline errors per §11.

### 3. Status `/status` (app, balance and actions)

Title "Your stop" with the state pill and the primary action **Copy trigger link** in the title row. Headline figure: DOGE/USD at 32px; the line under it: "9.2% above your stop of $0.0700. Signed by 3 of 5 price signers, 4 s ago." Then the 24 h chart (two thirds; price in ink, the stop as the one red line, y-scale shown) beside "This stop" (amount, gas floor, allowance, expiry, armed time, the trigger link, Cancel stop). Activity table from Sooth's events. Inactive: the last event, a revoke notice while an allowance remains, and Arm a new stop. Signed out: the live price, the 24 h chart against the demo stop ($0.0700, labelled as the demo's), "No wallet yet?" with the demo stop's figures and a link to its trigger page, and what the screen shows once connected.

### 4. Trigger `/trigger/[holder]` (app, detail)

Title "Trigger the stop for 0x7a3f…91c2". Finding, under the title and stated once: "This call will revert: the price is above the stop." or "This call should sell 98.00 DOGE. You would receive ≈ 0.03 tDOLLAR." Price vs stop with the chart, beside the six checks (pass or fail, value right-aligned) and **Trigger**. Decoded revert with the Blockscout link.

### 5. Receipt `/receipt/[tx]` (app, detail)

Title "Sold 98.00 DOGE at $0.0698". Before and after figures, the wallet split, **Open on Blockscout** (Arm a new stop in preview). Beside them the slip: flat white paper with torn edges (no tilt, no resting shadow): price used, signed time, signers; DOGE sold; proceeds, caller fee, paid to holder (adds up); holder DOGE before and after; gas floor met; block, tx, caller.

### 6. Verify `/verify` (app, report)

Title "Check Sooth yourself". Try it (demo holder, price vs stop, **Try a trigger above the stop**). Demo transactions table. Contracts table. Parameters. Claims table (tier pill beside each). Not claimed.

---

## 4. Components

| Component | Desktop | Phone |
|---|---|---|
| Page bar | Wordmark left, Verify + Connect right, on the margin | Wordmark left; Connect and a Menu word right |
| Hero cards | Two 210px 3:2 photographs with a 40px paper bar, bottom-right | Side by side across the width at the bottom |
| Mosaic | 4 gutterless cells, full bleed | 2×2 |
| Call / response | 560px column on the axis; third response 760px | Full width, no indent |
| Live split | Sticky red field (cols 1–6) + reading column | Sticky field 42svh at the top, blocks beneath |
| Spine deck | Pinned 2.5 screens; cards slide in, earlier ones fold to 120px spines | Stacked cards, no pin |
| App rail | 56px icon rail with tooltips | Bottom bar, labels under icons |
| Title row | Title 24px, price, primary action | Title 20px; action stays |
| Panels | White, 1px edge, 8px radius | Full width |
| Tables | Rules and right-aligned tabular figures | Two-line rows |
| Price chart | SVG, ink line, red stop line, faint y-grid with labels | Full width, 180px |
| Toast | Bottom right, rises 6px | Bottom, full width |

---

## 5. Avoid

- Eyebrow labels ("The claim"), pill badges above headings, tiny tracked uppercase
- Monospace for figures or addresses: Hanken tabular figures instead
- 1 / 2 / 3 step numbers: order is carried by "First", "Then", "When"
- Thin rules and boxed outlines on the page (app screens may use 1px panel edges and row rules)
- Gradients, glows, glass, shadows at rest, backdrop blur
- Icon-topped feature cards; rows of identical cards
- Coloured chrome in the app: red only on the stop line and the stop figure
- The words safe, protected, guaranteed, risk-free (§0.9); invented customers, quotes or statistics
- A hero that could belong to any finance product
