"use client";

import { useReadContract } from "wagmi";
import { Bot, ExternalLink, Zap } from "lucide-react";
import { AGENT_CONTRACT_ADDRESS, AGENT_ABI } from "@/lib/mantle/contracts";
import Link from "next/link";

/**
 * ERC-8004 Agent Identity Badge.
 * Reads on-chain metadata from the MantleScopeAgent NFT (token #0)
 * and displays it as a compact badge.
 */
export function AgentBadge() {
  const { data } = useReadContract({
    address: AGENT_CONTRACT_ADDRESS,
    abi: AGENT_ABI,
    functionName: "getAgentMetadata",
    args: [0n],
    query: {
      enabled: AGENT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000",
      staleTime: 60_000,
    },
  });

  // data = [name, capabilities, aiModel, achievements, mintedAt, active]
  const [name, , aiModel, achievements, , active] = data ?? [];

  if (!data || !active) return null;

  const achievementCount = Number(achievements ?? 0);
  const modelShort = (aiModel as string)?.split("/").pop() ?? "AI";

  return (
    <Link
      href="/about"
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
      title="ERC-8004 Agent Identity NFT"
    >
      <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-primary truncate leading-tight">
          {(name as string) ?? "MantleScope AI Oracle"}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight">
          {modelShort} · {achievementCount} analyses
        </span>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

/**
 * Inline "powered by" chip for use in other components.
 */
export function AgentChip({ achievements }: { achievements?: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-[10px] text-primary font-medium">
      <Zap className="w-2.5 h-2.5" />
      ERC-8004 Agent #0
      {achievements !== undefined && (
        <span className="text-muted-foreground ml-0.5">· {achievements} analyses</span>
      )}
    </span>
  );
}
