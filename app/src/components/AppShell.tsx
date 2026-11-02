"use client";

// App shell (docs/FRONTEND.md §3.0): a 56px icon rail on desktop, a labelled bottom bar on the phone.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, SlidersHorizontal, Activity, FileCheck2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { useConnect } from "./ConnectButton";
import { PreviewLine } from "./PreviewLine";
import { short, dogeNum } from "@/lib/format";
import s from "./AppShell.module.css";

const NAV = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/arm", label: "Arm", Icon: SlidersHorizontal },
  { href: "/status", label: "Status", Icon: Activity },
  { href: "/verify", label: "Verify", Icon: FileCheck2 },
];

/** The Sooth mark: a stop wire with a pin at each end, in the one red. */
export function SoothMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--data)" />
      <line x1="6" y1="12" x2="18" y2="12" stroke="#fff" strokeWidth="1.75" />
      <circle cx="6" cy="12" r="2" fill="#fff" />
      <circle cx="18" cy="12" r="2" fill="#fff" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { wallet, holder } = useStore();
  const connect = useConnect();
  const h = wallet ? holder(wallet.address) : undefined;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className={`appShell ${s.shell}`}>
      <nav className={s.rail} aria-label="Sooth">
        <Link href="/" className={s.mark} aria-label="Sooth home">
          <SoothMark />
        </Link>
        <ul className={s.items}>
          {NAV.slice(1).map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} className={s.item} aria-current={active(href) ? "page" : undefined} aria-label={label} data-tip={label}>
                <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <div className={s.railFoot}>
          {wallet ? (
            <Link href="/status" className={s.item} aria-label={`Wallet ${short(wallet.address)}`} data-tip={short(wallet.address)}>
              <Wallet size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          ) : (
            <button className={s.item} onClick={() => connect("/arm")} aria-label="Connect wallet" data-tip="Connect wallet">
              <Wallet size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </nav>

      <div className={s.main}>
        <PreviewLine tone="app" />
        <div className={s.scope}>
          <span className={s.scopeName}>
            <SoothMark size={18} /> Sooth
          </span>
          <span className={s.scopeNet}>DogeOS Chikyū · chain 6281971</span>
          <span className={s.scopeWallet}>
            {wallet ? (
              <>
                {short(wallet.address)}
                {h && <span className={s.scopeBal}> · {dogeNum(h.balance)} DOGE</span>}
              </>
            ) : (
              <button className={s.scopeConnect} onClick={() => connect("/arm")}>
                Connect wallet
              </button>
            )}
          </span>
        </div>
        <main className={s.canvas}>{children}</main>
      </div>

      <nav className={s.bottom} aria-label="Sooth">
        {NAV.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={s.bottomItem} aria-current={active(href) ? "page" : undefined}>
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
