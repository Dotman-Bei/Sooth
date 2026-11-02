// On-chain evidence that needs no signed price (prd.md §14): E-2, E-6, E-7. evidence-priced.mjs records E-3, E-4, E-5.
//   E-2  exact approve + arm
//   E-6  Sooth and the venue hold none of the holder's DOGE before any trigger (I-3)
//   E-7  cancel, then trigger -> reverts NoActiveStop (I-5); trigger checks this before reading a price
// Ends by revoking the allowance (prd.md §10.6).
//
//   node scripts/evidence-nokey.mjs
//
// Reads deployments/chikyu.json and PRIVATE_KEY from .env. G0_RPC / DEPLOY_OUT / EVIDENCE_DIR override
// the RPC, the deployment file and the output folder for fork dry runs.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "app", "package.json"));
const { createPublicClient, createWalletClient, http, defineChain, parseEther, encodeFunctionData, decodeErrorResult, formatEther } =
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

const AMOUNT = parseEther(process.env.ARM_AMOUNT ?? "30"); // scaled to the test wallet; prd demo uses 98 of 100
const FLOOR = parseEther("2");
const STOP = 7_000_000n; // $0.0700 at 8 decimals (prd.md §5.1)

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

const holderStart = await bal(account.address);
if (holderStart < AMOUNT + FLOOR + parseEther("1")) throw new Error(`Need more than ${formatEther(AMOUNT + FLOOR)} DOGE plus gas`);
console.log(`Holder ${account.address} · ${formatEther(holderStart)} DOGE\n`);

// E-2
const approve = await send(DOGE, encodeFunctionData({ abi: erc20, functionName: "approve", args: [SOOTH, AMOUNT] }), "E-2 approve (exact)");
const allowance = await pub.readContract({ address: DOGE, abi: erc20, functionName: "allowance", args: [account.address, SOOTH] });
const arm = await send(SOOTH, encodeFunctionData({ abi: soothAbi, functionName: "arm", args: [STOP, AMOUNT, FLOOR, 0n] }), "E-2 arm");
const stop = await pub.readContract({ address: SOOTH, abi: soothAbi, functionName: "stops", args: [account.address] });
save("e-2.json", {
  id: "E-2",
  check: "Demo holder approves the exact amount and arms a stop",
  result: approve.status === "success" && arm.status === "success" && allowance === AMOUNT && stop[5] === true ? "PASS" : "FAIL",
  txs: { approve: approve.transactionHash, arm: arm.transactionHash },
  allowance,
  stop: { amount: stop[0], gasFloor: stop[1], stopPrice: stop[2], armedAt: stop[3], expiry: stop[4], active: stop[5] },
});

// E-6 (I-3)
const [soothDoge, venueDoge, holderAfterArm] = await Promise.all([bal(SOOTH), bal(VENUE), bal(account.address)]);
const block6 = await pub.getBlockNumber();
save("e-6.json", {
  id: "E-6",
  check: "Before a trigger, Sooth and the venue hold none of the holder's DOGE (I-3)",
  result: soothDoge === 0n && venueDoge === 0n ? "PASS" : "FAIL",
  block: block6,
  balanceOf: { sooth: soothDoge, venue: venueDoge, holder: holderAfterArm },
  holderOnlyPaidGas: holderStart - holderAfterArm,
});

// E-7 (I-5): cancel, then trigger. Fixed gas so the revert is mined and linkable.
const cancel = await send(SOOTH, encodeFunctionData({ abi: soothAbi, functionName: "cancel" }), "E-7 cancel");
const triggerData = encodeFunctionData({ abi: soothAbi, functionName: "trigger", args: [account.address] });
const trig = await send(SOOTH, triggerData, "E-7 trigger", 300_000n);
let decoded = null;
try {
  await pub.call({ account: account.address, to: SOOTH, data: triggerData, blockNumber: trig.blockNumber - 1n });
} catch (e) {
  let cur = e, data;
  for (let i = 0; i < 8 && cur && !data; i++) { if (typeof cur.data === "string" && cur.data.startsWith("0x")) data = cur.data; cur = cur.cause; }
  if (data) decoded = decodeErrorResult({ abi: soothAbi, data }).errorName;
}
save("e-7.json", {
  id: "E-7",
  check: "cancel, then trigger -> reverts NoActiveStop (I-5)",
  result: cancel.status === "success" && trig.status === "reverted" && decoded === "NoActiveStop" ? "PASS" : "FAIL",
  txs: { cancel: cancel.transactionHash, trigger: trig.transactionHash },
  triggerStatus: trig.status,
  decodedRevert: decoded,
  holderDogeUnchangedByTrigger: (await bal(account.address)) >= holderAfterArm - parseEther("1"),
});

// Revoke (prd.md §10.6)
const revoke = await send(DOGE, encodeFunctionData({ abi: erc20, functionName: "approve", args: [SOOTH, 0n] }), "revoke allowance");
console.log(`\nAllowance after revoke: ${await pub.readContract({ address: DOGE, abi: erc20, functionName: "allowance", args: [account.address, SOOTH] })}`);
console.log(`Spent ${formatEther(holderStart - (await bal(account.address)))} DOGE in gas`);
void revoke;
