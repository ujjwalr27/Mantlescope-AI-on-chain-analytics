import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { detectAnomalies } from "@/lib/ai/analyzer";
import { getTransactions } from "@/lib/data/mantlescan";

const ANOMALY_KEY = "mantle:anomalies:latest";
const LASTRUN_KEY = "mantle:anomalies:lastrun";
const SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 min

// Wallets to monitor for anomalies
const WATCH_WALLETS = [
  "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
  "0x4200000000000000000000000000000000000006",
  "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
];

export async function GET() {
  // Return cached result if fresh
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

  // Run a fresh scan (non-blocking — best effort)
  try {
    const now15min = Math.floor(Date.now() / 1000) - 900;

    const snapshots = await Promise.all(
      WATCH_WALLETS.map(async (address) => {
        const txs = await getTransactions(address, 1, 50);
        const recent = txs.filter((t) => parseInt(t.timeStamp) >= now15min);
        return {
          address,
          txCount: recent.length,
          volumeUSD: 0,
          direction: recent.length > 5 ? "high" : "normal",
        };
      })
    );

    const result = await detectAnomalies(snapshots);
    const scannedAt = new Date().toISOString();
    const payload = { anomalies: result.anomalies, scannedAt };

    await Promise.all([
      cacheSet(ANOMALY_KEY, payload, 900),
      cacheSet(LASTRUN_KEY, scannedAt, 900),
    ]);

    return NextResponse.json(payload);
  } catch {
    // Return cached even if stale on error
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ anomalies: [], scannedAt: new Date().toISOString() });
  }
}
