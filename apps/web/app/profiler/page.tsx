"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { parseEther } from "viem";
import { Search, Shield, ChevronRight, ExternalLink, Loader2, Zap, AlertTriangle } from "lucide-react";
import { WalletBadge } from "@/components/wallets/WalletBadge";
import { formatAddress } from "@/lib/utils";
import { MANTLESCOPE_ADDRESS, MANTLESCOPE_ABI } from "@/lib/mantle/contracts";

const BEHAVIOR_TAGS = ["unknown", "accumulator", "trader", "bot", "whale"];
const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "5003"); // Mantle Sepolia

interface LabeledAddress {
  address: string;
  label: string;
  type: string;
}

interface InsightResult {
  riskScore: number;
  behaviorTag: string;
  summary: string;
  reasoning: string;
  selfLabel?: LabeledAddress | null;
  labeledCounterparties?: LabeledAddress[];
}

const ENTITY_COLORS: Record<string, string> = {
  token: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  bridge: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  protocol: "bg-green-500/10 text-green-300 border-green-500/30",
  dex: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  oracle: "bg-primary/10 text-primary border-primary/30",
  system: "bg-muted text-muted-foreground border-border",
};

function EntityChip({ label, type }: { label: string; type: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${ENTITY_COLORS[type] ?? ENTITY_COLORS.system}`}>
      {label}
    </span>
  );
}

interface OnchainResult {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  insight: InsightResult;
}

function ProfilerInner() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [address, setAddress] = useState("");
  const [insight, setInsight] = useState<InsightResult | null>(null);
  const [onchain, setOnchain] = useState<OnchainResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [autoWriting, setAutoWriting] = useState(false);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const isWrongChain = isConnected && chainId !== EXPECTED_CHAIN_ID;

  const { data: storedInsight, refetch: refetchOnchain } = useReadContract({
    address: MANTLESCOPE_ADDRESS,
    abi: MANTLESCOPE_ABI,
    functionName: "getWalletInsight",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  // User-callable on-chain trigger — pays gas in MNT
  const { writeContract: triggerOnChain, data: triggerHash, isPending: triggerPending, reset: resetTrigger } =
    useWriteContract();
  const { isLoading: triggerConfirming, isSuccess: triggerConfirmed } =
    useWaitForTransactionReceipt({ hash: triggerHash });

  const handleAnalyze = useCallback(async (addrOverride?: string) => {
    const addr = (addrOverride ?? input).trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError("Enter a valid 0x address");
      return;
    }
    setError("");
    setLoading(true);
    setInsight(null);
    setOnchain(null);
    resetTrigger(); // clear any prior on-chain trigger state from a previous analysis
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
  }, [input, resetTrigger]);

  const handleWriteToChain = useCallback(async (triggerTxHash?: string) => {
    setWriting(true);
    setError("");
    try {
      const res = await fetch("/api/onchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, triggerTxHash }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Server error ${res.status}`);
      }
      setOnchain(data);
      await refetchOnchain();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to write to chain.");
    } finally {
      setWriting(false);
    }
  }, [address, refetchOnchain]);

  // User-callable on-chain trigger
  const handleTriggerOnChain = useCallback(() => {
    if (!address) return;
    setError("");
    triggerOnChain({
      address: MANTLESCOPE_ADDRESS,
      abi: MANTLESCOPE_ABI,
      functionName: "triggerAnalysis",
      args: [address as `0x${string}`],
      value: parseEther("0.001"), // small fee in MNT
    });
  }, [address, triggerOnChain]);

  // After user's on-chain trigger confirms, auto-call backend to fulfill it
  useEffect(() => {
    if (triggerConfirmed && triggerHash && address && !onchain && !autoWriting) {
      setAutoWriting(true);
      handleWriteToChain(triggerHash).finally(() => setAutoWriting(false));
    }
  }, [triggerConfirmed, triggerHash, address, onchain, autoWriting, handleWriteToChain]);

  // Prefill + auto-analyze when arriving from a link like /profiler?address=0x…
  useEffect(() => {
    const qp = searchParams.get("address");
    if (qp && /^0x[0-9a-fA-F]{40}$/.test(qp) && qp !== address) {
      setInput(qp);
      handleAnalyze(qp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
          onClick={() => handleAnalyze()}
          disabled={loading}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Analyze
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Wrong-chain banner */}
      {isWrongChain && insight && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-200 flex-1">
            Your wallet is connected to chain {chainId}, but the contract lives on Mantle Sepolia (chain {EXPECTED_CHAIN_ID}).
          </span>
          <button
            onClick={() => switchChain({ chainId: EXPECTED_CHAIN_ID })}
            disabled={switching}
            className="text-xs px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-200 rounded-md font-medium disabled:opacity-50"
          >
            {switching ? "Switching…" : "Switch to Mantle Sepolia"}
          </button>
        </div>
      )}

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

            {/* Known on-chain entities */}
            {(insight.selfLabel || (insight.labeledCounterparties && insight.labeledCounterparties.length > 0)) && (
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2">Identified on-chain entities</div>
                <div className="flex flex-wrap gap-1.5">
                  {insight.selfLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-primary/50 bg-primary/10 text-primary font-medium">
                      This wallet: {insight.selfLabel.label}
                    </span>
                  )}
                  {insight.labeledCounterparties?.map((c) => (
                    <EntityChip key={c.address} label={c.label} type={c.type} />
                  ))}
                </div>
              </div>
            )}

            {/* Two on-chain actions side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
              {/* User-callable on-chain trigger (pays gas in MNT) */}
              <button
                onClick={handleTriggerOnChain}
                disabled={!isConnected || isWrongChain || triggerPending || triggerConfirming || triggerConfirmed}
                title={
                  !isConnected ? "Connect wallet first" :
                  isWrongChain ? "Switch to Mantle Sepolia first" :
                  "Trigger AI analysis on-chain (pay 0.001 MNT)"
                }
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-mantle/10 border border-mantle/40 text-mantle rounded-lg text-sm font-medium hover:bg-mantle/20 disabled:opacity-50 transition-colors"
              >
                {triggerPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…</>
                ) : triggerConfirming ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mining…</>
                ) : triggerConfirmed ? (
                  <><Zap className="w-4 h-4" /> Triggered on-chain ✓</>
                ) : (
                  <><Zap className="w-4 h-4" /> Trigger On-Chain (0.001 MNT)</>
                )}
              </button>

              {/* Direct oracle write (free for the user) */}
              <button
                onClick={() => handleWriteToChain()}
                disabled={writing || !!onchain || autoWriting}
                title="Have the oracle write the result on-chain (free)"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
              >
                {writing || autoWriting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Writing…</>
                ) : onchain ? (
                  <><Shield className="w-4 h-4" /> Written ✓</>
                ) : (
                  <><Shield className="w-4 h-4" /> Write Insight (Oracle)</>
                )}
              </button>
            </div>

            {/* Trigger tx link */}
            {triggerHash && (
              <a
                href={`https://sepolia.mantlescan.xyz/tx/${triggerHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-mantle hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View trigger tx on Mantlescan
              </a>
            )}

            {onchain && (
              <a
                href={onchain.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View oracle write on Mantlescan
              </a>
            )}
          </div>

          {/* On-chain stored record */}
          {storedInsight && Number(storedInsight.updatedAt) > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
              <div className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                On-chain Record
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${MANTLESCOPE_ADDRESS}#readContract`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  Verified contract <ExternalLink className="w-3 h-3" />
                </a>
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
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                Any Mantle contract can read this insight via <code className="font-mono bg-secondary px-1 rounded">getWalletInsight(address)</code> — trustless AI risk scores without each protocol running its own inference.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilerPage() {
  return (
    <Suspense fallback={null}>
      <ProfilerInner />
    </Suspense>
  );
}
