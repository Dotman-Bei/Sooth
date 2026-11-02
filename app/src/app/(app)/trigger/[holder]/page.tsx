"use client";

// Trigger: prd.md §11. Public. Checks mirror Sooth.preview() in the order trigger() runs them (§9.1).
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useHolder, useStore } from "@/lib/store";
import { LIVE, PARAMS } from "@/lib/config";
import { countdown, dogeNum, short, tdollar, usd, utc } from "@/lib/format";
import { explain, type SoothError } from "@/lib/errors";
import { TripwireChart } from "@/components/TripwireChart";
import { StopFigure } from "@/components/WireMark";
import { TxLink } from "@/components/TxLink";
import { useTween } from "@/lib/useTween";
import ui from "@/components/ui.module.css";
import styles from "./trigger.module.css";

type CheckRow = { ok: boolean; text: string; value: string; fail: string };

export default function TriggerPage() {
  const { holder: param } = useParams<{ holder: string }>();
  const router = useRouter();
  const { price, priceError, trigger, wallet, connect } = useStore();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [revert, setRevert] = useState<{ error: SoothError; tx: string } | null>(null);
  const shown = useTween(price?.value);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const addr = decodeURIComponent(param);
  const h = useHolder(addr);
  const stop = h?.stop;
  const p = price?.value ?? 0;
  const age = price ? Math.max(0, Math.round((now - price.updatedAt) / 1000)) : Infinity;

  const checks: CheckRow[] = [
    { ok: !!stop?.active, text: "Stop is armed", fail: "the holder has no active stop", value: stop?.active ? "Active" : "No active stop" },
    {
      ok: !!stop && (!stop.expiry || now <= stop.expiry),
      text: "Stop has not expired",
      fail: "the stop has expired",
      value: !stop ? "—" : stop.expiry ? `${countdown(stop.expiry - now)} left` : "No expiry",
    },
    {
      ok: age <= PARAMS.maxPriceAge,
      fail: "the price is not signed by 3 of 5 or is older than 60 s",
      text: `Price is signed by ${PARAMS.signerThreshold} of ${PARAMS.signerCount} and at most ${PARAMS.maxPriceAge} s old`,
      value: Number.isFinite(age) ? `${age} s old` : "No price",
    },
    {
      ok: !!stop && !!price && price.updatedAt >= stop.armedAt,
      text: "Price is newer than the arm",
      fail: "the price is from before the stop was armed",
      value: stop ? `Armed ${utc(stop.armedAt)}` : "—",
    },
    {
      ok: !!stop && p > 0 && p <= stop.stopPrice,
      text: "Price is at or below the stop",
      fail: "the price is above the stop",
      value: stop ? `${usd(p)} ${p <= stop.stopPrice ? "≤" : ">"} ${usd(stop.stopPrice)}` : "—",
    },
    {
      ok: !!stop && !!h && h.balance - stop.amount >= stop.gasFloor,
      text: "Holder keeps the gas floor",
      fail: "selling would leave less than the gas floor",
      value:
        stop && h
          ? `${dogeNum(h.balance)} − ${dogeNum(stop.amount)} ${h.balance - stop.amount >= stop.gasFloor ? "≥" : "<"} ${dogeNum(stop.gasFloor)}`
          : "—",
    },
  ];

  const firstFail = checks.find((c) => !c.ok);
  const callerFee = stop ? (stop.amount * p * PARAMS.callerFeeBps) / 10_000 : 0;

  const run = async () => {
    setBusy(true);
    setRevert(null);
    const r = await trigger(addr);
    if (!r) {
      setBusy(false);
      return;
    }
    if (r.ok) {
      router.push(`/receipt/${r.receipt.tx}`);
      return;
    }
    setRevert({ error: r.error, tx: r.tx });
    setBusy(false);
  };

  return (
    <div className={`container ${ui.page}`}>
      <header className={ui.head}>
        <h1 className={ui.title}>
          Trigger the stop for <span className="mono">{short(addr)}</span>
        </h1>
        <p className={styles.finding} data-ok={!firstFail}>
          {!firstFail
            ? `This call should sell ${dogeNum(stop!.amount)} DOGE. You would receive ≈ ${tdollar(callerFee)}.`
            : `This call will revert: ${firstFail.fail}`}
        </p>
        <p className={ui.sub}>
          Anyone can call trigger. The contract checks the signed price itself, so the caller cannot choose it. If the
          sell goes through, the caller receives 0.5% of the proceeds.
        </p>
      </header>

      <div className={styles.grid}>
        <section className={`${ui.well} ${styles.priceCol}`}>
          <div className={styles.pair}>
            <div className={styles.figure}>
              <span className={ui.label}>Now</span>
              <span className={`mono ${styles.big}`}>{shown !== undefined ? usd(shown) : "$—"}</span>
            </div>
            <div className={styles.figure}>
              <span className={ui.label}>Stop</span>
              {stop ? (
                <StopFigure value={usd(stop.stopPrice)} className={styles.big} wire={24} />
              ) : (
                <span className={`mono ${styles.big} ${styles.none}`}>None</span>
              )}
            </div>
          </div>
          {!stop && (
            <div className={styles.noStop}>
              <p>
                <span className="mono">{short(addr)}</span> has no active stop on Sooth, so a trigger would revert with
                NoActiveStop.
              </p>
              <p>If this is your wallet, arm a stop first. Anyone can then fire it from this page.</p>
            </div>
          )}
          {stop && (
            <TripwireChart
              series={price?.series}
              stopPrice={stop.stopPrice}
              height={300}
              empty={priceError ? "DOGE/USD is unavailable right now" : undefined}
              label={`DOGE/USD over the last 24 hours against the stop at ${usd(stop.stopPrice)}`}
            />
          )}
        </section>

        <section className={ui.panel}>
          <h2 className={ui.sectionTitle}>What the contract will check</h2>
          <ol className={styles.checks}>
            {checks.map((c) => (
              <li key={c.text} className={styles.check} data-ok={c.ok}>
                <span className={styles.mark} aria-label={c.ok ? "Passes" : "Fails"}>
                  {c.ok ? <Check size={16} strokeWidth={1.5} /> : <X size={16} strokeWidth={1.5} />}
                </span>
                <span className={styles.checkText}>{c.text}</span>
                <span className={`mono ${styles.checkValue}`}>{c.value}</span>
              </li>
            ))}
          </ol>


          {LIVE && !wallet ? (
            <button className={`btn btn-connect ${styles.go}`} onClick={() => connect()}>
              Connect wallet to trigger
            </button>
          ) : (
            <button className={`btn btn-primary ${styles.go}`} disabled={busy} onClick={run}>
              {busy ? "Waiting for wallet…" : "Trigger"}
            </button>
          )}

          {revert && (
            <div className={styles.revert} role="alert">
              <p>{explain(revert.error)}</p>
              <TxLink hash={revert.tx} label="View failed transaction on Blockscout" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
