// G0 read-only probes against DogeOS Chikyū (prd.md §7.2). No key, no funds, no transactions.
// Usage: node scripts/g0/read-probes.mjs
// Writes raw results to evidence/g0/read-probes.json.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(join(root, "app", "package.json"));
const {
  createPublicClient,
  http,
  encodeFunctionData,
  serializeTransaction,
  formatUnits,
  parseAbi,
} = require("viem");

const CHAIN_LIST = "https://web3-assets.mydoge.com/api/chains";
const CHAIN_ID = 6281971;
const DOGE = "0x530000000000000000000000000000000000d09e";
const L1_ORACLE = "0x5300000000000000000000000000000000000002";
const SPENDER = "0x000000000000000000000000000000000000dEaD"; // any address works for an approve(0) estimate

const erc20 = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]);
const oracle = parseAbi(["function getL1Fee(bytes) view returns (uint256)"]);

const out = { ranAt: new Date().toISOString(), source: {}, results: {} };
const record = async (id, fn) => {
  try {
    out.results[id] = { ok: true, value: await fn() };
  } catch (e) {
    out.results[id] = { ok: false, error: String(e?.shortMessage ?? e?.message ?? e).split("\n")[0] };
  }
  console.log(id, JSON.stringify(out.results[id]));
};
const big = (v) => (typeof v === "bigint" ? v.toString() : v);

// 1. RPC from the DogeOS chain list (the SDK's source, DECISIONS.md D-004)
const list = await (await fetch(CHAIN_LIST)).json();
const chains = Array.isArray(list) ? list : (list.data ?? list.chains ?? Object.values(list).flat());
const entry = chains.find((c) => String(c?.chainId) === `eip155:${CHAIN_ID}`);
if (!entry) throw new Error(`Chain ${CHAIN_ID} not in ${CHAIN_LIST}`);
const rpc = entry.rpcUrls.default.http[0];
out.source = { chainList: CHAIN_LIST, entry };
const pub = createPublicClient({ transport: http(rpc) });

await record("chainId", async () => Number(await pub.getChainId()));
const block = await pub.getBlock({ blockTag: "latest", includeTransactions: true });
await record("latestBlock", async () => ({ number: big(block.number), timestamp: big(block.timestamp), txs: block.transactions.length }));

// 2. Native DOGE ERC-20 (prd.md §4.3, G0-2 read side)
await record("nativeDoge.code", async () => {
  const code = await pub.getCode({ address: DOGE });
  return { bytes: code ? (code.length - 2) / 2 : 0 };
});
for (const fn of ["name", "symbol", "decimals", "totalSupply"]) {
  await record(`nativeDoge.${fn}`, async () => big(await pub.readContract({ address: DOGE, abi: erc20, functionName: fn })));
}

// Find an address that holds DOGE: a sender from recent blocks.
let holder;
for (let n = block.number; n > block.number - 50n && !holder; n--) {
  const b = n === block.number ? block : await pub.getBlock({ blockNumber: n, includeTransactions: true });
  holder = b.transactions.find((t) => typeof t === "object" && t.from)?.from;
}
out.source.sampleHolder = holder ?? null;

if (holder) {
  // §4.3 / §10.4: balanceOf must return the native balance
  await record("nativeDoge.balanceOf_equals_getBalance", async () => {
    const [erc, native] = await Promise.all([
      pub.readContract({ address: DOGE, abi: erc20, functionName: "balanceOf", args: [holder] }),
      pub.getBalance({ address: holder }),
    ]);
    return { holder, balanceOf: erc.toString(), getBalance: native.toString(), equal: erc === native };
  });
  await record("nativeDoge.allowance_callable", async () =>
    big(await pub.readContract({ address: DOGE, abi: erc20, functionName: "allowance", args: [holder, SPENDER] })),
  );

  // G0-8: fee of one approve(Sooth, 0) revoke, execution plus data-and-finality (§10.5)
  await record("G0-8.revokeFee", async () => {
    const data = encodeFunctionData({ abi: erc20, functionName: "approve", args: [SPENDER, 0n] });
    const [gas, gasPrice] = await Promise.all([pub.estimateGas({ account: holder, to: DOGE, data }), pub.getGasPrice()]);
    const serialized = serializeTransaction({ chainId: CHAIN_ID, to: DOGE, data, gas, gasPrice, nonce: 0, type: "legacy" });
    const l1 = await pub.readContract({ address: L1_ORACLE, abi: oracle, functionName: "getL1Fee", args: [serialized] });
    const total = gas * gasPrice + l1;
    return {
      gas: gas.toString(),
      gasPriceWei: gasPrice.toString(),
      executionDoge: formatUnits(gas * gasPrice, 18),
      dataAndFinalityDoge: formatUnits(l1, 18),
      totalDoge: formatUnits(total, 18),
      tenTimesDoge: formatUnits(total * 10n, 18),
      minGasFloor1DogeCovers: Number(10n ** 18n / (total || 1n)) + " revokes",
    };
  });

  // Receipt page: can the RPC read past state? (DECISIONS.md D-005, lib/live.ts readReceipt)
  await record("rpc.historicalState", async () => {
    const past = block.number - 5000n;
    const v = await pub.getBalance({ address: holder, blockNumber: past });
    return { block: big(past), balance: v.toString() };
  });
}

await record("l1Oracle.code", async () => {
  const code = await pub.getCode({ address: L1_ORACLE });
  return { bytes: code ? (code.length - 2) / 2 : 0 };
});

// Event reads: largest getLogs range the RPC accepts (lib/live.ts readEvents)
for (const span of [1000n, 10000n, 100000n]) {
  await record(`rpc.getLogs.${span}`, async () => {
    const logs = await pub.getLogs({ address: DOGE, fromBlock: block.number - span, toBlock: block.number });
    return { logs: logs.length };
  });
}

// EVM target (prd.md §9: osaka or cancun). eth_call with no `to` runs the data as init code.
const opcodes = {
  "PUSH0 (shanghai)": "0x5f5ff3",
  "TLOAD/TSTORE (cancun)": "0x5f5f5d5f5c505f5ff3",
  "MCOPY (cancun)": "0x5f5f5f5e5f5ff3",
};
for (const [name, data] of Object.entries(opcodes)) {
  await record(`evm.${name}`, async () => {
    await pub.call({ data });
    return "executes";
  });
}

// G0-7: is there a Blockscout API to verify source against?
await record("G0-7.explorerApi", async () => {
  const base = entry.blockExplorers.default.url.replace(/\/$/, "");
  const res = await fetch(`${base}/api/v2/stats`);
  return { url: `${base}/api/v2/stats`, status: res.status };
});

const dir = join(root, "evidence", "g0");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "read-probes.json"), JSON.stringify(out, null, 2) + "\n");
console.log("\nwrote evidence/g0/read-probes.json");
