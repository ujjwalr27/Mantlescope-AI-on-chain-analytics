"use client";

import { useQuery } from "@tanstack/react-query";
import { SmartMoneyTable, type WalletRow } from "@/components/wallets/SmartMoneyTable";
import { Users } from "lucide-react";

export default function WalletsPage() {
  const { data: wallets = [], isLoading } = useQuery<WalletRow[]>({
    queryKey: ["wallets"],
    queryFn: () => fetch("/api/data/wallets").then((r) => r.json()),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Smart Money</h1>
        <span className="ml-auto text-xs text-muted-foreground">Refreshes every 60s</span>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading wallet data...</div>
      ) : (
        <SmartMoneyTable wallets={wallets} />
      )}
    </div>
  );
}
