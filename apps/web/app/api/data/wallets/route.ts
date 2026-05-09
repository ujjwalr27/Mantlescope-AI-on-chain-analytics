import { NextResponse } from "next/server";
import { getTopActiveWallets, getTransactions, getTokenTransfers } from "@/lib/data/mantlescan";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { computeMantleScore } from "@/lib/scoring";

const CACHE_KEY = "mantle:wallets:top50:v2"; // bumped: schema now includes mantleScore + uniqueTokenCount
const TTL = 600; // 10 min

export interface WalletRow {
  address: string;
  txCount: number;
  uniqueCounterparties: number;
  behaviorHint: "bot" | "whale" | "trader" | "accumulator" | "unknown";
  mantleScore: number;
  uniqueTokenCount: number;
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

  // Discover top active wallets dynamically (multi-token)
  const topAddresses = await getTopActiveWallets(15);

  const rows: WalletRow[] = await Promise.all(
    topAddresses.map(async (address) => {
      const [txs, tokenTxs] = await Promise.all([
        getTransactions(address, 1, 100),
        getTokenTransfers(address, 1, 100),
      ]);

      const counterparties = new Set(
        txs.map((t) => (t.from.toLowerCase() === address.toLowerCase() ? t.to : t.from))
      ).size;

      const uniqueTokenCount = new Set(tokenTxs.map((t) => t.contractAddress.toLowerCase())).size;

      const behaviorHint = classifyHint(txs.length, counterparties);

      const mantleScore = computeMantleScore({
        txCount: txs.length,
        uniqueCounterparties: counterparties,
        behaviorHint,
        uniqueTokenCount,
      });

      return {
        address,
        txCount: txs.length,
        uniqueCounterparties: counterparties,
        behaviorHint,
        mantleScore,
        uniqueTokenCount,
      };
    })
  );

  // Sort by MantleScore descending
  rows.sort((a, b) => b.mantleScore - a.mantleScore);
  await cacheSet(CACHE_KEY, rows, TTL);
  return NextResponse.json(rows);
}
