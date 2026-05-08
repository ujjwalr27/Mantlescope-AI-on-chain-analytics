"use client";

import { useState, useCallback } from "react";
import { useReadContract } from "wagmi";
import { Search, Shield, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { WalletBadge } from "@/components/wallets/WalletBadge";
import { formatAddress, formatUSD } from "@/lib/utils";
import { MANTLESCOPE_ADDRESS, MANTLESCOPE_ABI } from "@/lib/mantle/contracts";

const BEHAVIOR_TAGS = ["unknown", "accumulator", "trader", "bot", "whale"];

interface InsightResult {
  riskScore: number;
  behaviorTag: string;
  summary: string;
  reasoning: string;
}

interface OnchainResult {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  insight: InsightResult;
}

export default function ProfilerPage() {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState("");
  const [insight, setInsight] = useState<InsightResult | null>(null);
  const [onchain, setOnchain] = useState<OnchainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");

  const { data: storedInsight, refetch: refetchOnchain } = useReadContract({
    address: MANTLESCOPE_ADDRESS,
    abi: MANTLESCOPE_ABI,
    functionName: "getWalletInsight",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const handleAnalyze = useCallback(async () => {
    const addr = input.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError("Enter a valid 0x address");
      return;
    }
    setError("");
    setLoading(true);
    setInsight(null);
    setOnchain(null);
    try {
      const res = await fetch(`/api/insights?address=${addr}`);
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAddress(addr);
      setInsight(data);
    } catch {
      setError("Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleWriteToChain = useCallback(async () => {
    setWriting(true);
    try {
      const res = await fetch("/api/onchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) throw new Error("On-chain write failed");
      const data = await res.json();
      setOnchain(data);
      await refetchOnchain();
    } catch {
      setError("Failed to write to chain.");
    } finally {
      setWriting(false);
    }
  }, [address, refetchOnchain]);

  const riskColor =
    insight?.riskScore !== undefined
      ? insight.riskScore > 70 ? "text-red-400" : insight.riskScore > 40 ? "text-yellow-400" : "text-green-400"
      : "";

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Search className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Wallet Profiler</h1>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="0x wallet address..."
          className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Analyze
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {insight && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI Result */}
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground font-mono">
                {formatAddress(address, 6)}
              </span>
              <WalletBadge tag={insight.behaviorTag} />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`text-4xl font-bold tabular-nums ${riskColor}`}>
                  {insight.riskScore}
                </div>
                <div className="text-xs text-muted-foreground">Risk Score</div>
              </div>
              <div className="flex-1 text-sm text-foreground leading-relaxed">
                {insight.summary}
              </div>
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">AI Reasoning</summary>
              <p className="mt-2 leading-relaxed">{insight.reasoning}</p>
            </details>

            <button
              onClick={handleWriteToChain}
              disabled={writing || !!onchain}
              className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
            >
              {writing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Writing to Mantle...</>
              ) : onchain ? (
                <><Shield className="w-4 h-4" /> Written on-chain</>
              ) : (
                <><Shield className="w-4 h-4" /> Write Insight to Chain</>
              )}
            </button>

            {onchain && (
              <a
                href={onchain.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View tx on Mantlescan
              </a>
            )}
          </div>

          {/* On-chain stored record */}
          {storedInsight && Number(storedInsight.updatedAt) > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                On-chain Record
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Risk Score</div>
                  <div className="font-semibold">{Number(storedInsight.riskScore)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Behavior</div>
                  <div className="font-semibold">{BEHAVIOR_TAGS[Number(storedInsight.behaviorTag)] ?? "unknown"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Last Updated</div>
                  <div className="font-mono text-xs">
                    {new Date(Number(storedInsight.updatedAt) * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
