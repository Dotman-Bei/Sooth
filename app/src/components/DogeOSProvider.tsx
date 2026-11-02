"use client";

// Live wallet: DogeOS SDK v4 (prd.md §10.2). Loaded only in live mode so preview never ships the SDK.
// In 4.0.5 the chain list comes from DogeOS at runtime through getChains(); there is no
// dogeOSChikyuTestnet export (DECISIONS.md D-004). We keep only Chikyū under chains.evm.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chain } from "viem";
import "@dogeos/dogeos-sdk/style.css";
import { CHAIN_ID, config, setRuntimeExplorer } from "@/lib/config";
import { StoreProvider, type LiveWallet } from "@/lib/store";
import { makePublic } from "@/lib/live";

type Sdk = typeof import("@dogeos/dogeos-sdk");
type KitConfig = import("@dogeos/dogeos-sdk").WalletConnectKitConfig;

/** Lives inside the SDK's provider and reports the wallet up, so the app tree itself never remounts.
 *  The SDK hooks return new function identities on every render, so they are held in refs and only the
 *  values that matter (address, readiness, provider) decide when to report. */
function Bridge({ sdk, chain, onChange }: { sdk: Sdk; chain: Chain; onChange: (w: LiveWallet) => void }) {
  const { address, currentProvider } = sdk.useAccount();
  // Gate wallet actions on isWalletReady, not on sign-in (prd.md §10.2).
  const { isWalletReady, isConnected, openModal, disconnect } = sdk.useWalletConnect();
  const pub = useMemo(() => makePublic(chain), [chain]);
  const fns = useRef({ openModal, disconnect });
  fns.current = { openModal, disconnect };
  const stable = useMemo(
    () => ({ openModal: () => fns.current.openModal(), disconnect: () => fns.current.disconnect() }),
    [],
  );
  const shown = isConnected && address ? address : undefined;
  useEffect(() => {
    onChange({ chain, pub, address: shown, provider: currentProvider, walletReady: isWalletReady, ...stable });
  }, [chain, pub, shown, currentProvider, isWalletReady, stable, onChange]);
  return null;
}

export function DogeOSProvider({ children }: { children: React.ReactNode }) {
  const [boot, setBoot] = useState<{ sdk: Sdk; chain: Chain; kit: KitConfig } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveWallet, setLiveWallet] = useState<LiveWallet | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = await import("@dogeos/dogeos-sdk");
        const [chains, connectors] = await Promise.all([sdk.getChains(), sdk.getConnectors()]);
        const chikyu = ((chains.evm ?? []) as Chain[]).find((c) => Number(c.id) === CHAIN_ID);
        if (!chikyu) throw new Error(`The DogeOS chain list has no chain ${CHAIN_ID}`);
        setRuntimeExplorer(chikyu.blockExplorers?.default.url ?? "");
        const kit: KitConfig = {
          clientId: config.clientId,
          chains: { ...chains, evm: [chikyu] },
          connectors,
          defaultConnectChain: sdk.ChainTypeEnum.EVM as KitConfig["defaultConnectChain"],
          // MyDoge native-first comes from the SDK's connector order; X and Google as social logins.
          login: { basicLogins: ["externalWallets"], socialLogins: [{ type: "x" }, { type: "google" }] },
          metadata: {
            name: "Sooth",
            description: "Sells your native DOGE only when the signed DOGE/USD falls to your stop",
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
          ...(config.stage ? { embeddedWalletConfig: { stage: config.stage as never } } : {}),
        };
        if (!cancelled) setBoot({ sdk, chain: chikyu, kit });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The app is always rendered at the same place in the tree; the SDK's provider sits beside it and only
  // reports the wallet up. Swapping the tree when the SDK finished loading used to remount every page.
  const WalletConnectProvider = boot?.sdk.WalletConnectProvider;
  return (
    <>
      <StoreProvider liveWallet={liveWallet ?? undefined}>
        {error && (
          <p role="alert" style={{ margin: 0, padding: "8px 16px", fontSize: 13, color: "var(--negative)" }}>
            Wallet could not start: {error}
          </p>
        )}
        {children}
      </StoreProvider>
      {boot && WalletConnectProvider && (
        <WalletConnectProvider config={boot.kit}>
          <Bridge sdk={boot.sdk} chain={boot.chain} onChange={setLiveWallet} />
        </WalletConnectProvider>
      )}
    </>
  );
}
