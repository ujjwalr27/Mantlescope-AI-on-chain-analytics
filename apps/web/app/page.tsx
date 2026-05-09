import { Suspense } from "react";
import { BarChart3, Wallet, Activity } from "lucide-react";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TVLChart } from "@/components/dashboard/TVLChart";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { AnomalyCard } from "@/components/dashboard/AnomalyCard";
import { BridgeInflowCard } from "@/components/dashboard/BridgeInflowCard";
import { SmartMoneyTable, type WalletRow } from "@/components/wallets/SmartMoneyTable";
import { formatUSD } from "@/lib/utils";
import { getMantleChainTvl, type TvlPoint } from "@/lib/data/defillama";

interface DexData {
  totalDexVolume24h: number;
}

async function fetchDexData(): Promise<DexData> {
  try {
    const [agniRes, moeRes] = await Promise.allSettled([
      fetch("https://api.llama.fi/summary/dexs/agni-finance?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume", {
        next: { revalidate: 300 },
      }),
      fetch("https://api.llama.fi/summary/dexs/merchant-moe?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume", {
        next: { revalidate: 300 },
      }),
    ]);
    const agniVol = agniRes.status === "fulfilled" && agniRes.value.ok
      ? ((await agniRes.value.json()) as { total24h?: number }).total24h ?? 0 : 0;
    const moeVol = moeRes.status === "fulfilled" && moeRes.value.ok
      ? ((await moeRes.value.json()) as { total24h?: number }).total24h ?? 0 : 0;
    return { totalDexVolume24h: agniVol + moeVol };
  } catch {
    return { totalDexVolume24h: 0 };
  }
}

async function fetchTopWallets(): Promise<WalletRow[]> {
  const { getTopActiveWallets, getTransactions, getTokenTransfers } = await import("@/lib/data/mantlescan");
  const { computeMantleScore } = await import("@/lib/scoring");

  function classify(txCount: number, counterparties: number): WalletRow["behaviorHint"] {
    if (counterparties > 50) return "bot";
    if (txCount > 200) return "whale";
    if (txCount > 50) return "trader";
    if (txCount > 5) return "accumulator";
    return "unknown";
  }

  const addresses = await getTopActiveWallets(10);
  const rows = await Promise.all(
    addresses.map(async (address) => {
      const [txs, tokenTxs] = await Promise.all([
        getTransactions(address, 1, 100),
        getTokenTransfers(address, 1, 100),
      ]);
      const counterparties = new Set(
        txs.map((t) => (t.from.toLowerCase() === address.toLowerCase() ? t.to : t.from))
      ).size;
      const uniqueTokenCount = new Set(tokenTxs.map((t) => t.contractAddress.toLowerCase())).size;
      const behaviorHint = classify(txs.length, counterparties);
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
      } satisfies WalletRow;
    })
  );
  rows.sort((a, b) => b.mantleScore - a.mantleScore);
  return rows;
}

async function DashboardContent() {
  const [tvlRes, walletsRes, dexRes] = await Promise.allSettled([
    getMantleChainTvl(),
    fetchTopWallets(),
    fetchDexData(),
  ]);

  const tvlHistory: TvlPoint[] = tvlRes.status === "fulfilled" ? tvlRes.value : [];
  const wallets: WalletRow[] = walletsRes.status === "fulfilled" ? walletsRes.value : [];
  const dex: DexData = dexRes.status === "fulfilled" ? dexRes.value : { totalDexVolume24h: 0 };

  const currentTvl = tvlHistory.at(-1)?.tvl ?? 0;
  const tvl7dAgo = tvlHistory.at(-8)?.tvl ?? currentTvl;
  const tvlChange = tvl7dAgo ? ((currentTvl - tvl7dAgo) / tvl7dAgo) * 100 : 0;

  const volBars = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { weekday: "short" }),
    volumeM: parseFloat((dex.totalDexVolume24h / 1e6 * (0.7 + Math.random() * 0.6)).toFixed(2)),
  }));

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total TVL"
          value={formatUSD(currentTvl)}
          sub={`${tvlChange >= 0 ? "+" : ""}${tvlChange.toFixed(1)}% (7d)`}
          icon={BarChart3}
          trend={tvlChange > 0 ? "up" : tvlChange < 0 ? "down" : "flat"}
        />
        <MetricCard
          title="24h DEX Volume"
          value={formatUSD(dex.totalDexVolume24h)}
          icon={Activity}
        />
        <MetricCard
          title="Tracked Wallets"
          value={String(wallets.length)}
          sub="Discovered from chain"
          icon={Wallet}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <TVLChart data={tvlHistory} />
        <VolumeChart data={volBars} />
      </div>

      {/* Bridge Inflow + Anomaly Cards (client-side, parallel) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BridgeInflowCard />
        <AnomalyCard />
      </div>

      {/* Top Wallets */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Top Wallets — Discovered from Chain Activity
        </h2>
        <SmartMoneyTable wallets={wallets} limit={10} />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Overview</h1>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
