"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useToast } from "./Toast";
import { dogeNum, short } from "@/lib/format";

/** Connect, then route to Arm (prd.md §11). Gated on wallet-ready, not sign-in (§10.2).
 * In live mode the DogeOS modal opens and the store routes once an address arrives. */
export function useConnect() {
  const { connect } = useStore();
  const toast = useToast();
  const router = useRouter();
  return async (next = "/arm") => {
    const result = await connect(next);
    if (result === "not-ready") toast("Wallet is still starting. Try again in a moment.");
    else if (result === "connected") router.push(next);
  };
}

export function ConnectButton({ size = "md", label = "Connect wallet" }: { size?: "sm" | "md"; label?: string }) {
  const { wallet, holder } = useStore();
  const go = useConnect();

  if (wallet) {
    const h = holder(wallet.address);
    return (
      <Link href="/status" className={`btn btn-secondary ${size === "sm" ? "btn-sm" : ""}`}>
        <span className="mono" style={{ fontSize: 13 }}>
          {short(wallet.address)}
        </span>
        {h && (
          <span className="mono" style={{ fontSize: 13, color: "var(--text-3)" }}>
            {dogeNum(h.balance)} DOGE
          </span>
        )}
      </Link>
    );
  }

  return (
    <button className={`btn btn-primary ${size === "sm" ? "btn-sm" : ""}`} onClick={() => go()}>
      {label}
    </button>
  );
}
