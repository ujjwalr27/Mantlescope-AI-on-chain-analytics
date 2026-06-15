"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { WalletBadge } from "./WalletBadge";
import { ExternalLink, ChevronDown } from "lucide-react";
import { scoreBand, type ScoreComponent } from "@/lib/scoring";

export interface WalletRow {
  address: string;
  txCount: number;
  uniqueCounterparties: number;
  behaviorHint: "bot" | "whale" | "trader" | "accumulator" | "unknown";
  riskScore?: number;
  mantleScore?: number;
  uniqueTokenCount?: number;
  scoreBreakdown?: ScoreComponent[];
}

interface Props {
  wallets: WalletRow[];
  limit?: number;
}

const SCORE_COLORS: Record<string, string> = {
  elite: "text-primary font-bold",
  high: "text-green-400 font-semibold",
  mid: "text-yellow-400",
  low: "text-muted-foreground",
};

function ScoreBadge({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span className={SCORE_COLORS[band] ?? "text-muted-foreground"}>
      {score}
    </span>
  );
}

function ScoreBreakdownRow({ components, colSpan }: { components: ScoreComponent[]; colSpan: number }) {
  return (
    <tr className="bg-secondary/20 border-b border-border/50">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="text-xs text-muted-foreground mb-2">
          MantleScore breakdown — 6 weighted on-chain signals
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
          {components.map((c) => (
            <div key={c.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="tabular-nums font-medium">{c.value}/{c.max}</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full"
                  style={{ width: `${c.max > 0 ? (c.value / c.max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export function SmartMoneyTable({ wallets, limit }: Props) {
  const rows = limit ? wallets.slice(0, limit) : wallets;
  const hasMantleScore = rows.some((r) => r.mantleScore !== undefined);
  const hasRiskScore = rows.some((r) => r.riskScore !== undefined);
  const [expanded, setExpanded] = useState<string | null>(null);
  // address col + txs + counterparties + tag + (score?) + (risk?) + link
  const colSpan = 4 + (hasMantleScore ? 1 : 0) + (hasRiskScore ? 1 : 0) + 1;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3">Address</th>
            <th className="text-right px-4 py-3">Txs</th>
            <th className="text-right px-4 py-3">Counterparties</th>
            <th className="text-center px-4 py-3">Tag</th>
            {hasMantleScore && (
              <th className="text-right px-4 py-3 text-primary/70" title="Composite score across 6 on-chain signals">
                ∑ Score
              </th>
            )}
            {hasRiskScore && (
              <th className="text-right px-4 py-3">Risk</th>
            )}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => {
            const canExpand = !!w.scoreBreakdown && w.scoreBreakdown.length > 0;
            const isOpen = expanded === w.address;
            return (
            <React.Fragment key={w.address}>
            <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
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
              {hasMantleScore && (
                <td className="px-4 py-3 text-right tabular-nums">
                  {w.mantleScore !== undefined ? (
                    canExpand ? (
                      <button
                        onClick={() => setExpanded(isOpen ? null : w.address)}
                        className="inline-flex items-center gap-1 hover:opacity-80"
                        title="Show score breakdown"
                      >
                        <ScoreBadge score={w.mantleScore} />
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    ) : (
                      <ScoreBadge score={w.mantleScore} />
                    )
                  ) : "—"}
                </td>
              )}
              {hasRiskScore && (
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
                  href={`https://mantlescan.xyz/address/${w.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </td>
            </tr>
            {isOpen && canExpand && (
              <ScoreBreakdownRow components={w.scoreBreakdown!} colSpan={colSpan} />
            )}
            </React.Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No wallet data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
