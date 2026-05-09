"use client";

import { useReadContract } from "wagmi";
import { Bot, Zap, Shield, Activity, ExternalLink, Award } from "lucide-react";
import { AGENT_CONTRACT_ADDRESS, AGENT_ABI } from "@/lib/mantle/contracts";
import { MANTLESCOPE_ADDRESS } from "@/lib/mantle/contracts";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-right font-mono break-all">{value}</span>
    </div>
  );
}

export default function AboutPage() {
  const { data } = useReadContract({
    address: AGENT_CONTRACT_ADDRESS,
    abi: AGENT_ABI,
    functionName: "getAgentMetadata",
    args: [0n],
    query: {
      enabled: AGENT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  const [name, capabilities, aiModel, achievements, mintedAt, active] = data ?? [];
  const achievementCount = Number(achievements ?? 0);
  const mintedDate = mintedAt ? new Date(Number(mintedAt) * 1000).toLocaleDateString() : "—";

  const capsList = (capabilities as string)?.split(",") ?? [
    "wallet_analysis",
    "protocol_health",
    "anomaly_detection",
    "trend_prediction",
    "bridge_tracking",
  ];

  const hasAgent = AGENT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Bot className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">About MantleScope</h1>
      </div>

      {/* ERC-8004 Agent Card */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-foreground">
                {(name as string) ?? "MantleScope AI Oracle"}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 font-semibold">
                ERC-8004 Agent #0
              </span>
              {active && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI oracle agent with a unique on-chain identity NFT, earning achievements
              for each wallet analysis written to Mantle Network.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <div className="text-2xl font-bold text-primary">{achievementCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Analyses on-chain</div>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {(aiModel as string)?.split("/").pop() ?? "llama-3.3-70b"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">AI model</div>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{mintedDate}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Minted</div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mt-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Capabilities</div>
          <div className="flex flex-wrap gap-1.5">
            {capsList.map((cap: string) => (
              <span
                key={cap}
                className="text-[10px] px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-mono"
              >
                {cap.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="rounded-xl border border-border bg-card p-5 mb-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Deployed Contracts (Mantle Sepolia)
        </h3>
        <div>
          <InfoRow
            label="MantleScopeInsights"
            value={
              <a
                href={`https://sepolia.mantlescan.xyz/address/${MANTLESCOPE_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 justify-end"
              >
                {MANTLESCOPE_ADDRESS}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            }
          />
          {hasAgent && (
            <InfoRow
              label="MantleScopeAgent (ERC-8004)"
              value={
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${AGENT_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 justify-end"
                >
                  {AGENT_CONTRACT_ADDRESS}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              }
            />
          )}
          <InfoRow label="Network" value="Mantle Sepolia (chainId 5003)" />
          <InfoRow label="Oracle model" value={(aiModel as string) ?? "groq/llama-3.3-70b-versatile"} />
        </div>
      </div>

      {/* Architecture summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          How It Works
        </h3>
        <ol className="space-y-2.5 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">1.</span>
            <span>On-chain data is indexed from Mantle Mainnet via Etherscan v2 API (100k calls/day), DefiLlama for TVL, and direct RPC reads.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">2.</span>
            <span>Groq's LPU hardware runs <strong>llama-3.3-70b-versatile</strong> at ~500 tok/s to classify wallets, detect anomalies, and summarise protocol health in real time.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">3.</span>
            <span>AI results are written on-chain to <code className="font-mono bg-secondary px-1 rounded">MantleScopeInsights</code> — any Mantle contract can read trustless AI risk scores without running its own inference.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">4.</span>
            <span>Every action is logged to the Oracle Activity Log — a public, real-time audit trail demonstrating verifiable AI transparency.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">5.</span>
            <span>The ERC-8004 Agent NFT gives the AI a unique on-chain identity, with achievements incrementing for each successful analysis cycle.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
