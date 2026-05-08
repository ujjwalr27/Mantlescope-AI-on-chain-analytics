import { Suspense } from "react";
import { BarChart3, Wallet, Activity, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TVLChart } from "@/components/dashboard/TVLChart";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { SmartMoneyTable } from "@/components/wallets/SmartMoneyTable";
import { formatUSD } from "@/lib/utils";
import { getMantleChainTvl } from "@/lib/data/defillama";

async function DashboardContent() {
  const [tvlData, walletsRes, dexRes] = await Promise.allSettled([
    getMantleChainTvl(),
    fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/api/data/wallets`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/api/data/dex`, { cache: "no-store" }).then((r) => r.json()),
  ]);

  const tvlHistory = tvlData.status === "fulfilled" ? tvlData.value : [];
  const wallets = walletsRes.status === "fulfilled" ? walletsRes.value : [];
  const dex = dexRes.status === "fulfilled" ? dexRes.value : { totalDexVolume24h: 0 };

  const currentTvl = tvlHistory.at(-1)?.tvl ?? 0;
  const tvl7dAgo = tvlHistory.at(-8)?.tvl ?? currentTvl;
  const tvlChange = tvl7dAgo ? ((currentTvl - tvl7dAgo) / tvl7dAgo) * 100 : 0;

  // Build placeholder 7-day volume bars
  const volBars = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { weekday: "short" }),
    volumeM: parseFloat(((dex.totalDexVolume24h ?? 0) / 1e6 * (0.7 + Math.random() * 0.6)).toFixed(2)),
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
        <MetricCard
          title="24h DEX Volume"
          value={formatUSD(dex.totalDexVolume24h ?? 0)}
          icon={Activity}
        />
        <MetricCard
          title="Tracked Wallets"
          value={String(wallets.length)}
          sub="Active last 7d"
          icon={Wallet}
        />
        <MetricCard
          title="Anomalies"
          value="—"
          sub="Run anomaly scan"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <TVLChart data={tvlHistory} />
        <VolumeChart data={volBars} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Top Wallets
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
      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
