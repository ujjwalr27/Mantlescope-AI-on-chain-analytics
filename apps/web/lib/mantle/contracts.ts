import { getAddress } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Normalize an env-provided address to its EIP-55 checksum form.
 * Tolerates any casing (lower/upper/mixed) so a mis-cased env var can't
 * break contract writes; returns the zero address if unset or malformed.
 */
function normalizeAddress(value: string | undefined): `0x${string}` {
  if (!value) return ZERO_ADDRESS;
  try {
    return getAddress(value);
  } catch {
    return ZERO_ADDRESS;
  }
}

export const MANTLESCOPE_ADDRESS = normalizeAddress(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);

export const MANTLESCOPE_ABI = [
  {
    inputs: [{ name: "wallet", type: "address" }],
    name: "getWalletInsight",
    outputs: [
      {
        components: [
          { name: "riskScore", type: "uint8" },
          { name: "behaviorTag", type: "uint8" },
          { name: "summaryHash", type: "bytes32" },
          { name: "updatedAt", type: "uint64" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "name", type: "string" }],
    name: "getProtocolSnapshot",
    outputs: [
      {
        components: [
          { name: "tvlUSD", type: "uint128" },
          { name: "volume24hUSD", type: "uint128" },
          { name: "healthScore", type: "uint8" },
          { name: "updatedAt", type: "uint64" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "wallet", type: "address" },
      { name: "riskScore", type: "uint8" },
      { name: "behaviorTag", type: "uint8" },
      { name: "summaryHash", type: "bytes32" },
      { name: "summary", type: "string" },
    ],
    name: "writeWalletInsight",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "wallet", type: "address" }],
    name: "triggerAnalysis",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Aave v2-compatible ABI subset used by Lendle and Aurelius
export const LENDING_POOL_ABI = [
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "getReserveData",
    outputs: [
      {
        components: [
          { name: "configuration", type: "uint256" },
          { name: "liquidityIndex", type: "uint128" },
          { name: "variableBorrowIndex", type: "uint128" },
          { name: "currentLiquidityRate", type: "uint128" },
          { name: "currentVariableBorrowRate", type: "uint128" },
          { name: "currentStableBorrowRate", type: "uint128" },
          { name: "lastUpdateTimestamp", type: "uint40" },
          { name: "aTokenAddress", type: "address" },
          { name: "stableDebtTokenAddress", type: "address" },
          { name: "variableDebtTokenAddress", type: "address" },
          { name: "interestRateStrategyAddress", type: "address" },
          { name: "id", type: "uint8" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Lendle LendingPool on Mantle Mainnet
export const LENDLE_POOL_ADDRESS = "0xCFa5aE7c2CE8Fadc6426C1ff872cA45378Fb7cF" as `0x${string}`;
// Aurelius LendingPool on Mantle Mainnet
export const AURELIUS_POOL_ADDRESS = "0x7c9C6F5BEd9Cfe5B9070671a0c476Da7Cd3b4e6" as `0x${string}`;

// MantleScopeAgent (ERC-8004 Agent Identity NFT)
export const AGENT_CONTRACT_ADDRESS = normalizeAddress(process.env.NEXT_PUBLIC_AGENT_CONTRACT);

export const AGENT_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getAgentMetadata",
    outputs: [
      { name: "name",         type: "string"  },
      { name: "capabilities", type: "string"  },
      { name: "aiModel",      type: "string"  },
      { name: "achievements", type: "uint256" },
      { name: "mintedAt",     type: "uint64"  },
      { name: "active",       type: "bool"    },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAgents",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Key reserve assets on Mantle Mainnet
export const RESERVE_ASSETS: Record<string, `0x${string}`> = {
  USDT: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
  USDC: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
  WETH: "0xdEAddEaDdeadDEadDEADDEaddEADDEadDEADDEad",
  WBTC: "0xCAbAE6f6Ea1ecaB08Ad02fE02ce9A44F09aebfA2",
  MNT:  "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
};
