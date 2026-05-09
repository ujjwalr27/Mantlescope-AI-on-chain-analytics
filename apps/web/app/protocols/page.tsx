"use client";

import { useQuery } from "@tanstack/react-query";
import { formatUSD, pctColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Layers, AlertCircle } from "lucide-react";
import { ProtocolCardSkeleton } from "@/components/ui/skeleton";
import type { ProtocolTvl } from "@/lib/data/defillama";

function TrendIcon({ pct }: { pct: number | null }) {
  if (pct === null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (pct > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
}

export default function ProtocolsPage() {
  const { data, isLoading, isError, refetch } = useQuery<{ protocols: ProtocolTvl[] }>({
    queryKey: ["tvl"],
    queryFn: () => fetch("/api/data/tvl").then((r) => r.json()),
    refetchInterval: 300_000,
  });

  const { data: aiHealth } = useQuery<{
    protocols: Array<{ name: string; healthScore: number; summary: string }>;
    ecosystemSummary: string;
  }>({
    queryKey: ["protocols-ai"],
    queryFn: () => fetch("/api/insights?type=protocol").then((r) => r.json()),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Layers className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Protocols</h1>
        {!isLoading && !isError && (
          <span className="ml-auto text-xs text-muted-foreground">
            {(data?.protocols ?? []).length} protocols tracked
          </span>
        )}
      </div>

      {aiHealth?.ecosystemSummary && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 text-sm text-foreground">
          <span className="text-primary font-medium mr-2">AI Ecosystem Summary</span>
          {aiHealth.ecosystemSummary}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProtocolCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <p className="text-sm text-red-400 font-medium">Failed to load protocol data</p>
          <p className="text-xs text-muted-foreground">DefiLlama API may be temporarily unavailable.</p>
          <button
            onClick={() => refetch()}
            className="mt-1 px-4 py-1.5 text-xs bg-card border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data?.protocols ?? []).map((p) => {
            const ai = aiHealth?.protocols.find((a) => a.name === p.name);
            return (
              <div key={p.slug} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  {ai && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        ai.healthScore >= 70
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : ai.healthScore >= 40
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      Health {ai.healthScore}/100
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">TVL</div>
                    <div className="font-medium">{formatUSD(p.tvl)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">7d Change</div>
                    <div className={`font-medium flex items-center gap-1 ${pctColor(p.change7d)}`}>
                      <TrendIcon pct={p.change7d} />
                      {p.change7d !== null ? `${p.change7d.toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                </div>

                {ai?.summary && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
                    {ai.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
