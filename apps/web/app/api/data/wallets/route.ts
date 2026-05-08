import { NextResponse } from "next/server";
import { getTransactions } from "@/lib/data/mantlescan";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

const CACHE_KEY = "mantle:wallets:top50";
const TTL = 300;

// Active wallets on Mantle Mainnet for the leaderboard
const SEED_WALLETS = [
  "0x9b93b2F519ecF41cb7CDCAEBd32B1B9861A91462", // Agni Finance deployer
  "0x2F8A25ac62179B31D62D7F80884AE57464699059", // Merchant Moe router
  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", // Uniswap quoter on Mantle
  "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", // Binance hot wallet
  "0x4200000000000000000000000000000000000006", // WETH on Mantle
  "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", // MNT token contract
  "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", // USDC on Mantle
  "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", // USDT on Mantle
];

export interface WalletRow {
  address: string;
  txCount: number;
  uniqueCounterparties: number;
  behaviorHint: "bot" | "whale" | "accumulator" | "trader" | "unknown";
}

function classifyHint(txCount: number, counterparties: number): WalletRow["behaviorHint"] {
  if (counterparties > 50) return "bot";
  if (txCount > 200) return "whale";
  if (txCount > 50) return "trader";
  if (txCount > 5) return "accumulator";
  return "unknown";
}

export async function GET() {
  const cached = await cacheGet<WalletRow[]>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const rows: WalletRow[] = await Promise.all(
    SEED_WALLETS.map(async (address) => {
      const txs = await getTransactions(address, 1, 100);
      const counterparties = new Set(txs.map((t) => t.from === address.toLowerCase() ? t.to : t.from)).size;
      return {
        address,
        txCount: txs.length,
        uniqueCounterparties: counterparties,
        behaviorHint: classifyHint(txs.length, counterparties),
      };
    })
  );

  rows.sort((a, b) => b.txCount - a.txCount);
  await cacheSet(CACHE_KEY, rows, TTL);
  return NextResponse.json(rows);
}
