import type { Receipt } from "@/lib/store";
import { PARAMS } from "@/lib/config";
import { dogeNum, payoutLines, short, usd } from "@/lib/format";
import styles from "./ReceiptSlip.module.css";

/** The one light object in the product: a printed slip for a settled trigger. */
export function ReceiptSlip({ r, signedAt }: { r: Receipt; signedAt: string }) {
  const pay = payoutLines(r.proceeds, r.fee);
  const row = (k: string, v: string, strong = false) => (
    <div className={styles.row} data-strong={strong}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
  return (
    <div className={styles.wrap}>
      <div className={styles.slip}>
        <div className={styles.brand}>
          <svg width={20} height={8} viewBox="0 0 20 8" aria-hidden="true">
            <line x1={2} y1={4} x2={18} y2={4} stroke="currentColor" />
            <circle cx={2} cy={4} r={1.5} fill="currentColor" />
            <circle cx={18} cy={4} r={1.5} fill="currentColor" />
          </svg>
          <span>Sooth</span>
        </div>
        <p className={styles.meta}>Stop sold · DogeOS Chikyū 6281971</p>

        <div className={styles.group}>
          {row("Price used", usd(r.price))}
          {row("Signed", signedAt)}
          {row("Signers", `${PARAMS.signerThreshold} of ${PARAMS.signerCount}, ${PARAMS.dataService}`)}
          {row("Stop", usd(r.stopPrice))}
        </div>
        <div className={styles.group}>
          {row("DOGE sold", dogeNum(r.amount))}
          {row("Proceeds", `${pay.proceeds.toFixed(2)} tDOLLAR`)}
          {row("Fee to caller (0.5%)", `${pay.fee.toFixed(2)} tDOLLAR`)}
          {row("Paid to holder", `${pay.toHolder.toFixed(2)} tDOLLAR`, true)}
        </div>
        <div className={styles.group}>
          {row("Holder DOGE before", r.before !== null ? dogeNum(r.before) : "—")}
          {row("Holder DOGE after", r.after !== null ? dogeNum(r.after) : "—")}
          {row("Gas floor", r.after !== null ? `${dogeNum(r.gasFloor)}, ${r.after >= r.gasFloor ? "met" : "not met"}` : dogeNum(r.gasFloor))}
        </div>
        <div className={styles.group}>
          {row("Block", r.block.toLocaleString("en-US"))}
          {row("Tx", short(r.tx))}
          {row("Caller", short(r.caller))}
        </div>
        <p className={styles.foot}>Paid by the testnet backstop, not market liquidity.</p>
      </div>
    </div>
  );
}
