"use client";

import { useQuery } from "@tanstack/react-query";
import { SmartMoneyTable, type WalletRow } from "@/components/wallets/SmartMoneyTable";
import { WalletRowSkeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle } from "lucide-react";

function WalletsSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <WalletRowSkeleton key={i} />
      ))}
    </div>
  );
}

export default function WalletsPage() {
  const { data: wallets = [], isLoading, isError, refetch } = useQuery<WalletRow[]>({
    queryKey: ["wallets"],
    queryFn: () => fetch("/api/data/wallets").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Smart Money</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "Discovering wallets…" : `${wallets.length} wallets · Refreshes every 60s`}
        </span>
      </div>

      {isLoading ? (
        <WalletsSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <p className="text-sm text-red-400 font-medium">Failed to load wallet data</p>
          <p className="text-xs text-muted-foreground">Check your Etherscan API key or network connection.</p>
          <button
            onClick={() => refetch()}
            className="mt-1 px-4 py-1.5 text-xs bg-card border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            Retry
          </button>
        </div>
      ) : wallets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No active wallets discovered yet.</p>
          <p className="text-xs text-muted-foreground mt-1">The scanner will retry automatically.</p>
        </div>
      ) : (
        <SmartMoneyTable wallets={wallets} />
      )}
    </div>
  );
}
