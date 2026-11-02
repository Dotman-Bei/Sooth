"use client";

// Receipt: prd.md §11. The core claim restated as what happened (§16).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { PREVIEW, txUrl } from "@/lib/config";
import { doge, dogeNum, payoutLines, short, tdollar, usd, utcFull } from "@/lib/format";
import { WalletBar } from "@/components/WalletBar";
import { ReceiptSlip } from "@/components/ReceiptSlip";
import ui from "@/components/ui.module.css";
import styles from "./receipt.module.css";

export default function ReceiptPage() {
  const { tx } = useParams<{ tx: string }>();
  const hash = decodeURIComponent(tx);
  const { receipts, price, loadReceipt } = useStore();
  const r = receipts[hash];
  const [looked, setLooked] = useState(false);

  // Live: a receipt opened from a link is read from chain.
  useEffect(() => {
    if (r) return;
    loadReceipt(hash).finally(() => setLooked(true));
  }, [hash, r, loadReceipt]);

  if (!r && !looked) {
    return (
      <div className={`container ${ui.page}`}>
        <header className={ui.head}>
          <h1 className={ui.title}>Receipt</h1>
          <p className={ui.sub}>
            Reading transaction <span className="mono">{short(hash)}</span> from Chikyū…
          </p>
        </header>
      </div>
    );
  }

  if (!r) {
    return (
      <div className={`container ${ui.page}`}>
        <header className={ui.head}>
          <h1 className={ui.title}>No sell in this transaction</h1>
          <p className={ui.sub}>
            Transaction <span className="mono">{short(hash)}</span> has no Triggered event from
            Sooth.
          </p>
        </header>
        <Link href="/status" className="btn btn-secondary">
          Back to your stop
        </Link>
      </div>
    );
  }

  const url = txUrl(r.tx);

  return (
    <div className={`container ${ui.page}`}>
      <div className={styles.grid}>
        <div className={`${styles.text} enter`}>
          <header className={styles.head}>
            <h1 className={ui.title}>
              Sold {doge(r.amount)} at {usd(r.price)}
            </h1>
            <p className={ui.sub}>
              DOGE/USD was {usd(r.price)}, at or below the stop of {usd(r.stopPrice)}.{" "}
              {r.after !== null
                ? `${doge(r.after)} stayed in the wallet for gas.`
                : `The contract only sells when at least ${doge(r.gasFloor)} stays in the wallet for gas.`}{" "}
              Before this transaction the DOGE never left the wallet.
            </p>
          </header>

          <div className={styles.balances}>
            <div>
              <span className={ui.label}>Holder DOGE before</span>
              <span className={`mono ${styles.figure}`}>{r.before !== null ? dogeNum(r.before) : "—"}</span>
            </div>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
            <div>
              <span className={ui.label}>After</span>
              <span className={`mono ${styles.figure}`}>{r.after !== null ? dogeNum(r.after) : "—"}</span>
            </div>
            <div className={styles.paid}>
              <span className={ui.label}>Paid to holder</span>
              <span className={`mono ${styles.figure}`}>{tdollar(payoutLines(r.proceeds, r.fee).toHolder)}</span>
            </div>
          </div>

          {r.before !== null && r.after !== null ? (
            <WalletBar
              balance={r.before}
              amount={r.amount}
              gasFloor={r.after}
              amountLabel="sold"
              floorLabel={r.after >= r.gasFloor ? "left, gas floor met" : "left"}
            />
          ) : (
            <p className={ui.caption}>Balances before and after need an RPC that can read past blocks.</p>
          )}

          <div className={styles.actions}>
            {url && !PREVIEW && (
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary">
                Open on Blockscout
                <ArrowUpRight size={16} strokeWidth={1.5} />
              </a>
            )}
            <Link href="/arm" className={url && !PREVIEW ? "btn btn-secondary" : "btn btn-primary"}>
              Arm a new stop
            </Link>
          </div>
          {PREVIEW && <p className={ui.caption}>Sample receipt. There is no transaction on Blockscout to open yet.</p>}
        </div>

        <div className={styles.slipCol}>
          <ReceiptSlip r={r} signedAt={utcFull(r.priceTs)} />
        </div>
      </div>
    </div>
  );
}
