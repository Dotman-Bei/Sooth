// Live chain access with viem. Used by the store only when LIVE (config.ts).
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeErrorResult,
  encodeFunctionData,
  formatUnits,
  http,
  parseEventLogs,
  parseUnits,
  serializeTransaction,
  type Chain,
  type EIP1193Provider,
  type Hex,
  type PublicClient,
} from "viem";
import { config, L1_GAS_PRICE_ORACLE, NATIVE_DOGE } from "./config";
import { ERC20_ABI, L1_ORACLE_ABI, SOOTH_ABI } from "./abi";
import type { SoothError } from "./errors";
import type { Receipt, SoothEvent, Stop } from "./store";

const SOOTH = () => config.sooth as `0x${string}`;
// Fixed gas for trigger so a call that reverts still lands on-chain with a hash to link (prd.md §14 E-3).
const TRIGGER_GAS = BigInt(process.env.NEXT_PUBLIC_TRIGGER_GAS_LIMIT ?? 600_000);
const FROM_BLOCK = process.env.NEXT_PUBLIC_SOOTH_DEPLOY_BLOCK ? BigInt(process.env.NEXT_PUBLIC_SOOTH_DEPLOY_BLOCK) : 0n;

export const toDoge = (wei: bigint) => Number(formatUnits(wei, 18));
export const dogeWei = (n: number) => parseUnits(n.toFixed(18), 18);
export const toPrice = (raw: bigint) => Number(formatUnits(raw, config.priceDecimals));
export const priceRaw = (n: number) => parseUnits(n.toFixed(config.priceDecimals), config.priceDecimals);
const toPayout = (wei: bigint) => Number(formatUnits(wei, 18)); // tDOLLAR, 18 decimals (prd.md §9.4)

export const makePublic = (chain: Chain) => createPublicClient({ chain, transport: http() }) as PublicClient;

export function makeWallet(chain: Chain, provider: unknown, account: `0x${string}`) {
  if (!provider || typeof (provider as EIP1193Provider).request !== "function") {
    throw new Error("The connected wallet does not expose an EVM provider");
  }
  return createWalletClient({ chain, transport: custom(provider as EIP1193Provider), account });
}
export type Wallet = ReturnType<typeof makeWallet>;

// Reads

export async function readStop(pub: PublicClient, holder: `0x${string}`, blockNumber?: bigint): Promise<Stop | null> {
  const [amount, gasFloor, stopPrice, armedAt, expiry, active] = await pub.readContract({
    address: SOOTH(),
    abi: SOOTH_ABI,
    functionName: "stops",
    args: [holder],
    blockNumber,
  });
  if (armedAt === 0n) return null;
  return {
    amount: toDoge(amount),
    gasFloor: toDoge(gasFloor),
    stopPrice: toPrice(stopPrice),
    armedAt: Number(armedAt) * 1000,
    expiry: Number(expiry) * 1000,
    active,
  };
}

// Chikyū's RPC rejects getLogs spans over 10,000 blocks, and it makes ~3.4 blocks/s
// (evidence/g0/read-probes.json). Scan in chunks, a few at a time, and only scan new blocks after the
// first read. Without NEXT_PUBLIC_SOOTH_DEPLOY_BLOCK, history starts ~1 day back.
const MAX_SPAN = 10_000n;
const FALLBACK_SPAN = 300_000n;
const PARALLEL = 6;
type SoothLog = Awaited<ReturnType<typeof fetchSoothLogs>>[number];
let logCache: { to: bigint; logs: SoothLog[] } | null = null;

function fetchSoothLogs(pub: PublicClient, fromBlock: bigint, toBlock: bigint) {
  return pub.getContractEvents({ address: SOOTH(), abi: SOOTH_ABI, fromBlock, toBlock });
}

async function soothLogs(pub: PublicClient) {
  const latest = await pub.getBlockNumber();
  const start = logCache
    ? logCache.to + 1n
    : FROM_BLOCK || (latest > FALLBACK_SPAN ? latest - FALLBACK_SPAN : 0n);
  const ranges: [bigint, bigint][] = [];
  for (let f = start; f <= latest; f += MAX_SPAN) ranges.push([f, f + MAX_SPAN - 1n < latest ? f + MAX_SPAN - 1n : latest]);
  const fresh: SoothLog[] = [];
  for (let i = 0; i < ranges.length; i += PARALLEL) {
    const batch = await Promise.all(ranges.slice(i, i + PARALLEL).map(([a, b]) => fetchSoothLogs(pub, a, b)));
    fresh.push(...batch.flat());
  }
  logCache = { to: latest, logs: [...(logCache?.logs ?? []), ...fresh] };
  return logCache.logs;
}

export async function readEvents(pub: PublicClient, holder: `0x${string}`): Promise<SoothEvent[]> {
  // getContractEvents does not filter multi-event queries by an indexed arg, so filter here.
  const logs = (await soothLogs(pub)).filter(
    (l) => (l.args as { holder?: string }).holder?.toLowerCase() === holder.toLowerCase(),
  );
  const blocks = new Map<bigint, number>();
  await Promise.all(
    [...new Set(logs.map((l) => l.blockNumber))].map(async (n) => {
      const b = await pub.getBlock({ blockNumber: n });
      blocks.set(n, Number(b.timestamp) * 1000);
    }),
  );
  return logs
    .map((l): SoothEvent => {
      const at = blocks.get(l.blockNumber) ?? 0;
      const tx = l.transactionHash;
      if (l.eventName === "Armed") {
        const a = l.args;
        return {
          kind: "Armed",
          at,
          tx,
          detail: `Stop $${toPrice(BigInt(a.stopPrice ?? 0)).toFixed(4)}, ${toDoge(a.amount ?? 0n).toFixed(2)} DOGE, floor ${toDoge(a.gasFloor ?? 0n).toFixed(2)}`,
        };
      }
      if (l.eventName === "Triggered") {
        const a = l.args;
        return {
          kind: "Triggered",
          at,
          tx,
          detail: `Sold ${toDoge(a.amount ?? 0n).toFixed(2)} DOGE at $${toPrice(a.price ?? 0n).toFixed(4)}`,
        };
      }
      return { kind: "Cancelled", at, tx, detail: "Stop cancelled" };
    })
    .sort((a, b) => b.at - a.at);
}

export async function readHolder(pub: PublicClient, holder: `0x${string}`) {
  const [balance, allowance, stop, events] = await Promise.all([
    pub.readContract({ address: NATIVE_DOGE, abi: ERC20_ABI, functionName: "balanceOf", args: [holder] }),
    pub.readContract({ address: NATIVE_DOGE, abi: ERC20_ABI, functionName: "allowance", args: [holder, SOOTH()] }),
    readStop(pub, holder),
    readEvents(pub, holder),
  ]);
  return { balance: toDoge(balance), allowance: toDoge(allowance), stop, events };
}

export async function readReceipt(pub: PublicClient, tx: Hex): Promise<Receipt | null> {
  const r = await pub.getTransactionReceipt({ hash: tx });
  const [ev] = parseEventLogs({ abi: SOOTH_ABI, logs: r.logs, eventName: "Triggered" });
  if (!ev) return null;
  const { holder, caller, price, priceTimestamp, amount, proceeds, fee } = ev.args;
  const n = r.blockNumber;
  // Historical reads need an archive-capable RPC; without one these stay null and the page says so.
  const at = (block: bigint) =>
    pub
      .readContract({ address: NATIVE_DOGE, abi: ERC20_ABI, functionName: "balanceOf", args: [holder], blockNumber: block })
      .then(toDoge)
      .catch(() => null);
  const [before, after, stop] = await Promise.all([
    at(n - 1n),
    at(n),
    readStop(pub, holder, n).catch(() => readStop(pub, holder)),
  ]);
  return {
    tx,
    block: Number(n),
    holder,
    caller,
    price: toPrice(price),
    priceTs: Number(priceTimestamp),
    amount: toDoge(amount),
    proceeds: toPayout(proceeds),
    fee: toPayout(fee),
    before,
    after,
    gasFloor: stop?.gasFloor ?? 0,
    stopPrice: stop?.stopPrice ?? 0,
  };
}

export async function readParams(pub: PublicClient) {
  const read = (functionName: "CALLER_FEE_BPS" | "MAX_PRICE_AGE" | "MAX_PRICE_AHEAD" | "MIN_GAS_FLOOR") =>
    pub.readContract({ address: SOOTH(), abi: SOOTH_ABI, functionName }).catch(() => null);
  const [fee, age, ahead, floor, threshold] = await Promise.all([
    read("CALLER_FEE_BPS"),
    read("MAX_PRICE_AGE"),
    read("MAX_PRICE_AHEAD"),
    read("MIN_GAS_FLOOR"),
    pub.readContract({ address: SOOTH(), abi: SOOTH_ABI, functionName: "getUniqueSignersThreshold" }).catch(() => null),
  ]);
  return {
    callerFeeBps: fee === null ? null : Number(fee),
    maxPriceAge: age === null ? null : Number(age),
    maxPriceAhead: ahead === null ? null : Number(ahead),
    minGasFloor: floor === null ? null : toDoge(floor),
    signerThreshold: threshold === null ? null : Number(threshold),
  };
}

// Full DogeOS fee: execution plus data-and-finality from L1GasPriceOracle (prd.md §10.5)
export async function estimateFees(pub: PublicClient, from: `0x${string}`, to: `0x${string}`, data: Hex) {
  const [gas, gasPrice] = await Promise.all([pub.estimateGas({ account: from, to, data }), pub.getGasPrice()]);
  const serialized = serializeTransaction({ chainId: pub.chain?.id, to, data, gas, gasPrice, nonce: 0, type: "legacy" });
  const l1 = await pub.readContract({
    address: L1_GAS_PRICE_ORACLE,
    abi: L1_ORACLE_ABI,
    functionName: "getL1Fee",
    args: [serialized],
  });
  return { execution: toDoge(gas * gasPrice), data: toDoge(l1) };
}

// Calldata

export const approveData = (amount: number) =>
  encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [SOOTH(), dogeWei(amount)] });

export const armData = (s: { stopPrice: number; amount: number; gasFloor: number; expiry: number }) =>
  encodeFunctionData({
    abi: SOOTH_ABI,
    functionName: "arm",
    args: [priceRaw(s.stopPrice), dogeWei(s.amount), dogeWei(s.gasFloor), BigInt(Math.floor(s.expiry / 1000))],
  });

export const cancelData = () => encodeFunctionData({ abi: SOOTH_ABI, functionName: "cancel" });

/** trigger(holder) with the signed price payload appended (prd.md §5.1, D-018) */
export const triggerData = (holder: `0x${string}`, payload: string) =>
  (encodeFunctionData({ abi: SOOTH_ABI, functionName: "trigger", args: [holder] }) + payload.replace(/^0x/, "")) as Hex;

// Writes

export async function send(wallet: Wallet, pub: PublicClient, to: `0x${string}`, data: Hex, opts: { fixedGas?: boolean } = {}) {
  const hash = await wallet.sendTransaction({
    to,
    data,
    chain: wallet.chain,
    account: wallet.account!,
    ...(opts.fixedGas ? { gas: TRIGGER_GAS } : {}),
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

export { SOOTH, NATIVE_DOGE };

// Reverts

function revertData(e: unknown): Hex | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 8 && cur; i++) {
    const c = cur as { data?: unknown; cause?: unknown };
    if (typeof c.data === "string" && c.data.startsWith("0x")) return c.data as Hex;
    if (c.data && typeof (c.data as { data?: unknown }).data === "string") return (c.data as { data: Hex }).data;
    cur = c.cause;
  }
  return undefined;
}

export const isUserRejection = (e: unknown) => {
  let cur: unknown = e;
  for (let i = 0; i < 8 && cur; i++) {
    const c = cur as { code?: number; name?: string; cause?: unknown };
    if (c.code === 4001 || c.name === "UserRejectedRequestError") return true;
    cur = c.cause;
  }
  return false;
};

/** Re-run a reverted call one block earlier to recover its reason, then decode it into a SoothError. */
export async function explainRevert(
  pub: PublicClient,
  from: `0x${string}`,
  to: `0x${string}`,
  data: Hex,
  blockNumber: bigint,
  stop: Stop | null,
): Promise<SoothError> {
  try {
    await pub.call({ account: from, to, data, blockNumber: blockNumber - 1n });
    return { name: "Unknown" };
  } catch (e) {
    return decodeRevert(e, stop);
  }
}

export function decodeRevert(e: unknown, stop: Stop | null): SoothError {
  const data = revertData(e);
  if (!data) return { name: "Unknown" };
  try {
    const d = decodeErrorResult({ abi: SOOTH_ABI, data });
    const a = (d.args ?? []) as readonly bigint[];
    switch (d.errorName) {
      case "NoActiveStop":
        return { name: "NoActiveStop" };
      case "StopExpired":
        return { name: "StopExpired", expiry: stop?.expiry ?? 0 };
      case "PriceAboveStop":
        return { name: "PriceAboveStop", price: toPrice(a[0]), stopPrice: toPrice(a[1]) };
      case "PriceOlderThanArm":
        return { name: "PriceOlderThanArm", priceTs: Number(a[0]), armedAt: Number(a[1]) * 1000 };
      case "BelowGasFloor":
        return { name: "BelowGasFloor", balance: toDoge(a[0]), amount: toDoge(a[1]), gasFloor: toDoge(a[2]) };
      case "GasFloorTooLow":
        return { name: "GasFloorTooLow" };
      case "BadAmount":
        return { name: "BadAmount" };
      case "VenueInsolvent":
        return { name: "VenueInsolvent" };
      default:
        return { name: "SignerOrTimestamp" };
    }
  } catch {
    return { name: "Unknown" };
  }
}
