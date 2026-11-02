// Creates Sooth's five price-signer keys in app/.env.local (PRICE_SIGNER_KEYS) if they are missing,
// then prints their addresses, in source order (app/src/lib/price.server.ts SOURCES). Keys are never printed.
//
//   node scripts/price-signers.mjs
//
// deploy.mjs reads the same keys and passes the addresses to Sooth's constructor (DECISIONS.md D-018).

import { createRequire } from "node:module";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "app", "package.json"));
const { generatePrivateKey, privateKeyToAccount } = require("viem/accounts");

export const ENV_FILE = join(root, "app", ".env.local");

export function signerKeys() {
  const text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const m = text.match(/^\s*PRICE_SIGNER_KEYS\s*=\s*(.*)$/m);
  return m ? m[1].split(",").map((k) => k.trim()).filter(Boolean) : [];
}

export const signerAddresses = () => signerKeys().map((k) => privateKeyToAccount(k.startsWith("0x") ? k : `0x${k}`).address);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (signerKeys().length === 0) {
    const keys = Array.from({ length: 5 }, () => generatePrivateKey());
    const text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
    const sep = text && !text.endsWith("\n") ? "\n" : "";
    appendFileSync(
      ENV_FILE,
      `${sep}\n# Sooth price signers (server only, never NEXT_PUBLIC). One per exchange, in price.server.ts order.\nPRICE_SIGNER_KEYS=${keys.join(",")}\n`,
    );
    console.log(`Wrote 5 new keys to ${ENV_FILE}`);
  }
  const addrs = signerAddresses();
  if (addrs.length !== 5) {
    console.error(`PRICE_SIGNER_KEYS has ${addrs.length} keys; 5 are needed`);
    process.exit(1);
  }
  addrs.forEach((a, i) => console.log(`signer${i}  ${a}`));
}
