"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ExternalLink } from "lucide-react";
import { formatUSD, formatAddress } from "@/lib/utils";
import type { BridgeInflowData } from "@/lib/data/bridge";

export function BridgeInflowCard() {
  const { data, isLoading } = useQuery<BridgeInflowData>({
    queryKey: ["bridge-inflow"],
    queryFn: () => fetch("/api/data/bridge").then((r) => r.json()),
    refetchInterval: 600_000,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Bridge Inflows (24h)</h3>
        </div>
        <span className="text-xs text-muted-foreground">L1 → Mantle</span>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-secondary rounded w-32" />
          <div className="h-4 bg-secondary rounded w-24" />
        </div>
      ) : (
        <>
          <div>
            <div className="text-2xl font-bold text-primary">
              {formatUSD(data?.totalInflowUSD ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {data?.txCount ?? 0} bridge transactions
            </div>
          </div>

          {data && data.topRecipients.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Top Recipients
              </div>
              {data.topRecipients.slice(0, 3).map((r) => (
                <div key={r.address} className="flex items-center justify-between text-sm">
                  <a
                    href={`https://mantlescan.xyz/address/${r.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    {formatAddress(r.address)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-xs font-medium text-foreground">
                    {formatUSD(r.totalUSD)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {data && data.recentTransfers.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Transfers
              </div>
              {data.recentTransfers.slice(0, 3).map((t) => (
                <div key={t.hash} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {formatAddress(t.to)} ← {t.tokenSymbol}
                  </span>
                  <span className="text-foreground font-medium">{formatUSD(t.amountUSD)}</span>
                </div>
              ))}
            </div>
          )}

          {(!data || data.totalInflowUSD === 0) && (
            <div className="text-xs text-muted-foreground">
              No bridge activity in last 24h
            </div>
          )}
        </>
      )}
    </div>
  );
}
