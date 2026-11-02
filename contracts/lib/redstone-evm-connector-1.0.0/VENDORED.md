# Vendored: @redstone-finance/evm-connector@1.0.0 (Solidity only)

`npm install` of this version fails because its package.json lists `workspace:*` dependencies (DECISIONS.md D-002). The Solidity under `contracts/` is copied unchanged from the published tarball; `contracts/samples/` was left out.

- Source: `npm pack @redstone-finance/evm-connector@1.0.0`
- npm shasum: `797e8faa5ceb44ab97bf8c7fba6d1ddbc9e74816`
- npm integrity: `sha512-FxK5NUjDWDeKyqn2K1F7PGlZ+kyBmWT37Mja5Wrk7sUE7vR7H5Iw+3uR3xGJH1YDIJxGYJSR0T55w6FulXEudA==`
- Tarball sha256: `7149c3f9b94b9b5e2c16ebfa55cf511f2befeac73d56a1a1456279f88d6a5714`
- Copied: 2026-10-31

## Licences

package.json says MIT, but 10 of the 18 Solidity files carry `SPDX-License-Identifier: BUSL-1.1` (the core consumer bases among them), and 8 carry MIT. The per-file headers apply. BUSL-1.1 generally permits non-production use such as this testnet build; read RedStone's licence terms before any mainnet or production use.

Do not edit these files. To update, re-run `npm pack`, replace `contracts/`, and record new checksums here.
