"use client";

// App state. Two branches behind one interface:
// - preview (no contract address or DogeOS clientId in env): every value is a labelled sample from the
//   PRD demo (prd.md §5.1, §19.1);
// - live: wallet from the DogeOS SDK (via LiveBridge), prices from /api/price (Sooth's price signers, D-018),
//   reads and writes against Sooth and native DOGE with viem (lib/live.ts).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Chain, PublicClient } from "viem";
import { config, LIVE, NATIVE_DOGE, PARAMS } from "./config";
import type { SoothError } from "./errors";
import { useToast } from "@/components/Toast";
// Chain code (viem) loads only in live mode, so preview pages stay light.
const loadLive = () => import("./live");

export type Point = { t: number; p: number };

export type Stop = {
  stopPrice: number;
  amount: number;
  gasFloor: number;
  armedAt: number;
  expiry: number; // ms, 0 = none
  active: boolean;
};

export type SoothEvent = {
  kind: "Armed" | "Cancelled" | "Triggered";
  at: number;
  tx: string;
  detail: string;
};

export type Receipt = {
  tx: string;
  block: number;
  holder: string;
  caller: string;
  price: number;
  priceTs: number;
  amount: number;
  proceeds: number;
  fee: number;
  before: number | null; // null when the RPC cannot read historical balances
  after: number | null;
  gasFloor: number;
  stopPrice: number;
};

export type Holder = {
  balance: number;
  allowance: number;
  stop: Stop | null;
  events: SoothEvent[];
};

export type TriggerResult = { ok: true; receipt: Receipt } | { ok: false; error: SoothError; tx: string };

export type Fees = { execution: number; data: number };

export type Params = {
  callerFeeBps: number | null;
  maxPriceAge: number | null;
  maxPriceAhead: number | null;
  minGasFloor: number | null;
  signerThreshold: number | null;
};

/** What LiveBridge hands the store from inside the DogeOS WalletConnectProvider. */
export type LiveWallet = {
  chain: Chain;
  pub: PublicClient;
  address?: string;
  provider: unknown;
  walletReady: boolean;
  openModal: () => void;
  disconnect: () => Promise<void>;
};

type State = {
  price: { value: number; updatedAt: number; series: Point[] } | null;
  priceError: string | null;
  holders: Record<string, Holder>;
  receipts: Record<string, Receipt>;
  previewWallet: { address: string } | null;
};

type Store = Omit<State, "previewWallet"> & {
  wallet: { address: string } | null;
  walletReady: boolean;
  demoHolder: string;
  connect: (next?: string) => Promise<"connected" | "opened" | "not-ready">;
  disconnect: () => void;
  approve: (amount: number) => Promise<string | null>;
  arm: (s: Omit<Stop, "armedAt" | "active">) => Promise<string | null>;
  cancel: () => Promise<string | null>;
  revoke: () => Promise<string | null>;
  trigger: (holder: string) => Promise<TriggerResult | null>;
  holder: (addr: string) => Holder | undefined;
  refresh: (addr: string) => Promise<void>;
  loadReceipt: (tx: string) => Promise<Receipt | null>;
  estimateFees: (kind: "approve" | "arm", args: { amount: number; stopPrice?: number; gasFloor?: number; expiry?: number }) => Promise<Fees | null>;
  readParams: () => Promise<Params | null>;
};

export const SAMPLE_WALLET = "0x7a3f9e4b1d0c62a85f3e7b19d4c0a8e2f6b591c2";
export const SAMPLE_DEMO_HOLDER = "0xd30e61c84a2b97f0e3d5c1a8b6f49e27c08d5a10";
export const DEMO_HOLDER = LIVE && config.demoHolder ? config.demoHolder.toLowerCase() : SAMPLE_DEMO_HOLDER;
export const SAMPLE_RECEIPT_TX = "0x4be19c07d3f2a8e65b1c40d97ae3f2861c5b09d4e7a3f61b28c9d05e4a17a07c";
// Measured on Chikyū for an approve, G0-8 (evidence/g0/read-probes.json)
const SAMPLE_FEES: Fees = { execution: 0.00000041, data: 0.006 };

const HOUR = 3_600_000;
const SAMPLE_START = 0.0796;
const SAMPLE_NOW = 0.0771;

// Deterministic sample walk so the preview chart is stable between reloads.
function sampleSeries(now: number): Point[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const n = 73;
  const step = (24 * HOUR) / (n - 1);
  const pts: Point[] = [];
  let noise = 0;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    noise = noise * 0.7 + rand() * 0.00016;
    const trend = SAMPLE_START + (SAMPLE_NOW - SAMPLE_START) * f - Math.sin(f * Math.PI * 2) * 0.0009;
    pts.push({ t: now - (n - 1 - i) * step, p: i === n - 1 ? SAMPLE_NOW : trend + noise });
  }
  return pts;
}

const randomHash = () =>
  "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function initialHolders(now: number): Record<string, Holder> {
  return {
    [SAMPLE_WALLET]: { balance: 100, allowance: 0, stop: null, events: [] },
    [SAMPLE_DEMO_HOLDER]: {
      balance: 100,
      allowance: 98,
      stop: { stopPrice: 0.07, amount: 98, gasFloor: 2, armedAt: now - 5 * HOUR, expiry: 0, active: true },
      events: [
        { kind: "Armed", at: now - 5 * HOUR, tx: randomHash(), detail: "Stop $0.0700, 98.00 DOGE, floor 2.00" },
      ],
    },
  };
}

function sampleReceipt(): Receipt {
  const ts = Date.UTC(2026, 9, 31, 14, 2, 7);
  const proceeds = 98 * 0.0698;
  const fee = (proceeds * PARAMS.callerFeeBps) / 10_000;
  return {
    tx: SAMPLE_RECEIPT_TX,
    block: 1_284_551,
    holder: SAMPLE_WALLET,
    caller: SAMPLE_DEMO_HOLDER,
    price: 0.0698,
    priceTs: ts,
    amount: 98,
    proceeds,
    fee,
    before: 100,
    after: 2,
    gasFloor: 2,
    stopPrice: 0.07,
  };
}

const KEY = "sooth-preview-v1";
const key = (a: string) => a.toLowerCase();

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children, liveWallet }: { children: React.ReactNode; liveWallet?: LiveWallet }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<State>({
    price: null,
    priceError: null,
    holders: {},
    receipts: {},
    previewWallet: null,
  });
  const [previewReady, setPreviewReady] = useState(false);
  const ref = useRef(state);
  ref.current = state;
  const lw = useRef(liveWallet);
  lw.current = liveWallet;
  const pendingRoute = useRef<string | null>(null);
  const previewReadyRef = useRef(previewReady);
  previewReadyRef.current = previewReady;

  const wallet = LIVE
    ? liveWallet?.address
      ? { address: key(liveWallet.address) }
      : null
    : state.previewWallet;
  const walletReady = LIVE ? !!liveWallet?.walletReady : previewReady;

  // Preview boot: restore the session, seed the sample price, tick every 10 s.
  useEffect(() => {
    if (LIVE) return;
    const now = Date.now();
    let restored: Partial<State> = {};
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) restored = JSON.parse(raw);
    } catch {}
    setState({
      price: { value: SAMPLE_NOW, updatedAt: now, series: sampleSeries(now) },
      priceError: null,
      previewWallet: restored.previewWallet ?? null,
      holders: restored.holders ?? initialHolders(now),
      receipts: { [SAMPLE_RECEIPT_TX]: sampleReceipt(), ...(restored.receipts ?? {}) },
    });
    // The SDK takes a moment to become wallet-ready (prd.md §10.2).
    const ready = setTimeout(() => setPreviewReady(true), 600);
    let seed = 11;
    const tick = setInterval(() => {
      seed = (seed * 16807) % 2147483647;
      const step = ((seed / 2147483647) * 2 - 1) * 0.00012;
      setState((s) => {
        if (!s.price) return s;
        const value = Math.min(0.079, Math.max(0.0752, s.price.value + step));
        const t = Date.now();
        return { ...s, price: { value, updatedAt: t, series: [...s.price.series.slice(1), { t, p: value }] } };
      });
    }, 10_000);
    return () => {
      clearTimeout(ready);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (LIVE || Object.keys(state.holders).length === 0) return;
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ previewWallet: state.previewWallet, holders: state.holders, receipts: state.receipts }),
      );
    } catch {}
  }, [state.previewWallet, state.holders, state.receipts]);

  // Live price: 24 h history once, then the latest signed package every 10 s (prd.md §10.3).
  useEffect(() => {
    if (!LIVE) return;
    let stopped = false;
    const latest = async () => {
      try {
        const res = await fetch("/api/price", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Price unavailable");
        if (stopped) return;
        setState((s) => {
          const series = s.price?.series ?? [];
          const last = series[series.length - 1];
          const next = last && last.t >= body.timestamp ? series : [...series, { t: body.timestamp, p: body.value }];
          return { ...s, priceError: null, price: { value: body.value, updatedAt: body.timestamp, series: next } };
        });
      } catch (e) {
        if (!stopped) setState((s) => ({ ...s, priceError: (e as Error).message }));
      }
    };
    (async () => {
      try {
        const res = await fetch("/api/price/history", { cache: "no-store" });
        const body = await res.json();
        if (res.ok && Array.isArray(body.points) && !stopped) {
          setState((s) => ({
            ...s,
            price: s.price ?? (body.points.length ? { value: body.points.at(-1).p, updatedAt: body.points.at(-1).t, series: body.points } : null),
          }));
        }
      } catch {}
      await latest();
    })();
    const id = setInterval(latest, 10_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  const refresh = useCallback(async (addr: string) => {
    const l = lw.current;
    if (!LIVE || !l) return;
    try {
      const live = await loadLive();
      const h = await live.readHolder(l.pub, addr as `0x${string}`);
      setState((s) => ({ ...s, holders: { ...s.holders, [key(addr)]: h } }));
    } catch (e) {
      toast(`Could not read ${addr.slice(0, 6)}… from Chikyū: ${(e as Error).message.split("\n")[0]}`);
    }
  }, [toast]);

  // Live: read the connected wallet, and finish a connect that was waiting on the modal.
  const liveAddress = liveWallet?.address;
  useEffect(() => {
    if (!LIVE || !liveAddress) return;
    refresh(liveAddress);
    if (pendingRoute.current) {
      router.push(pendingRoute.current);
      pendingRoute.current = null;
    }
  }, [liveAddress, refresh, router]);

  const patchHolder = useCallback((addr: string, fn: (h: Holder) => Holder) => {
    setState((s) => ({ ...s, holders: { ...s.holders, [addr]: fn(s.holders[addr]) } }));
  }, []);

  const me = () => (LIVE ? key(lw.current?.address ?? "") : ref.current.previewWallet?.address ?? SAMPLE_WALLET);

  const walletClient = async () => {
    const l = lw.current;
    if (!l?.address) throw new Error("Connect a wallet first");
    return (await loadLive()).makeWallet(l.chain, l.provider, l.address as `0x${string}`);
  };

  /** Run a live write, toast plain failures, return the tx hash or null. */
  const liveWrite = useCallback(
    async (build: (live: typeof import("./live")) => [`0x${string}`, `0x${string}`], after: () => Promise<void>) => {
      const l = lw.current!;
      const live = await loadLive();
      try {
        const [to, data] = build(live);
        const { hash, receipt } = await live.send(await walletClient(), l.pub, to, data);
        await after();
        if (receipt.status !== "success") {
          toast("The transaction reverted. Nothing changed.");
          return null;
        }
        return hash;
      } catch (e) {
        toast(live.isUserRejection(e) ? "You rejected the request in your wallet." : (e as Error).message.split("\n")[0]);
        return null;
      }
    },
    [toast],
  );

  const connect = useCallback(async (next?: string) => {
    if (LIVE) {
      const l = lw.current;
      if (!l?.walletReady) return "not-ready" as const;
      if (l.address) return "connected" as const;
      pendingRoute.current = next ?? null;
      l.openModal();
      return "opened" as const;
    }
    if (!previewReadyRef.current) return "not-ready" as const;
    setState((s) => ({ ...s, previewWallet: { address: SAMPLE_WALLET } }));
    return "connected" as const;
  }, []);

  const disconnect = useCallback(() => {
    if (LIVE) lw.current?.disconnect();
    else setState((s) => ({ ...s, previewWallet: null }));
  }, []);

  const approve = useCallback(async (amount: number) => {
    if (LIVE) return liveWrite((live) => [NATIVE_DOGE, live.approveData(amount)], () => refresh(me()));
    await wait(1100);
    patchHolder(me(), (h) => ({ ...h, allowance: amount }));
    return randomHash();
  }, [liveWrite, patchHolder, refresh]);

  const arm = useCallback(async (s: Omit<Stop, "armedAt" | "active">) => {
    if (LIVE) return liveWrite((live) => [live.SOOTH(), live.armData(s)], () => refresh(me()));
    await wait(1100);
    const tx = randomHash();
    const at = Date.now();
    patchHolder(me(), (h) => ({
      ...h,
      stop: { ...s, armedAt: at, active: true },
      events: [
        {
          kind: "Armed",
          at,
          tx,
          detail: `Stop $${s.stopPrice.toFixed(4)}, ${s.amount.toFixed(2)} DOGE, floor ${s.gasFloor.toFixed(2)}`,
        },
        ...h.events,
      ],
    }));
    return tx;
  }, [liveWrite, patchHolder, refresh]);

  const cancel = useCallback(async () => {
    if (LIVE) return liveWrite((live) => [live.SOOTH(), live.cancelData()], () => refresh(me()));
    await wait(900);
    const tx = randomHash();
    patchHolder(me(), (h) => ({
      ...h,
      stop: h.stop ? { ...h.stop, active: false } : null,
      events: [{ kind: "Cancelled", at: Date.now(), tx, detail: "Stop cancelled" }, ...h.events],
    }));
    return tx;
  }, [liveWrite, patchHolder, refresh]);

  // Revoke = approve(Sooth, 0) (prd.md §10.6)
  const revoke = useCallback(async () => {
    if (LIVE) return liveWrite((live) => [NATIVE_DOGE, live.approveData(0)], () => refresh(me()));
    await wait(900);
    patchHolder(me(), (h) => ({ ...h, allowance: 0 }));
    return randomHash();
  }, [liveWrite, patchHolder, refresh]);

  const trigger = useCallback(async (addr: string): Promise<TriggerResult | null> => {
    if (LIVE) {
      const l = lw.current;
      if (!l?.address) {
        toast("Connect a wallet to send the trigger.");
        return null;
      }
      const live = await loadLive();
      try {
        const res = await fetch("/api/payload", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(`Signed price unavailable: ${body.error ?? res.status}`);
        const data = live.triggerData(addr as `0x${string}`, body.payload);
        const { hash, receipt } = await live.send(await walletClient(), l.pub, live.SOOTH(), data, { fixedGas: true });
        await refresh(addr);
        if (receipt.status === "success") {
          const r = await live.readReceipt(l.pub, hash);
          if (r) {
            setState((s) => ({ ...s, receipts: { ...s.receipts, [hash]: r } }));
            return { ok: true, receipt: r };
          }
        }
        const stop = ref.current.holders[key(addr)]?.stop ?? null;
        const error = await live.explainRevert(l.pub, l.address as `0x${string}`, live.SOOTH(), data, receipt.blockNumber, stop);
        return { ok: false, error, tx: hash };
      } catch (e) {
        toast(live.isUserRejection(e) ? "You rejected the request in your wallet." : (e as Error).message.split("\n")[0]);
        return null;
      }
    }

    // Preview: mirrors the check order of Sooth.trigger (prd.md §9.1).
    await wait(1300);
    const s = ref.current;
    const h = s.holders[key(addr)];
    const tx = randomHash();
    const price = s.price?.value ?? 0;
    const now = Date.now();
    if (!h?.stop?.active) return { ok: false, error: { name: "NoActiveStop" }, tx };
    const st = h.stop;
    if (st.expiry && now > st.expiry) return { ok: false, error: { name: "StopExpired", expiry: st.expiry }, tx };
    if (price > st.stopPrice) return { ok: false, error: { name: "PriceAboveStop", price, stopPrice: st.stopPrice }, tx };
    if (h.balance < st.amount + st.gasFloor)
      return { ok: false, error: { name: "BelowGasFloor", balance: h.balance, amount: st.amount, gasFloor: st.gasFloor }, tx };
    const proceeds = st.amount * price;
    const fee = (proceeds * PARAMS.callerFeeBps) / 10_000;
    const receipt: Receipt = {
      tx,
      block: 1_284_000 + Math.floor(Math.random() * 9000),
      holder: key(addr),
      caller: me(),
      price,
      priceTs: s.price?.updatedAt ?? now,
      amount: st.amount,
      proceeds,
      fee,
      before: h.balance,
      after: h.balance - st.amount,
      gasFloor: st.gasFloor,
      stopPrice: st.stopPrice,
    };
    setState((x) => ({
      ...x,
      receipts: { ...x.receipts, [tx]: receipt },
      holders: {
        ...x.holders,
        [key(addr)]: {
          ...h,
          balance: h.balance - st.amount,
          allowance: Math.max(0, h.allowance - st.amount),
          stop: { ...st, active: false },
          events: [
            { kind: "Triggered", at: now, tx, detail: `Sold ${st.amount.toFixed(2)} DOGE at $${price.toFixed(4)}` },
            ...h.events,
          ],
        },
      },
    }));
    return { ok: true, receipt };
  }, [refresh, toast]);

  const loadReceipt = useCallback(async (tx: string) => {
    const known = ref.current.receipts[tx];
    if (known || !LIVE || !lw.current) return known ?? null;
    try {
      const r = await (await loadLive()).readReceipt(lw.current.pub, tx as `0x${string}`);
      if (r) setState((s) => ({ ...s, receipts: { ...s.receipts, [tx]: r } }));
      return r;
    } catch {
      return null;
    }
  }, []);

  const estimateFees = useCallback<Store["estimateFees"]>(async (kind, args) => {
    if (!LIVE) return SAMPLE_FEES;
    const l = lw.current;
    if (!l?.address) return null;
    try {
      const live = await loadLive();
      return kind === "approve"
        ? await live.estimateFees(l.pub, l.address as `0x${string}`, NATIVE_DOGE, live.approveData(args.amount))
        : await live.estimateFees(
            l.pub,
            l.address as `0x${string}`,
            live.SOOTH(),
            live.armData({
              stopPrice: args.stopPrice ?? 0,
              amount: args.amount,
              gasFloor: args.gasFloor ?? 0,
              expiry: args.expiry ?? 0,
            }),
          );
    } catch {
      return null;
    }
  }, []);

  const readParams = useCallback(async () => {
    if (!LIVE || !lw.current) return null;
    return (await loadLive()).readParams(lw.current.pub);
  }, []);

  const value = useMemo<Store>(
    () => ({
      price: state.price,
      priceError: state.priceError,
      holders: state.holders,
      receipts: state.receipts,
      wallet,
      walletReady,
      demoHolder: DEMO_HOLDER,
      connect,
      disconnect,
      approve,
      arm,
      cancel,
      revoke,
      trigger,
      holder: (addr: string) => state.holders[key(addr)],
      refresh,
      loadReceipt,
      estimateFees,
      readParams,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, wallet?.address, walletReady, connect, disconnect, approve, arm, cancel, revoke, trigger, refresh, loadReceipt, estimateFees, readParams],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

/** A holder's stop, balance and history, re-read from chain whenever the address changes (live only). */
export function useHolder(addr: string | undefined) {
  const { holder, refresh } = useStore();
  useEffect(() => {
    if (addr) refresh(addr);
  }, [addr, refresh]);
  return addr ? holder(addr) : undefined;
}
