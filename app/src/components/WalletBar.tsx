import { dogeNum } from "@/lib/format";
import styles from "./WalletBar.module.css";

type Props = {
  balance: number;
  amount: number;
  gasFloor: number;
  amountLabel?: string;
  floorLabel?: string;
};

/** The wallet split into what Sooth may sell, what it must leave, and what it never touches. */
export function WalletBar({
  balance,
  amount,
  gasFloor,
  amountLabel = "approved, not deposited",
  floorLabel = "kept for gas",
}: Props) {
  const total = Math.max(balance, amount + gasFloor, 0.0001);
  const rest = Math.max(0, balance - amount - gasFloor);
  const pctOf = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="img" aria-label={`${dogeNum(amount)} DOGE ${amountLabel}, ${dogeNum(gasFloor)} DOGE ${floorLabel}`}>
        <span className={styles.amount} style={{ width: pctOf(amount) }} />
        {rest > 0 && <span className={styles.rest} style={{ width: pctOf(rest) }} />}
        <span className={styles.floor} style={{ width: pctOf(gasFloor) }} />
      </div>
      <div className={styles.key}>
        <span>
          <i className={styles.swAmount} />
          <b className="mono">{dogeNum(amount)} DOGE</b> {amountLabel}
        </span>
        {rest > 0 && (
          <span>
            <i className={styles.swRest} />
            <b className="mono">{dogeNum(rest)}</b> untouched
          </span>
        )}
        <span className={styles.keyFloor}>
          <i className={styles.swFloor} />
          <b className="mono">{dogeNum(gasFloor)}</b> {floorLabel}
        </span>
      </div>
    </div>
  );
}
