// ABIs the frontend calls.
//
// SOOTH_ABI was transcribed from prd.md §9.1 before Sooth.sol existed. It is now checked against the compiled
// contract by `node scripts/check-abi.mjs` (run after `forge build`); the contract was written to match it.
// Choices the PRD left open (DECISIONS.md D-005): holder/caller indexed in events, event values typed as
// below, constants exposed as uint256 getters.

export const SOOTH_ABI = [
  {
    type: "function",
    name: "arm",
    stateMutability: "nonpayable",
    inputs: [
      { name: "stopPrice", type: "uint64" },
      { name: "amount", type: "uint128" },
      { name: "gasFloor", type: "uint128" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [],
  },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "trigger",
    stateMutability: "nonpayable",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "stops",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [
      { name: "amount", type: "uint128" },
      { name: "gasFloor", type: "uint128" },
      { name: "stopPrice", type: "uint64" },
      { name: "armedAt", type: "uint64" },
      { name: "expiry", type: "uint64" },
      { name: "active", type: "bool" },
    ],
  },
  { type: "function", name: "CALLER_FEE_BPS", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "MAX_PRICE_AGE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "MAX_PRICE_AHEAD", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "MIN_GAS_FLOOR", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // From RedstoneConsumerBase, evm-connector@1.0.0
  {
    type: "function",
    name: "getUniqueSignersThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "event",
    name: "Armed",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "stopPrice", type: "uint64", indexed: false },
      { name: "amount", type: "uint128", indexed: false },
      { name: "gasFloor", type: "uint128", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
    ],
  },
  { type: "event", name: "Cancelled", inputs: [{ name: "holder", type: "address", indexed: true }] },
  {
    type: "event",
    name: "Triggered",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "price", type: "uint256", indexed: false },
      { name: "priceTimestamp", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "proceeds", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  // Sooth errors, prd.md §9.1
  { type: "error", name: "NoActiveStop", inputs: [] },
  { type: "error", name: "StopExpired", inputs: [] },
  {
    type: "error",
    name: "PriceAboveStop",
    inputs: [
      { name: "price", type: "uint256" },
      { name: "stopPrice", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "PriceOlderThanArm",
    inputs: [
      { name: "priceTs", type: "uint256" },
      { name: "armedAt", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "BelowGasFloor",
    inputs: [
      { name: "balance", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "gasFloor", type: "uint256" },
    ],
  },
  { type: "error", name: "GasFloorTooLow", inputs: [] },
  { type: "error", name: "BadAmount", inputs: [] },
  { type: "error", name: "BadStopPrice", inputs: [] },
  { type: "error", name: "BadExpiry", inputs: [] },
  // BackstopVenue, prd.md §9.3. Its revert bubbles up through Sooth.trigger.
  {
    type: "error",
    name: "VenueInsolvent",
    inputs: [
      { name: "needed", type: "uint256" },
      { name: "available", type: "uint256" },
    ],
  },
  // RedStone consumer errors, read from evm-connector@1.0.0 contracts/core
  { type: "error", name: "SignerNotAuthorised", inputs: [{ name: "receivedSigner", type: "address" }] },
  {
    type: "error",
    name: "InsufficientNumberOfUniqueSigners",
    inputs: [
      { name: "receivedSignersCount", type: "uint256" },
      { name: "requiredSignersCount", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TimestampIsTooOld",
    inputs: [
      { name: "receivedTimestampSeconds", type: "uint256" },
      { name: "blockTimestamp", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TimestampFromTooLongFuture",
    inputs: [
      { name: "receivedTimestampSeconds", type: "uint256" },
      { name: "blockTimestamp", type: "uint256" },
    ],
  },
  { type: "error", name: "CalldataMustHaveValidPayload", inputs: [] },
] as const;

// Native DOGE ERC-20 subset (prd.md §4.3)
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// DogeOS L1GasPriceOracle: data-and-finality fee for a serialized tx (prd.md §10.5)
export const L1_ORACLE_ABI = [
  {
    type: "function",
    name: "getL1Fee",
    stateMutability: "view",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
