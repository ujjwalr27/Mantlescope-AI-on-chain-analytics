"use client";

import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { WalletBadge } from "./WalletBadge";
import { ExternalLink } from "lucide-react";

export interface WalletRow {
  address: string;
  txCount: number;
  uniqueCounterparties: number;
  behaviorHint: string;
  riskScore?: number;
}

interface Props {
  wallets: WalletRow[];
  limit?: number;
}

export function SmartMoneyTable({ wallets, limit }: Props) {
  const rows = limit ? wallets.slice(0, limit) : wallets;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3">Address</th>
            <th className="text-right px-4 py-3">Txs (7d)</th>
            <th className="text-right px-4 py-3">Counterparties</th>
            <th className="text-center px-4 py-3">Tag</th>
            {rows.some((r) => r.riskScore !== undefined) && (
              <th className="text-right px-4 py-3">Risk</th>
            )}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((w, i) => (
            <tr key={w.address} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3 font-mono">
                <Link href={`/profiler?address=${w.address}`} className="hover:text-primary transition-colors">
                  {formatAddress(w.address)}
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{w.txCount}</td>
              <td className="px-4 py-3 text-right tabular-nums">{w.uniqueCounterparties}</td>
              <td className="px-4 py-3 text-center">
                <WalletBadge tag={w.behaviorHint} size="sm" />
              </td>
              {rows.some((r) => r.riskScore !== undefined) && (
                <td className="px-4 py-3 text-right tabular-nums">
                  {w.riskScore !== undefined ? (
                    <span className={w.riskScore > 70 ? "text-red-400" : w.riskScore > 40 ? "text-yellow-400" : "text-green-400"}>
                      {w.riskScore}
                    </span>
                  ) : "—"}
                </td>
              )}
              <td className="px-4 py-3 text-right">
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${w.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No wallet data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
