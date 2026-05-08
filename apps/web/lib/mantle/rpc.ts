import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.mantle.xyz"] },
    fallback: { http: ["https://mantle-sepolia.drpc.org"] },
  },
  blockExplorers: {
    default: { name: "Mantlescan", url: "https://sepolia.mantlescan.xyz" },
  },
  testnet: true,
});

export const mantleMainnet = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mantle.xyz"] },
    fallback: { http: ["https://mantle.drpc.org"] },
  },
  blockExplorers: {
    default: { name: "Mantlescan", url: "https://mantlescan.xyz" },
  },
});

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "5003");
export const activeChain = chainId === 5000 ? mantleMainnet : mantleSepolia;

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(activeChain.rpcUrls.default.http[0], { timeout: 10_000 }),
});

export function getOracleWalletClient() {
  let pk = process.env.ORACLE_PRIVATE_KEY ?? "";
  // MetaMask exports keys without 0x prefix — add it if missing
  if (pk && !pk.startsWith("0x")) pk = `0x${pk}`;
  if (!pk || pk.length < 66) {
    throw new Error("ORACLE_PRIVATE_KEY is missing or invalid in apps/web/.env.local");
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({
    account,
    chain: activeChain,
    transport: http(activeChain.rpcUrls.default.http[0]),
  });
}
