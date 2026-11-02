// Compares the frontend's SOOTH_ABI (app/src/lib/abi.ts) with the compiled Sooth + venue ABIs.
// Usage: node scripts/check-abi.mjs   (after: cd contracts && forge build)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "app", "package.json"));
const { toFunctionSelector, toEventSelector, formatAbiItem } = require("viem/utils");
const load = (n) => JSON.parse(readFileSync(join(root, "contracts", "out", `${n}.sol`, `${n}.json`), "utf8")).abi;
const compiled = [...load("Sooth"), ...load("BackstopVenue").filter((i) => i.type === "error")];
const ts = readFileSync(join(root, "app", "src", "lib", "abi.ts"), "utf8");
const block = ts.slice(ts.indexOf("export const SOOTH_ABI = ["), ts.indexOf("] as const;") + 1).replace("export const SOOTH_ABI = ", "");
const frontend = Function(`return ${block}`)();
const sig = (i) => (i.type === "event" ? toEventSelector(formatAbiItem(i)) + (i.inputs.map((x) => (x.indexed ? "i" : "-")).join("")) : toFunctionSelector(formatAbiItem(i))) + " " + formatAbiItem(i);
const key = (abi) => new Map(abi.filter((i) => ["function", "event", "error"].includes(i.type)).map((i) => [i.type + ":" + i.name, sig(i)]));
const F = key(frontend), C = key(compiled);
let bad = 0;
for (const [k, v] of F) {
  if (!C.has(k)) { console.log("MISSING in contract:", k); bad++; }
  else if (C.get(k) !== v) { console.log("MISMATCH", k, "\n  frontend:", v, "\n  contract:", C.get(k)); bad++; }
}
for (const k of C.keys()) if (!F.has(k)) console.log("not in frontend ABI:", k);
console.log(bad ? `${bad} problem(s)` : "frontend ABI matches the contract for every entry it uses");
process.exit(bad ? 1 : 0);
