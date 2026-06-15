/**
 * Trustless fulfillment of on-chain analysis requests.
 *
 * Closes the loop opened by `triggerAnalysis(wallet)`: anyone can emit an
 * `AnalysisRequested` event on-chain (without ever touching our UI), and this
 * endpoint — run on a schedule by QStash — discovers those events directly from
 * chain logs, runs the AI analysis, and writes the result back via the oracle.
 *
 * This makes the oracle genuinely permissionless and auditable: the request and
 * the fulfillment are both on-chain, independent of any frontend.
 */
import { NextRequest, NextResponse } from "next/server";
import { parseAbiItem, keccak256, toBytes } from "viem";
import { publicClient, getOracleWalletClient } from "@/lib/mantle/rpc";
import { MANTLESCOPE_ADDRESS, MANTLESCOPE_ABI, AGENT_CONTRACT_ADDRESS, AGENT_ABI } from "@/lib/mantle/contracts";
import { getWalletActivity } from "@/lib/data/walletData";
import { analyzeWallet } from "@/lib/ai/analyzer";
import { BEHAVIOR_TAG_ID } from "@/lib/ai/schemas";
import { pushOracleEvent } from "@/lib/oracle-log";

const ANALYSIS_REQUESTED = parseAbiItem(
  "event AnalysisRequested(address indexed wallet, address indexed requester)"
);

// How many recent blocks to scan for unfulfilled requests.
const LOOKBACK_BLOCKS = 5_000n;

async function handler() {
  if (MANTLESCOPE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "Contract address not configured" }, { status: 503 });
  }

  // 1. Discover requests from on-chain logs
  const latest = await publicClient.getBlockNumber();
  const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

  const logs = await publicClient.getLogs({
    address: MANTLESCOPE_ADDRESS,
    event: ANALYSIS_REQUESTED,
    fromBlock,
    toBlock: latest,
  });

  // Dedupe requested wallets (most recent request wins)
  const requested = Array.from(
    new Set(logs.map((l) => (l.args.wallet ?? "").toLowerCase()).filter(Boolean))
  );

  if (requested.length === 0) {
    return NextResponse.json({ scanned: 0, fulfilled: 0, message: "No pending requests" });
  }

  let walletClient;
  try {
    walletClient = getOracleWalletClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Oracle wallet init failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 503 }
    );
  }

  const fulfilled: string[] = [];

  // 2. Fulfill each request whose on-chain insight is stale/missing
  for (const wallet of requested) {
    try {
      const existing = await publicClient.readContract({
        address: MANTLESCOPE_ADDRESS,
        abi: MANTLESCOPE_ABI,
        functionName: "getWalletInsight",
        args: [wallet as `0x${string}`],
      });

      // Skip if fulfilled within the last hour (avoid redundant writes/gas)
      const updatedAt = Number(existing.updatedAt);
      const ageSeconds = Math.floor(Date.now() / 1000) - updatedAt;
      if (updatedAt > 0 && ageSeconds < 3600) continue;

      const activity = await getWalletActivity(wallet);
      const insight = await analyzeWallet(activity);
      const summaryHash = keccak256(toBytes(insight.summary));

      const hash = await walletClient.writeContract({
        address: MANTLESCOPE_ADDRESS,
        abi: MANTLESCOPE_ABI,
        functionName: "writeWalletInsight",
        args: [
          wallet as `0x${string}`,
          insight.riskScore,
          BEHAVIOR_TAG_ID[insight.behaviorTag],
          summaryHash,
          insight.summary,
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Bump ERC-8004 reputation (non-fatal)
      if (AGENT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
        void walletClient
          .writeContract({
            address: AGENT_CONTRACT_ADDRESS,
            abi: AGENT_ABI,
            functionName: "incrementAchievement",
            args: [0n],
          })
          .catch(() => {});
      }

      void pushOracleEvent({
        type: "onchain_write",
        address: wallet,
        riskScore: insight.riskScore,
        behaviorTag: insight.behaviorTag,
        summary: `Fulfilled on-chain request — risk ${insight.riskScore}, tag: ${insight.behaviorTag}`,
        txHash: hash,
      });

      fulfilled.push(wallet);
    } catch (e) {
      console.error(`[fulfill] failed for ${wallet}:`, e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({ scanned: requested.length, fulfilled: fulfilled.length, wallets: fulfilled });
}

// GET for manual/cron invocation (e.g. QStash schedule or a button on /oracle).
export async function GET(_req: NextRequest) {
  return handler();
}

export async function POST(_req: NextRequest) {
  return handler();
}
