"use client";

// Status: prd.md §11. Activity comes from Sooth's own events only (§10.4).
// Its one question: how far is DOGE/USD from my stop? (docs/FRONTEND.md §3.3)
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useHolder, useStore, type SoothEvent } from "@/lib/store";
import { countdown, distance, doge, dogeNum, pct, short, usd, utc } from "@/lib/format";
import { useConnect } from "@/components/ConnectButton";
import { TripwireChart } from "@/components/TripwireChart";
import { TxLink } from "@/components/TxLink";
import { useAge } from "@/components/PriceReadout";
import { useTween } from "@/lib/useTween";
import ui from "@/components/ui.module.css";
import styles from "./status.module.css";

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Activity({ events }: { events: SoothEvent[] }) {
  return (
    <section className={`${ui.panel} ${styles.activity}`} aria-labelledby="activity-title">
      <h2 id="activity-title" className={ui.sectionTitle}>
        Activity
      </h2>
      {events.length === 0 ? (
        <p className={ui.caption}>No Sooth events for this wallet yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Detail</th>
              <th scope="col">Time</th>
              <th scope="col" className={styles.right}>
                Transaction
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.tx}>
                <td className={styles.strong}>{e.kind}</td>
                <td>{e.detail}</td>
                <td className={styles.muted}>{utc(e.at)}</td>
                <td className={styles.right}>
                  <TxLink hash={e.tx} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function useCopyLink(address: string | undefined) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const full = address ? `${origin}/trigger/${address}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return { copied, copy, full, shown: address ? `${origin.replace(/^https?:\/\//, "")}/trigger/${short(address)}` : "" };
}

function PriceCard({ line }: { line: React.ReactNode }) {
  const { price } = useStore();
  const shown = useTween(price?.value);
  return (
    <section className={`${ui.panel} ${styles.priceCard}`} aria-label="DOGE/USD">
      <p className={styles.priceLabel}>DOGE/USD, median of 5 exchanges</p>
      <p className={styles.big}>{shown !== undefined ? usd(shown) : "—"}</p>
      <p className={styles.priceLine}>{line}</p>
    </section>
  );
}

export default function StatusPage() {
  const { wallet, price, priceError, cancel, revoke, demoHolder } = useStore();
  const h = useHolder(wallet?.address);
  const connect = useConnect();
  const now = useNow();
  const age = useAge(price?.updatedAt);
  const link = useCopyLink(wallet?.address);
  const [busy, setBusy] = useState<"cancel" | "revoke" | null>(null);

  const signed = price && !priceError ? `Signed by 3 of 5 price signers, ${age || "just now"}.` : "The live price is unavailable right now.";

  if (!wallet) {
    return (
      <div className={`container ${ui.page}`}>
        <header className={ui.head}>
          <div className={ui.titleRow}>
            <h1 className={ui.title}>Your stop</h1>
            <button className={`btn btn-connect ${styles.titleAction}`} onClick={() => connect("/status")}>
              Connect wallet
            </button>
          </div>
          <p className={ui.sub}>Connect your wallet to see your stop, how far the price is from it, and its history.</p>
        </header>
        <PriceCard line={signed} />
        <div className={styles.grid}>
          <section className={`${ui.panel} ${styles.chartPanel}`} aria-labelledby="demo-chart-title">
            <div className={styles.panelHead}>
              <h2 id="demo-chart-title" className={ui.sectionTitle}>
                DOGE/USD against the demo stop, last 24 hours
              </h2>
              <span className={styles.key}>
                <i className={styles.keyPrice} /> DOGE/USD <i className={styles.keyStop} /> Demo stop
              </span>
            </div>
            <TripwireChart
              series={price?.series}
              stopPrice={0.07}
              height={330}
              empty={priceError ? "DOGE/USD is unavailable right now" : undefined}
              label="DOGE/USD over the last 24 hours against the demo holder's stop at $0.0700"
            />
          </section>
          <section className={`${ui.panel} ${styles.side}`} aria-labelledby="demo-title">
            <h2 id="demo-title" className={ui.sectionTitle}>
              No wallet yet?
            </h2>
            <p className={styles.sideNote}>
              A demo holder has a stop armed at $0.0700. Open its trigger page to see every check the contract runs, or
              arm your own once you connect.
            </p>
            <div className={`${ui.rows} ${styles.demoRows}`}>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>Demo stop</span>
                <span className={`${ui.kvValue} ${styles.stopFig}`}>$0.0700</span>
              </div>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>Amount to sell</span>
                <span className={ui.kvValue}>98.00 DOGE</span>
              </div>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>Gas floor</span>
                <span className={ui.kvValue}>2.00 DOGE</span>
              </div>
            </div>
            <Link href={`/trigger/${demoHolder}`} className="btn btn-secondary">
              Open the demo stop
            </Link>
          </section>
        </div>
        <div className={styles.activity}>
          <section className={ui.panel} aria-labelledby="after-title">
            <h2 id="after-title" className={ui.sectionTitle}>
              What this screen shows once you connect
            </h2>
            <div className={ui.rows}>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>Distance to your stop</span>
                <span className={ui.kvValue}>How far DOGE/USD must fall, in %</span>
              </div>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>This stop</span>
                <span className={ui.kvValue}>Amount, gas floor, allowance, expiry</span>
              </div>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>Trigger link</span>
                <span className={ui.kvValue}>For anyone to fire it at your stop</span>
              </div>
              <div className={ui.kv}>
                <span className={ui.kvLabel}>Activity</span>
                <span className={ui.kvValue}>Armed, cancelled and sold, from Sooth&rsquo;s events</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const stop = h?.stop;
  const expired = !!stop?.active && !!stop.expiry && now > stop.expiry;
  const active = !!stop?.active && !expired;
  const last = h?.events[0];
  const allowance = h?.allowance ?? 0;

  const doCancel = async () => {
    setBusy("cancel");
    await cancel();
    setBusy(null);
  };
  const doRevoke = async () => {
    setBusy("revoke");
    await revoke();
    setBusy(null);
  };

  if (!stop || !active) {
    const state = !stop ? null : expired ? "Expired" : last?.kind === "Triggered" ? "Sold" : "Cancelled";
    return (
      <div className={`container ${ui.page}`}>
        <header className={ui.head}>
          <div className={ui.titleRow}>
            <h1 className={ui.title}>Your stop</h1>
            {state && (
              <span className={ui.state}>
                <span className={ui.dot} data-tone={state === "Sold" ? "positive" : undefined} />
                {state}
              </span>
            )}
            <Link href="/arm" className={`btn btn-primary ${styles.titleAction}`}>
              {stop ? "Arm a new stop" : "Arm a stop"}
            </Link>
          </div>
          <p className={ui.sub}>
            {!stop
              ? "You have no stop on Sooth yet."
              : expired
                ? `No active stop. It expired on ${utc(stop.expiry)}.`
                : last
                  ? `No active stop. Last event: ${last.detail} on ${utc(last.at)}.`
                  : "No active stop."}
          </p>
        </header>
        {allowance > 0 && (
          <div className={styles.notice}>
            <p>
              Sooth can still move up to <b>{doge(allowance)}</b> until you revoke the allowance.
            </p>
            <button className="btn btn-primary" disabled={busy !== null} onClick={doRevoke}>
              {busy === "revoke" ? "Waiting for wallet…" : "Revoke allowance"}
            </button>
          </div>
        )}
        {last?.kind === "Triggered" && (
          <p className={styles.receiptLink}>
            <Link href={`/receipt/${last.tx}`} className={ui.textLink}>
              View the receipt for the last sale
            </Link>
          </p>
        )}
        <Activity events={h?.events ?? []} />
      </div>
    );
  }

  const p = price?.value;
  const dist = p ? distance(p, stop.stopPrice) : undefined;

  return (
    <div className={`container ${ui.page}`}>
      <header className={ui.head}>
        <div className={ui.titleRow}>
          <h1 className={ui.title}>Your stop</h1>
          <span className={ui.state}>
            <span className={ui.dot} />
            Armed
          </span>
          <button className={`btn btn-primary ${styles.titleAction}`} onClick={link.copy}>
            {link.copied ? <Check size={16} strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}
            {link.copied ? "Trigger link copied" : "Copy trigger link"}
          </button>
        </div>
      </header>

      <PriceCard
        line={
          <>
            {dist !== undefined && dist > 0 ? (
              <>
                {pct(dist)} above your stop of <b className={styles.stopFig}>{usd(stop.stopPrice)}</b>.{" "}
              </>
            ) : dist !== undefined ? (
              <>
                At or below your stop of <b className={styles.stopFig}>{usd(stop.stopPrice)}</b>. Anyone can trigger it now.{" "}
              </>
            ) : (
              <>
                Your stop is <b className={styles.stopFig}>{usd(stop.stopPrice)}</b>.{" "}
              </>
            )}
            {signed}
          </>
        }
      />

      <div className={styles.grid}>
        <section className={`${ui.panel} ${styles.chartPanel}`} aria-labelledby="chart-title">
          <div className={styles.panelHead}>
            <h2 id="chart-title" className={ui.sectionTitle}>
              Price against your stop, last 24 hours
            </h2>
            <span className={styles.key}>
              <i className={styles.keyPrice} /> DOGE/USD <i className={styles.keyStop} /> Stop
            </span>
          </div>
          <TripwireChart
            series={price?.series}
            stopPrice={stop.stopPrice}
            height={330}
            empty={priceError ? "DOGE/USD is unavailable right now" : undefined}
            label={`DOGE/USD over the last 24 hours with your stop at ${usd(stop.stopPrice)}`}
          />
        </section>

        <section className={`${ui.panel} ${styles.side}`} aria-labelledby="stop-title">
          <h2 id="stop-title" className={ui.sectionTitle}>
            This stop
          </h2>
          <div className={ui.rows}>
            <div className={ui.kv}>
              <span className={ui.kvLabel}>Amount to sell</span>
              <span className={ui.kvValue}>{doge(stop.amount)}</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvLabel}>Gas floor</span>
              <span className={ui.kvValue}>{doge(stop.gasFloor)}</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvLabel}>Allowance left</span>
              <span className={ui.kvValue}>{dogeNum(allowance)} DOGE</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvLabel}>Expires</span>
              <span className={ui.kvValue}>{stop.expiry ? `in ${countdown(stop.expiry - now)}` : "Never"}</span>
            </div>
            <div className={ui.kv}>
              <span className={ui.kvLabel}>Armed</span>
              <span className={ui.kvValue}>{utc(stop.armedAt)}</span>
            </div>
          </div>
          <p className={styles.sideNote}>
            There is no hosted keeper. Anyone with the link{" "}
            <Link href={`/trigger/${wallet.address}`} className={ui.textLink}>
              {link.shown || "trigger page"}
            </Link>{" "}
            can fire it once the price reaches the stop.
          </p>
          <button className="btn btn-secondary" disabled={busy !== null} onClick={doCancel}>
            {busy === "cancel" ? "Waiting for wallet…" : "Cancel stop"}
          </button>
        </section>
      </div>

      <Activity events={h?.events ?? []} />
    </div>
  );
}
