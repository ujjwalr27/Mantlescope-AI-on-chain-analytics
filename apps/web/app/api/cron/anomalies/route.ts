import { NextRequest, NextResponse } from "next/server";
import { getTransactions } from "@/lib/data/mantlescan";
import { detectAnomalies } from "@/lib/ai/analyzer";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

const SEED_WALLETS = [
  "0x2b4C76d0dc16BE1C31D4C1DC53bF9B45987Fc75c",
  "0x6Dca1E24C64C4E7D7dE4CE4dC7b55aAbCf02B37a",
];

async function handler(_req: NextRequest) {
  const now = Math.floor(Date.now() / 1000);
  const window15min = now - 900;

  const walletSnapshots = await Promise.all(
    SEED_WALLETS.map(async (address) => {
      const txs = await getTransactions(address, 1, 50);
      const recentTxs = txs.filter((t) => parseInt(t.timeStamp) >= window15min);
      return {
        address,
        txCount: recentTxs.length,
        volumeUSD: recentTxs.reduce((s) => s + 0, 0), // volume estimation without price feed
        direction: recentTxs.length > 5 ? "high" : "normal",
      };
    })
  );

  const result = await detectAnomalies(walletSnapshots);

  if (result.anomalies.length > 0) {
    await cacheSet("mantle:anomalies:latest", result.anomalies, 900);
  }

  return NextResponse.json({ processed: walletSnapshots.length, anomalies: result.anomalies.length });
}

export const POST = verifySignatureAppRouter(handler);
