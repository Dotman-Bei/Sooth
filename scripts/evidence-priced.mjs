// On-chain evidence that needs a signed price (prd.md §14): E-3, E-4, E-5.
//   E-3  stop below the live price: trigger is mined and reverts PriceAboveStop
//   E-4  stop above the live price: trigger sells; Triggered event
//   E-5  balances before and after E-4: holder keeps at least the gas floor; venue DOGE += amount
// The signed payload comes from the running app's /api/payload (Sooth's price signers, DECISIONS.md D-018).
// Ends by revoking the allowance (prd.md §10.6).
//
//   cd app && pnpm start   (in another terminal)
//   node scripts/evidence-priced.mjs
//
// Reads deployments/chikyu.json and PRIVATE_KEY from .env. G0_RPC / DEPLOY_OUT / EVIDENCE_DIR / PAYLOAD_URL override
// the RPC, the deployment file, the output folder and the payload source for fork dry runs.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "app", "package.json"));
const { createPublicClient, createWalletClient, http, defineChain, parseEther, encodeFunctionData, decodeErrorResult, decodeEventLog, formatEther, concat } =
  require("viem");
const { privateKeyToAccount } = require("viem/accounts");

const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const rawPk = (process.env.PRIVATE_KEY ?? "").trim();
const pk = /^[0-9a-fA-F]{64}$/.test(rawPk) ? `0x${rawPk}` : rawPk;
if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) throw new Error("Set PRIVATE_KEY in .env");

const deployFile = process.env.DEPLOY_OUT || join(root, "deployments", "chikyu.json");
const dep = JSON.parse(readFileSync(deployFile, "utf8"));
const SOOTH = dep.contracts.Sooth.address;
const VENUE = dep.contracts.BackstopVenue.address;
const DOGE = "0x530000000000000000000000000000000000d09e";
const RPC = process.env.G0_RPC || "https://rpc.testnet.dogeos.com";
const outDir = process.env.EVIDENCE_DIR || join(root, "evidence", "chikyu");

const AMOUNT = parseEther(process.env.ARM_AMOUNT ?? "5"); // small: E-4 really sells it for test dollars
const FLOOR = parseEther("2");
const STOP_BELOW_PRICE = 1_000_000n; // $0.01: the live price is above it, so trigger must revert (E-3)
const STOP_ABOVE_PRICE = 100_000_000n; // $1.00: the live price is at or below it, so trigger sells (E-4)
const TRIGGER_GAS = 600_000n; // D-007, as the app sends it
const PAYLOAD_URL = process.env.PAYLOAD_URL || "http://localhost:3000/api/payload";
const PAYOUT = dep.contracts.TestDollar.address;

const chain = defineChain({ id: 6281971, name: "DogeOS Chikyū", nativeCurrency: { name: "DOGE", symbol: "DOGE", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ chain, transport: http(RPC), account });
const soothAbi = JSON.parse(readFileSync(join(root, "contracts", "out", "Sooth.sol", "Sooth.json"), "utf8")).abi;
const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];

const bal = (a) => pub.readContract({ address: DOGE, abi: erc20, functionName: "balanceOf", args: [a] });
const send = async (to, data, label, gas) => {
  const hash = await wallet.sendTransaction({ to, data, ...(gas ? { gas } : {}) });
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`${label.padEnd(22)} ${r.status.padEnd(9)} ${hash}`);
  return r;
};
const save = (name, obj) => {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, name), JSON.stringify({ recordedAt: new Date().toISOString(), sooth: SOOTH, venue: VENUE, holder: account.address, ...obj }, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
  console.log(`  wrote ${join(outDir, name)}`);
};

const errorName = (e) => {
  let cur = e, data;
  for (let i = 0; i < 8 && cur && !data; i++) { if (typeof cur.data === "string" && cur.data.startsWith("0x")) data = cur.data; cur = cur.cause; }
  if (!data) return null;
  const d = decodeErrorResult({ abi: soothAbi, data });
  return { name: d.errorName, args: d.args };
};
const signedPrice = async () => {
  const res = await fetch(PAYLOAD_URL, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(`payload: ${body.error ?? res.status}`);
  return body;
};
// Fresh payload right before sending: the contract rejects prices older than 60 s.
const trigger = async (label) => {
  const price = await signedPrice();
  const data = concat([encodeFunctionData({ abi: soothAbi, functionName: "trigger", args: [account.address] }), price.payload]);
  const r = await send(SOOTH, data, label, TRIGGER_GAS);
  return { r, data, price };
};
const usdBal = (a) => pub.readContract({ address: PAYOUT, abi: erc20, functionName: "balanceOf", args: [a] });

const holderStart = await bal(account.address);
if (holderStart < AMOUNT + FLOOR + parseEther("2")) throw new Error(`Need more than ${formatEther(AMOUNT + FLOOR)} DOGE plus gas`);
console.log(`Holder ${account.address} · ${formatEther(holderStart)} DOGE
`);

await send(DOGE, encodeFunctionData({ abi: erc20, functionName: "approve", args: [SOOTH, AMOUNT] }), "approve (exact)");

// E-3
await send(SOOTH, encodeFunctionData({ abi: soothAbi, functionName: "arm", args: [STOP_BELOW_PRICE, AMOUNT, FLOOR, 0n] }), "E-3 arm at $0.01");
const e3 = await trigger("E-3 trigger");
let e3Revert = null;
try {
  await pub.call({ account: account.address, to: SOOTH, data: e3.data, blockNumber: e3.r.blockNumber - 1n });
} catch (e) {
  e3Revert = errorName(e);
}
save("e-3.json", {
  id: "E-3",
  check: "trigger with the signed price above the stop -> reverted tx, decoded PriceAboveStop",
  result: e3.r.status === "reverted" && e3Revert?.name === "PriceAboveStop" ? "PASS" : "FAIL",
  stopPrice: STOP_BELOW_PRICE,
  txs: { trigger: e3.r.transactionHash },
  decodedRevert: e3Revert,
  signedPrice: { value: e3.price.value, timestamp: e3.price.timestamp, signers: e3.price.signers, sources: e3.price.sources },
});

// E-4 and E-5
await send(SOOTH, encodeFunctionData({ abi: soothAbi, functionName: "arm", args: [STOP_ABOVE_PRICE, AMOUNT, FLOOR, 0n] }), "E-4 arm at $1.00");
const before = { holder: await bal(account.address), venue: await bal(VENUE), sooth: await bal(SOOTH), holderUsd: await usdBal(account.address) };
const e4 = await trigger("E-4 trigger");
const after = { holder: await bal(account.address), venue: await bal(VENUE), sooth: await bal(SOOTH), holderUsd: await usdBal(account.address) };
const event = e4.r.logs
  .filter((l) => l.address.toLowerCase() === SOOTH.toLowerCase())
  .map((l) => { try { return decodeEventLog({ abi: soothAbi, data: l.data, topics: l.topics }); } catch { return null; } })
  .find((d) => d?.eventName === "Triggered");
save("e-4.json", {
  id: "E-4",
  check: "trigger with the signed price at or below the stop -> success tx with a Triggered event",
  result: e4.r.status === "success" && !!event ? "PASS" : "FAIL",
  stopPrice: STOP_ABOVE_PRICE,
  txs: { trigger: e4.r.transactionHash },
  gasUsed: e4.r.gasUsed,
  triggered: event?.args ?? null,
  signedPrice: { value: e4.price.value, timestamp: e4.price.timestamp, signers: e4.price.signers, sources: e4.price.sources },
});
save("e-5.json", {
  id: "E-5",
  check: "Around E-4: holder DOGE stays at or above the gas floor; venue DOGE grows by the amount; Sooth holds none",
  result: after.holder >= FLOOR && after.venue - before.venue === AMOUNT && after.sooth === 0n ? "PASS" : "FAIL",
  block: e4.r.blockNumber,
  before,
  after,
  gasFloor: FLOOR,
  amount: AMOUNT,
});

const revoke = await send(DOGE, encodeFunctionData({ abi: erc20, functionName: "approve", args: [SOOTH, 0n] }), "revoke allowance");
console.log(`
Allowance after revoke: ${await pub.readContract({ address: DOGE, abi: erc20, functionName: "allowance", args: [account.address, SOOTH] })}`);
console.log(`DOGE: ${formatEther(holderStart)} -> ${formatEther(await bal(account.address))} (sold ${formatEther(AMOUNT)} plus gas)`);
