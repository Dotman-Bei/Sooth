"use client";

// Verify: prd.md §11, §18. For judges: both outcomes, contracts, parameters, claims.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useHolder, useStore, DEMO_HOLDER, type Params, type TriggerResult } from "@/lib/store";
import { config, LIVE, NATIVE_DOGE, PARAMS, PREVIEW } from "@/lib/config";
import { doge, short, usd } from "@/lib/format";
import { explain } from "@/lib/errors";
import { CLAIMS, DEMO_TXS, NOT_CLAIMED } from "@/lib/claims";
import { StopFigure } from "@/components/WireMark";
import { TxLink, AddressLink } from "@/components/TxLink";
import ui from "@/components/ui.module.css";
import styles from "./verify.module.css";

function TryIt() {
  const { price, trigger, wallet, connect } = useStore();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TriggerResult | null>(null);
  const h = useHolder(LIVE && !config.demoHolder ? undefined : DEMO_HOLDER);
  const stop = h?.stop;

  const run = async () => {
    setBusy(true);
    setResult(null);
    setResult(await trigger(DEMO_HOLDER));
    setBusy(false);
  };

  return (
    <section className={`${ui.panel} ${styles.try}`}>
      <div className={styles.tryText}>
        <h2 className={ui.sectionTitle}>Try a trigger above the stop</h2>
        <p>
          Demo holder <span className="mono">{short(DEMO_HOLDER)}</span> has a stop for{" "}
          {stop ? doge(stop.amount) : "—"} with a {stop ? doge(stop.gasFloor) : "—"} gas floor. DOGE/USD is{" "}
          <span className="mono">{price ? usd(price.value) : "$—"}</span> now, so the contract should refuse to sell.
        </p>
        <div className={styles.tryFigures}>
          <div>
            <span className={ui.label}>Now</span>
            <span className={`mono ${styles.mid}`}>{price ? usd(price.value) : "$—"}</span>
          </div>
          <div>
            <span className={ui.label}>Stop</span>
            {stop ? <StopFigure value={usd(stop.stopPrice)} className={styles.mid} wire={20} /> : <span>—</span>}
          </div>
        </div>
      </div>
      <div className={styles.tryAction}>
        {LIVE && !config.demoHolder ? (
          <p className={styles.muted}>No demo holder is set yet.</p>
        ) : LIVE && !wallet ? (
          <button className="btn btn-connect" onClick={() => connect()}>
            Connect wallet to try it
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={run}>
            {busy ? "Sending trigger…" : "Try a trigger above the stop"}
          </button>
        )}
        <Link href={`/trigger/${DEMO_HOLDER}`} className={ui.textLink}>
          Open the full trigger page
        </Link>
        {result && !result.ok && (
          <div className={styles.result} data-tone="revert" role="status">
            <p>{explain(result.error)}</p>
            <TxLink hash={result.tx} label="View failed transaction on Blockscout" />
          </div>
        )}
        {result && result.ok && (
          <div className={styles.result} role="status">
            <p>
              Sold {doge(result.receipt.amount)} at {usd(result.receipt.price)}. The price was at or below the stop.
            </p>
            <Link href={`/receipt/${result.receipt.tx}`} className={ui.textLink}>
              View receipt
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

const CONTRACTS = [
  { name: "Sooth", note: "", address: config.sooth },
  { name: "BackstopVenue", note: "Testnet stand-in", address: config.venue },
  { name: "TestDollar", note: "Test payout token", address: config.payoutToken },
  { name: "Native DOGE", note: "DogeOS system contract", address: NATIVE_DOGE },
];

function paramRows(p: Params | null) {
  // Live values come from the contract; "Not readable" means the getter is missing or the call failed.
  const v = <T,>(live: T | null | undefined, spec: T, fmt: (x: T) => string) =>
    LIVE ? (live === null || live === undefined ? "Not readable" : fmt(live)) : fmt(spec);
  return [
    ["CALLER_FEE_BPS", v(p?.callerFeeBps, PARAMS.callerFeeBps, (x) => `${x} (${(x / 100).toFixed(1)}%)`)],
    ["MAX_PRICE_AGE", v(p?.maxPriceAge, PARAMS.maxPriceAge, (x) => `${x} s`)],
    ["MAX_PRICE_AHEAD", v(p?.maxPriceAhead, PARAMS.maxPriceAhead, (x) => `${x} s`)],
    ["Signer threshold", v(p?.signerThreshold, PARAMS.signerThreshold, (x) => `${x} of ${PARAMS.signerCount}`)],
    ["MIN_GAS_FLOOR", v(p?.minGasFloor, PARAMS.minGasFloor, (x) => `${x.toFixed(2)} DOGE`)],
    ["Feed", `${PARAMS.feed}, ${PARAMS.dataService}`],
  ];
}

export default function VerifyPage() {
  const { readParams } = useStore();
  const [params, setParams] = useState<Params | null>(null);
  useEffect(() => {
    readParams().then(setParams);
  }, [readParams]);
  const PARAM_ROWS = paramRows(params);

  return (
    <div className={`container ${ui.page}`}>
      <header className={`${ui.head} enter`}>
        <h1 className={ui.title}>Check Sooth yourself</h1>
        <p className={ui.sub}>
          {!PREVIEW
            ? "Everything here is read from DogeOS Chikyū, chain 6281971. Two transactions show both outcomes: a trigger above the stop that reverted, and one below it that sold."
            : config.sooth
              ? "Sooth is deployed on DogeOS Chikyū, chain 6281971, with verified source. The contracts and recorded transactions below are real; rows not recorded yet say so. The try-it panel still runs on sample values."
              : "Once Sooth is deployed, everything here is read from DogeOS Chikyū, chain 6281971, and two transactions show both outcomes. Until then each row says what is still missing."}
        </p>
      </header>

      <TryIt />

      <section className={styles.section}>
        <h2 className={styles.title}>Demo transactions</h2>
        <ul className={styles.table}>
          {DEMO_TXS.map((t) => (
            <li key={t.id} className={styles.txRow}>
              <span className={`mono ${styles.id}`}>{t.id}</span>
              <span className={styles.name}>{t.label}</span>
              <span className={styles.desc}>{t.outcome}</span>
              <span className={styles.end}>
                {t.hash ? <TxLink hash={t.hash} real /> : <span className={styles.muted}>Not recorded yet</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>Contracts</h2>
        <ul className={styles.table}>
          {CONTRACTS.map((c) => (
            <li key={c.name} className={styles.contractRow}>
              <span className={styles.name}>
                {c.name}
                {c.note && <span className={styles.note}>{c.note}</span>}
              </span>
              <span className={styles.end}>
                {c.address ? <AddressLink address={c.address} /> : <span className={styles.muted}>Not deployed yet</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>Parameters</h2>
        <div className={styles.params}>
          {PARAM_ROWS.map(([k, v]) => (
            <div key={k} className={styles.param}>
              <span className={`mono ${styles.paramKey}`}>{k}</span>
              <span className={`mono ${styles.paramValue}`}>{v}</span>
            </div>
          ))}
        </div>
        <p className={`${ui.caption} ${styles.after}`}>
          {LIVE
            ? "Read from the deployed contract."
            : config.sooth
              ? "The deployed contract has these values as constants: see its verified source on Blockscout. Live mode reads them on-chain."
              : "Values from the spec. They are read from the contract once it is deployed."}
        </p>
      </section>

      <section className={styles.section} id="claims">
        <h2 className={styles.title}>Claims</h2>
        <ul className={styles.table}>
          {CLAIMS.map((c) => (
            <li key={c.id} className={styles.claimRow}>
              <span className={`mono ${styles.id}`}>{c.id}</span>
              <div className={styles.claimBody}>
                <p className={styles.claimText}>{c.claim}</p>
                <p className={styles.limit}>Limitation: {c.limitation}</p>
              </div>
              <div className={styles.tier}>
                <span className={ui.state}>
                  <span className={ui.dot} data-tone={c.tier.startsWith("executed") ? "positive" : undefined} />
                  <span className="mono">{c.tier}</span>
                </span>
                <span className={styles.target}>Target: {c.target}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>Not claimed</h2>
        <ul className={styles.notClaimed}>
          {NOT_CLAIMED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
