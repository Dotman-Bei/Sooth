// Deploys TestDollar, BackstopVenue and Sooth to DogeOS Chikyū and binds them (prd.md §9, §14 E-1).
//
//   cd contracts && forge build && cd ..
//   node scripts/deploy.mjs
//
// Uses PRIVATE_KEY from .env (never printed) and the price-signer addresses from app/.env.local
// (run node scripts/price-signers.mjs first). G0_RPC overrides the RPC for fork dry runs, and
// DEPLOY_OUT overrides the output file so dry runs never land in deployments/.
// Writes deployments/chikyu.json and prints the lines to paste into app/.env.local.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "app", "package.json"));
const { createPublicClient, createWalletClient, http, defineChain, getContractAddress, parseEther } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { signerAddresses } = await import("./price-signers.mjs");

const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const rawPk = (process.env.PRIVATE_KEY ?? "").trim();
const pk = /^[0-9a-fA-F]{64}$/.test(rawPk) ? `0x${rawPk}` : rawPk;
if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  console.error("Set PRIVATE_KEY (64 hex, 0x optional) in .env");
  process.exit(1);
}

const SIGNERS = signerAddresses();
if (SIGNERS.length !== 5) {
  console.error("Run node scripts/price-signers.mjs first: Sooth needs 5 price-signer addresses");
  process.exit(1);
}

const RPC = process.env.G0_RPC || "https://rpc.testnet.dogeos.com";
const PRICE_DECIMALS = 8; // price.server.ts signs at 8 decimals
const SUPPLY = parseEther("1000000"); // 1,000,000 tDOLLAR to the venue (prd.md §9.4)

const chain = defineChain({
  id: 6281971,
  name: "DogeOS Chikyū",
  nativeCurrency: { name: "DOGE", symbol: "DOGE", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ chain, transport: http(RPC), account });

const artifact = (name) => {
  const p = join(root, "contracts", "out", `${name}.sol`, `${name}.json`);
  if (!existsSync(p)) throw new Error(`Missing ${p}. Run: cd contracts && forge build`);
  const j = JSON.parse(readFileSync(p, "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object };
};

async function deploy(name, args) {
  const { abi, bytecode } = artifact(name);
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${name} deploy reverted: ${hash}`);
  console.log(`${name.padEnd(14)} ${r.contractAddress}  (block ${r.blockNumber})`);
  return { address: r.contractAddress, tx: hash, block: r.blockNumber };
}

console.log(`Deployer ${account.address}`);
const balance = await pub.getBalance({ address: account.address });
console.log(`Balance  ${Number(balance) / 1e18} DOGE\n`);

// TestDollar mints once, straight to the venue, whose address is fixed by the next nonce.
const nonce = await pub.getTransactionCount({ address: account.address });
const venueAddress = getContractAddress({ from: account.address, nonce: BigInt(nonce + 1) });

const token = await deploy("TestDollar", [venueAddress, SUPPLY]);
const venue = await deploy("BackstopVenue", [token.address, PRICE_DECIMALS]);
if (venue.address.toLowerCase() !== venueAddress.toLowerCase()) throw new Error("Venue address prediction failed");
const sooth = await deploy("Sooth", [venue.address, SIGNERS]);

const { abi: venueAbi } = artifact("BackstopVenue");
const bindHash = await wallet.writeContract({ address: venue.address, abi: venueAbi, functionName: "bind", args: [sooth.address] });
const bind = await pub.waitForTransactionReceipt({ hash: bindHash });
console.log(`bind           ${bind.status} (${bindHash})`);

const out = {
  network: "DogeOS Chikyū testnet",
  chainId: 6281971,
  deployedAt: new Date().toISOString(),
  deployer: account.address,
  priceDecimals: PRICE_DECIMALS,
  priceSigners: SIGNERS,
  contracts: { TestDollar: token, BackstopVenue: venue, Sooth: sooth },
  bindTx: bindHash,
};
const file = process.env.DEPLOY_OUT || join(root, "deployments", "chikyu.json");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(out, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
console.log(`\nwrote ${file}\n\nPaste into app/.env.local:`);
console.log(`NEXT_PUBLIC_SOOTH_ADDRESS=${sooth.address}`);
console.log(`NEXT_PUBLIC_VENUE_ADDRESS=${venue.address}`);
console.log(`NEXT_PUBLIC_PAYOUT_TOKEN_ADDRESS=${token.address}`);
console.log(`NEXT_PUBLIC_SOOTH_DEPLOY_BLOCK=${sooth.block}`);
console.log(`NEXT_PUBLIC_PRICE_DECIMALS=${PRICE_DECIMALS}`);
const spent = balance - (await pub.getBalance({ address: account.address }));
console.log(`\nSpent ${Number(spent) / 1e18} DOGE in gas`);
