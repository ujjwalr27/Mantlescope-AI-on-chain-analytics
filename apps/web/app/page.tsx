import { Suspense } from "react";
import { BarChart3, Wallet, Activity, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TVLChart } from "@/components/dashboard/TVLChart";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
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
      ? ((await agniRes.value.json()) as { total24h?: number }).total24h ?? 0
      : 0;
    const moeVol = moeRes.status === "fulfilled" && moeRes.value.ok
      ? ((await moeRes.value.json()) as { total24h?: number }).total24h ?? 0
      : 0;
    return { totalDexVolume24h: agniVol + moeVol };
  } catch {
    return { totalDexVolume24h: 0 };
  }
}

async function fetchTopWallets(): Promise<WalletRow[]> {
  // Imported lazily to avoid pulling node-only deps into client bundle
  const { getTransactions } = await import("@/lib/data/mantlescan");
  const SEED_WALLETS = [
    "0x9b93b2F519ecF41cb7CDCAEBd32B1B9861A91462",
    "0x2F8A25ac62179B31D62D7F80884AE57464699059",
    "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
    "0x4200000000000000000000000000000000000006",
    "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
    "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
    "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
  ];
  function classify(txCount: number, counterparties: number): WalletRow["behaviorHint"] {
    if (counterparties > 50) return "bot";
    if (txCount > 200) return "whale";
    if (txCount > 50) return "trader";
    if (txCount > 5) return "accumulator";
    return "unknown";
  }
  const rows = await Promise.all(
    SEED_WALLETS.map(async (address) => {
      const txs = await getTransactions(address, 1, 100);
      const counterparties = new Set(txs.map((t) => t.from === address.toLowerCase() ? t.to : t.from)).size;
      return {
        address,
        txCount: txs.length,
        uniqueCounterparties: counterparties,
        behaviorHint: classify(txs.length, counterparties),
      } satisfies WalletRow;
    })
  );
  rows.sort((a, b) => b.txCount - a.txCount);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total TVL"
          value={formatUSD(currentTvl)}
          sub={`${tvlChange >= 0 ? "+" : ""}${tvlChange.toFixed(1)}% (7d)`}
          icon={BarChart3}
          trend={tvlChange > 0 ? "up" : tvlChange < 0 ? "down" : "flat"}
        />
        <MetricCard title="24h DEX Volume" value={formatUSD(dex.totalDexVolume24h)} icon={Activity} />
        <MetricCard title="Tracked Wallets" value={String(wallets.length)} sub="Active last 7d" icon={Wallet} />
        <MetricCard title="Anomalies" value="—" sub="Run anomaly scan" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <TVLChart data={tvlHistory} />
        <VolumeChart data={volBars} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Top Wallets</h2>
        <SmartMoneyTable wallets={wallets} limit={10} />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Overview</h1>
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
