import type { NextConfig } from "next";

// @dogeos/dogeos-sdk@4.0.5 imports `injected` from the wagmi/connectors barrel, which drags in
// Coinbase's CDP SDK and its optional x402 payment modules. Sooth never reaches that code, so the
// missing optional modules resolve to empty ones. (Turbopack's production build panics on the SDK
// bundle, so `pnpm build` uses webpack; see DECISIONS.md.)
const OPTIONAL_UNUSED = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
];

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(OPTIONAL_UNUSED.map((m) => [m, false])),
    };
    return config;
  },
};

export default nextConfig;
