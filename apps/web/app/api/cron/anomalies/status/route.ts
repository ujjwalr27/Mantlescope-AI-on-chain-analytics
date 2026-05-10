import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { detectAnomalies } from "@/lib/ai/analyzer";
import { getTopActiveWallets, getTransactions, getTokenTransfers } from "@/lib/data/mantlescan";

const ANOMALY_KEY = "mantle:anomalies:latest";
const LASTRUN_KEY = "mantle:anomalies:lastrun";
const WALLETS_CACHE_KEY = "mantle:wallets:top50:v2";
const SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 min

// Approximate USD prices for known Mantle tokens (used for volumeUSD estimate)
const TOKEN_PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  WETH: 2500,
  WMNT: 0.85,
  MNT: 0.85,
  WBTC: 60000,
};

export async function GET() {
  // Return cached result if still fresh
  const [cached, lastRun] = await Promise.all([
    cacheGet<{ anomalies: unknown[]; scannedAt: string }>(ANOMALY_KEY),
    cacheGet<string>(LASTRUN_KEY),
  ]);

  const now = Date.now();
  const lastRunMs = lastRun ? new Date(lastRun).getTime() : 0;
  const isStale = now - lastRunMs > SCAN_INTERVAL_MS;

  if (cached && !isStale) {
    return NextResponse.json(cached);
  }

  try {
    // ── Step 1: Get wallets to monitor ──────────────────────────────────────
    // Prefer already-cached top wallets (free — no API calls) then fall back
    // to a fresh discovery scan (costs 4 Etherscan requests).
    type CachedWallet = { address: string };
    const cachedWallets = await cacheGet<CachedWallet[]>(WALLETS_CACHE_KEY);
    const watchAddresses: string[] = cachedWallets && cachedWallets.length > 0
      ? cachedWallets.slice(0, 8).map((w) => w.address)
      : await getTopActiveWallets(8);

    // ── Step 2: Build snapshots with real tx count + estimated volumeUSD ────
    const windowSecs = Math.floor(Date.now() / 1000) - 900; // last 15 min

    const snapshots = await Promise.all(
      watchAddresses.map(async (address) => {
        const [txs, tokenTxs] = await Promise.all([
          getTransactions(address, 1, 50),
          getTokenTransfers(address, 1, 50),
        ]);

        // Only look at activity in the last 15 min
        const recentTxs = txs.filter((t) => parseInt(t.timeStamp) >= windowSecs);
        const recentTokenTxs = tokenTxs.filter((t) => parseInt(t.timeStamp) >= windowSecs);

        // Estimate USD volume from token transfers
        let volumeUSD = 0;
        for (const t of recentTokenTxs) {
          const price = TOKEN_PRICES[t.tokenSymbol?.toUpperCase()] ?? 0;
          if (price === 0) continue;
          const decimals = parseInt(t.tokenDecimal ?? "18");
          const amount = parseFloat(t.value) / Math.pow(10, decimals);
          volumeUSD += amount * price;
        }

        // Net direction: are they mostly sending or receiving?
        const outbound = recentTxs.filter(
          (t) => t.from.toLowerCase() === address.toLowerCase()
        ).length;
        const inbound = recentTxs.length - outbound;
        const direction =
          outbound > inbound * 2 ? "outflow" :
          inbound > outbound * 2 ? "inflow" : "mixed";

        return {
          address,
          txCount: recentTxs.length,
          volumeUSD: Math.round(volumeUSD),
          direction,
        };
      })
    );

    // ── Step 3: AI anomaly detection ────────────────────────────────────────
    // Filter to wallets that had ANY activity in the window — no point sending
    // idle wallets to the AI, it wastes tokens and produces false positives.
    const activeSnapshots = snapshots.filter(
      (s) => s.txCount > 0 || s.volumeUSD > 0
    );

    const result = await detectAnomalies(
      activeSnapshots.length > 0 ? activeSnapshots : snapshots
    );

    const scannedAt = new Date().toISOString();
    const payload = { anomalies: result.anomalies, scannedAt };

    await Promise.all([
      cacheSet(ANOMALY_KEY, payload, 900),
      cacheSet(LASTRUN_KEY, scannedAt, 900),
    ]);

    return NextResponse.json(payload);
  } catch {
    // Serve stale cache on error rather than showing nothing
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ anomalies: [], scannedAt: new Date().toISOString() });
  }
}
