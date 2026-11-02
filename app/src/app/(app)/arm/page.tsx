"use client";

// Arm: prd.md §11. Approve the exact amount (§10.6), then arm. Settings in two columns (docs/FRONTEND.md §3.2).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useHolder, useStore, SAMPLE_WALLET, type Fees } from "@/lib/store";
import { LIVE, PARAMS } from "@/lib/config";
import { distance, doge, dogeNum, feeDoge, pct, short, tdollar, usd } from "@/lib/format";
import { explain } from "@/lib/errors";
import { useConnect } from "@/components/ConnectButton";
import { WalletBar } from "@/components/WalletBar";
import { TxLink } from "@/components/TxLink";
import ui from "@/components/ui.module.css";
import styles from "./arm.module.css";

const EXPIRY = [
  { id: "none", label: "None", ms: 0 },
  { id: "24h", label: "24 hours", ms: 24 * 3_600_000 },
  { id: "7d", label: "7 days", ms: 7 * 86_400_000 },
  { id: "30d", label: "30 days", ms: 30 * 86_400_000 },
];

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

function Row({ title, help, children }: { title: string; help: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={styles.row}>
      <div className={styles.rowLabel}>
        <h2 className={styles.rowTitle}>{title}</h2>
        <p className={styles.rowHelp}>{help}</p>
      </div>
      <div className={styles.rowPanel}>{children}</div>
    </section>
  );
}

export default function ArmPage() {
  const router = useRouter();
  const { wallet, price, approve, arm, estimateFees } = useStore();
  const connect = useConnect();
  const address = wallet?.address ?? (LIVE ? undefined : SAMPLE_WALLET);
  const h = useHolder(address);
  const balance = h?.balance ?? (LIVE ? 0 : 100);
  const [fees, setFees] = useState<Fees | null>(null);

  const [stop, setStop] = useState("0.0700");
  const [amount, setAmount] = useState("98.00");
  const [floor, setFloor] = useState("2.00");
  const [expiry, setExpiry] = useState("none");
  const [approveTx, setApproveTx] = useState<string>();
  const [busy, setBusy] = useState<"approve" | "arm" | null>(null);

  const s = num(stop);
  const a = num(amount);
  const f = num(floor);

  const stopError = !(s > 0) ? "Enter a stop price above $0." : "";
  const amountError = !(a > 0) ? explain({ name: "BadAmount" }) : "";
  const floorError = !(f >= PARAMS.minGasFloor) ? explain({ name: "GasFloorTooLow" }) : "";
  const shortfall =
    h && !amountError && !floorError && a + f > balance
      ? `You have ${dogeNum(balance)} DOGE. Selling ${dogeNum(a)} and keeping ${dogeNum(f)} needs ${dogeNum(a + f)}.`
      : "";
  const valid = !stopError && !amountError && !floorError && !shortfall;

  const now = price?.value;
  const dist = now && s > 0 ? distance(now, s) : undefined;
  const above = dist !== undefined && dist <= 0;

  const approved = (h?.allowance ?? 0) === a && a > 0;

  // Full fee for the next transaction: execution plus data-and-finality (prd.md §10.5).
  useEffect(() => {
    if (!s || !(a > 0) || !(f > 0)) return;
    const id = setTimeout(async () => {
      setFees(await estimateFees(approved ? "arm" : "approve", { amount: a, stopPrice: s, gasFloor: f, expiry: 0 }));
    }, 400);
    return () => clearTimeout(id);
  }, [approved, a, s, f, estimateFees]);
  const proceeds = valid ? a * s : 0;
  const toHolder = proceeds * (1 - PARAMS.callerFeeBps / 10_000);
  const maxSell = Math.max(0, balance - (f >= 1 ? f : 1));

  const doApprove = async () => {
    setBusy("approve");
    const tx = await approve(a);
    if (tx) setApproveTx(tx);
    setBusy(null);
  };

  const doArm = async () => {
    setBusy("arm");
    const ms = EXPIRY.find((e) => e.id === expiry)?.ms ?? 0;
    const tx = await arm({ stopPrice: s, amount: a, gasFloor: f, expiry: ms ? Date.now() + ms : 0 });
    if (tx) router.push("/status");
    else setBusy(null);
  };

  const approveLabel = valid ? `Allow Sooth to sell up to ${doge(a)}` : "Allow Sooth to sell";
  const actions = !wallet ? (
    <button className="btn btn-connect" onClick={() => connect("/arm")}>
      Connect wallet
    </button>
  ) : (
    <div className={styles.steps}>
      <div className={styles.step}>
        <span className={styles.stepWord}>First</span>
        {approved ? (
          <span className={styles.stepDone}>
            <Check size={16} strokeWidth={1.75} aria-hidden="true" /> Allowed {doge(a)}
            {approveTx && <TxLink hash={approveTx} />}
          </span>
        ) : (
          <button className="btn btn-primary" disabled={!valid || busy !== null} onClick={doApprove}>
            {busy === "approve" ? "Waiting for wallet…" : approveLabel}
          </button>
        )}
      </div>
      <div className={styles.step}>
        <span className={styles.stepWord}>Then</span>
        <button
          className={approved ? "btn btn-primary" : "btn btn-secondary"}
          disabled={!approved || !valid || busy !== null}
          onClick={doArm}
        >
          {busy === "arm" ? "Waiting for wallet…" : "Arm stop"}
        </button>
      </div>
    </div>
  );

  // On phones only the active step sticks to the bottom edge.
  const activeStep = !wallet ? (
    actions
  ) : !approved ? (
    <button className="btn btn-primary" disabled={!valid || busy !== null} onClick={doApprove}>
      {busy === "approve" ? "Waiting for wallet…" : valid ? `First, allow ${doge(a)}` : "Allow Sooth to sell"}
    </button>
  ) : (
    <button className="btn btn-primary" disabled={!valid || busy !== null} onClick={doArm}>
      {busy === "arm" ? "Waiting for wallet…" : "Then, arm stop"}
    </button>
  );

  return (
    <div className={`container ${ui.page}`}>
      <header className={ui.head}>
        <div className={ui.titleRow}>
          <h1 className={ui.title}>Arm a stop</h1>
          <span className={styles.price}>
            DOGE/USD <b>{now ? usd(now) : "—"}</b>
          </span>
        </div>
        <p className={styles.finding}>
          {valid ? (
            <>
              Sooth will sell <b>{doge(a)}</b> only if DOGE/USD ≤ <b className={styles.stopFig}>{usd(s)}</b>, and will
              leave at least <b>{doge(f)}</b>.
            </>
          ) : (
            "Check the highlighted field to see what Sooth will do."
          )}
          {!wallet && " Connect a wallet to check it against your balance."}
        </p>
      </header>

      <Row title="Wallet" help="Sooth reads your balance. It moves nothing until a trigger, and never more than the amount you arm.">
        <div className={ui.rows}>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>Balance</span>
            <span className={ui.kvValue}>{h ? doge(balance) : "—"}</span>
          </div>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>Address</span>
            <span className={ui.kvValue}>{wallet ? short(wallet.address) : "Not connected"}</span>
          </div>
        </div>
      </Row>

      <Row title="Stop price" help="The most DOGE/USD can be at the moment it sells. Above it, every trigger is refused.">
        <label className={ui.field}>
          <span className={ui.label}>Stop price</span>
          <span className={ui.inputWrap} data-invalid={!!stopError}>
            <span className={ui.affix}>$</span>
            <input
              className={ui.input}
              inputMode="decimal"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
              onBlur={() => s > 0 && setStop(s.toFixed(4))}
              aria-invalid={!!stopError}
            />
            <span className={ui.affix}>USD</span>
          </span>
          {stopError ? (
            <span className={ui.error}>{stopError}</span>
          ) : above ? (
            <span className={ui.warn}>Your stop is above the current price, so anyone could trigger it now</span>
          ) : (
            <span className={ui.hint}>
              {now && dist !== undefined
                ? `Now ${usd(now)}, your stop is ${pct(dist)} below`
                : "The live DOGE/USD is unavailable right now, so the distance to your stop is not shown"}
            </span>
          )}
        </label>
      </Row>

      <Row title="Amount to sell" help="Sooth moves exactly this much and no more, whatever allowance you give it">
        <label className={ui.field}>
          <span className={ui.label}>Amount</span>
          <span className={ui.inputWrap} data-invalid={!!(amountError || shortfall)}>
            <input
              className={ui.input}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => a > 0 && setAmount(a.toFixed(2))}
              aria-invalid={!!(amountError || shortfall)}
            />
            <span className={ui.affix}>DOGE</span>
            <button type="button" className={ui.inline} onClick={() => setAmount(maxSell.toFixed(2))}>
              Max
            </button>
          </span>
          {amountError || shortfall ? (
            <span className={ui.error}>{amountError || shortfall}</span>
          ) : (
            <span className={ui.hint}>
              {h ? `Up to ${doge(maxSell)} with your gas floor` : "Your balance appears once a wallet is connected"}
            </span>
          )}
        </label>
      </Row>

      <Row title="Gas floor" help="What the contract leaves in your wallet, so you can still pay to revoke. At least 1 DOGE.">
        <label className={ui.field}>
          <span className={ui.label}>Gas floor</span>
          <span className={ui.inputWrap} data-invalid={!!floorError}>
            <input
              className={ui.input}
              inputMode="decimal"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              onBlur={() => f > 0 && setFloor(f.toFixed(2))}
              aria-invalid={!!floorError}
            />
            <span className={ui.affix}>DOGE</span>
          </span>
          {floorError ? (
            <span className={ui.error}>{floorError}</span>
          ) : (
            <span className={ui.hint}>One revoke costs about 0.006 DOGE on Chikyū</span>
          )}
        </label>
      </Row>

      <Row title="Expiry" help="After this the stop cannot fire. Arm a new one if you still want it.">
        <div className={ui.field}>
          <span className={ui.label} id="expiry-label">
            Ends
          </span>
          <div className={ui.segmented} role="radiogroup" aria-labelledby="expiry-label">
            {EXPIRY.map((e) => (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={expiry === e.id}
                className={ui.segment}
                onClick={() => setExpiry(e.id)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </Row>

      <Row
        title="What it costs"
        help="Each transaction pays the execution fee and the data-and-finality fee. Proceeds come from the testnet backstop, not market liquidity."
      >
        <div className={ui.rows}>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>To you if sold at the stop</span>
            <span className={ui.kvValue}>{valid ? `≈ ${tdollar(toHolder)}` : "—"}</span>
          </div>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>Caller fee</span>
            <span className={ui.kvValue}>0.5% of proceeds</span>
          </div>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>Execution fee</span>
            <span className={ui.kvValue}>{fees ? feeDoge(fees.execution) : "—"}</span>
          </div>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>Data and finality fee</span>
            <span className={ui.kvValue}>{fees ? feeDoge(fees.data) : "—"}</span>
          </div>
          <div className={ui.kv}>
            <span className={ui.kvLabel}>Network fee, {approved ? "arm" : "approval"}</span>
            <span className={ui.kvValue}>{fees ? feeDoge(fees.execution + fees.data) : "—"}</span>
          </div>
        </div>
      </Row>

      <Row title="Two transactions" help="First you allow an exact amount, never an unlimited one. Then you arm the stop.">
        {valid && (
          <div className={styles.bar}>
            <WalletBar balance={balance} amount={a} gasFloor={f} amountLabel="to sell" floorLabel="gas floor" />
          </div>
        )}
        <div className={styles.desktopActions}>{actions}</div>
      </Row>

      <div className={styles.mobileActions}>{activeStep}</div>
    </div>
  );
}
