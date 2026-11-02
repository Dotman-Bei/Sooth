// G0 transaction probes on DogeOS Chikyū (prd.md §7.2). Run by the owner with a funded TEST key.
//
//   cd contracts && forge build && cd ..
//   node scripts/g0/run-tx-probes.mjs            # G0-2 (needs PRIVATE_KEY)
//   node scripts/g0/run-tx-probes.mjs --redstone # also G0-1 and G0-3 (needs REDSTONE_API_KEY)
//
// Reads PRIVATE_KEY and REDSTONE_API_KEY from the environment or from ./.env (never committed,
// never printed). Spends gas plus 1 DOGE that the probe returns at the end. Writes raw results to
// evidence/g0/g0-1.json, g0-2.json, g0-3.json.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(join(root, "app", "package.json"));
const {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseEventLogs,
  encodeFunctionData,
  formatUnits,
  defineChain,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// .env loader (KEY=value lines only)
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const withRedstone = process.argv.includes("--redstone");
// Wallets export keys with or without the 0x prefix; accept both.
const rawPk = (process.env.PRIVATE_KEY ?? "").trim();
const pk = /^[0-9a-fA-F]{64}$/.test(rawPk) ? `0x${rawPk}` : rawPk;
if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  console.error("Set PRIVATE_KEY (64 hex characters, 0x optional) for a funded Chikyū TEST account in the environment or .env");
  process.exit(1);
}
if (withRedstone && !process.env.REDSTONE_API_KEY) {
  console.error("--redstone needs REDSTONE_API_KEY");
  process.exit(1);
}

// From web3-assets.mydoge.com/api/chains (evidence/g0/read-probes.json). G0_RPC overrides it for dry runs
// against a local fork; fork results are not evidence, so G0_EVIDENCE_DIR should point elsewhere then.
const RPC = process.env.G0_RPC || "https://rpc.testnet.dogeos.com";
const chain = defineChain({
  id: 6281971,
  name: "DogeOS Chikyū",
  nativeCurrency: { name: "DOGE", symbol: "DOGE", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ chain, transport: http(RPC), account });

const DOGE = "0x530000000000000000000000000000000000d09e";
const ONE = 10n ** 18n;
const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]);
const evidenceDir = process.env.G0_EVIDENCE_DIR || join(root, "evidence", "g0");
mkdirSync(evidenceDir, { recursive: true });
const save = (name, obj) => {
  const replacer = (_, v) => (typeof v === "bigint" ? v.toString() : v);
  writeFileSync(join(evidenceDir, name), JSON.stringify({ ranAt: new Date().toISOString(), ...obj }, replacer, 2) + "\n");
  console.log(`wrote ${join(evidenceDir, name)}`);
};

function artifact(name) {
  const p = join(root, "contracts", "out", `${name}.sol`, `${name}.json`);
  if (!existsSync(p)) throw new Error(`Missing ${p}. Run: cd contracts && forge build`);
  const j = JSON.parse(readFileSync(p, "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object };
}

async function deploy(name) {
  const { abi, bytecode } = artifact(name);
  const hash = await wallet.deployContract({ abi, bytecode });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success" || !r.contractAddress) throw new Error(`${name} deploy failed: ${hash}`);
  console.log(`${name} deployed at ${r.contractAddress} (${hash})`);
  return { abi, address: r.contractAddress, hash };
}

async function send(to, data, label) {
  const hash = await wallet.sendTransaction({ to, data });
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`${label}: ${r.status} (${hash})`);
  return r;
}

console.log(`Account ${account.address}`);
const startBalance = await pub.getBalance({ address: account.address });
console.log(`Balance ${formatUnits(startBalance, 18)} DOGE`);
if (startBalance < 2n * ONE) {
  console.error("Need at least 2 DOGE on the test account (1 pulled and returned, plus gas).");
  process.exit(1);
}

// ---------- G0-2: transferFrom on native DOGE ----------
{
  const probe = await deploy("DogePullProbe");
  const approve = await send(DOGE, encodeFunctionData({ abi: erc20, functionName: "approve", args: [probe.address, ONE] }), "approve 1 DOGE");
  const allowance = await pub.readContract({ address: DOGE, abi: erc20, functionName: "allowance", args: [account.address, probe.address] });
  const pull = await send(probe.address, encodeFunctionData({ abi: probe.abi, functionName: "pull", args: [ONE] }), "pull 1 DOGE");
  const [ev] = parseEventLogs({ abi: probe.abi, logs: pull.logs, eventName: "Pulled" });
  const probeNative = await pub.getBalance({ address: probe.address });
  const probeErc = await pub.readContract({ address: DOGE, abi: erc20, functionName: "balanceOf", args: [probe.address] });
  const giveBack = await send(probe.address, encodeFunctionData({ abi: probe.abi, functionName: "giveBack" }), "giveBack");

  const pass =
    pull.status === "success" &&
    ev &&
    ev.args.holderBefore - ev.args.holderAfter === ONE &&
    ev.args.probeAfter === ONE &&
    probeNative === ONE &&
    probeErc === ONE;
  save("g0-2.json", {
    check: "G0-2: a contract can transferFrom native DOGE from an approving EOA",
    result: pass ? "PASS" : "FAIL",
    account: account.address,
    probe: probe.address,
    txs: { deploy: probe.hash, approve: approve.transactionHash, pull: pull.transactionHash, giveBack: giveBack.transactionHash },
    allowanceAfterApprove: allowance,
    pulledEvent: ev?.args ?? null,
    probeBalanceAfterPull: { native: probeNative, balanceOf: probeErc, doubleCountSafe: probeNative === probeErc },
  });
}

// ---------- G0-1 and G0-3: RedStone DOGE on Chikyū ----------
if (withRedstone) {
  const { requestDataPackages } = require("@redstone-finance/sdk");
  const { RedstonePayload } = require("@redstone-finance/protocol");
  // Same signers and padding as app/src/lib/redstone.server.ts (DECISIONS.md D-002, D-003)
  const SIGNERS = [
    "0x8BB8F32Df04c8b654987DAaeD53D6B6091e3B774",
    "0xdEB22f54738d54976C4c0fe5ce6d408E40d88499",
    "0x51Ce04Be4b3E32572C4Ec9135221d0691Ba7d202",
    "0xDD682daEC5A90dD295d14DA4b0bec9281017b5bE",
    "0x9c5AE89C4Af6aA32cE58588DBaF90d18a855B6de",
  ];
  const request = () =>
    requestDataPackages({
      dataServiceId: "redstone-primary-prod",
      dataPackagesIds: ["DOGE"],
      uniqueSignersCount: 3,
      authorizedSigners: SIGNERS,
      authenticatedGateways: [{ apiKey: process.env.REDSTONE_API_KEY }],
    });

  // G0-1: does primary-prod serve DOGE?
  let response;
  try {
    response = await request();
    const pkgs = response.DOGE ?? [];
    const points = pkgs.map((p) => p.dataPackage.dataPoints[0].toObj());
    save("g0-1.json", {
      check: "G0-1: RedStone primary-prod serves a DOGE feed",
      result: pkgs.length >= 3 ? "PASS" : "FAIL",
      packages: pkgs.length,
      timestampMs: pkgs[0]?.dataPackage.timestampMilliseconds ?? null,
      dataPoints: points,
      note: "Decimals as delivered on-chain are recorded by G0-3",
    });
  } catch (e) {
    save("g0-1.json", { check: "G0-1", result: "FAIL", error: String(e?.message ?? e) });
    process.exit(1);
  }

  // G0-3: a consumer contract reads it in a tx
  const probe = await deploy("RedstoneProbe");
  response = await request(); // fresh: the default validator rejects packages older than 3 minutes
  const packages = Object.values(response).flat();
  let meta = `${Date.now()}#sooth-g0#redstone-primary-prod`;
  const original = RedstonePayload.prepare(packages, meta);
  meta += "_".repeat(32 - ((original.length / 2) % 32));
  const payload = RedstonePayload.prepare(packages, meta);
  const data = encodeFunctionData({ abi: probe.abi, functionName: "read" }) + payload;
  let read;
  try {
    read = await send(probe.address, data, "RedstoneProbe.read");
  } catch (e) {
    save("g0-3.json", { check: "G0-3", result: "FAIL", probe: probe.address, error: String(e?.shortMessage ?? e?.message ?? e) });
    process.exit(1);
  }
  const [ev] = parseEventLogs({ abi: probe.abi, logs: read.logs, eventName: "Read" });
  const offchain = Number(packages[0].dataPackage.dataPoints[0].toObj().value);
  const raw = ev ? ev.args.value : null;
  save("g0-3.json", {
    check: "G0-3: a RedStone-consuming contract returns DOGE/USD in a tx on Chikyū",
    result: read.status === "success" && raw ? "PASS" : "FAIL",
    probe: probe.address,
    txs: { deploy: probe.hash, read: read.transactionHash },
    readEvent: ev?.args ?? null,
    offchainValue: offchain,
    // G0-1 decimals: raw on-chain value vs plain off-chain value (expected 8, prd.md §9.5)
    inferredDecimals: raw ? Math.round(Math.log10(Number(raw) / offchain)) : null,
    priceAgeSeconds: ev ? Number(ev.args.blockTimestamp) - Math.floor(Number(ev.args.timestampMs) / 1000) : null,
  });
}

const endBalance = await pub.getBalance({ address: account.address });
console.log(`Spent ${formatUnits(startBalance - endBalance, 18)} DOGE in gas`);
