import { NextRequest, NextResponse } from "next/server";
import { getOracleWalletClient, publicClient } from "@/lib/mantle/rpc";
import { MANTLESCOPE_ADDRESS, MANTLESCOPE_ABI, AGENT_CONTRACT_ADDRESS, AGENT_ABI } from "@/lib/mantle/contracts";
import { getWalletActivity } from "@/lib/data/walletData";
import { analyzeWallet } from "@/lib/ai/analyzer";
import { BEHAVIOR_TAG_ID } from "@/lib/ai/schemas";
import { keccak256, toBytes } from "viem";
import { pushOracleEvent } from "@/lib/oracle-log";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const address = body.address as string;
  const triggerTxHash = body.triggerTxHash as string | undefined;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Valid address required" }, { status: 400 });
  }

  // If this came from a user-paid on-chain trigger, log the request first
  if (triggerTxHash) {
    void pushOracleEvent({
      type: "analysis_request",
      address,
      summary: `User-triggered on-chain analysis request`,
      txHash: triggerTxHash,
    });
  }

  // Run AI analysis
  const activity = await getWalletActivity(address);
  const insight = await analyzeWallet(activity);

  const summaryHash = keccak256(toBytes(insight.summary));
  const riskScore = insight.riskScore;
  const behaviorTag = BEHAVIOR_TAG_ID[insight.behaviorTag];

  // Guard: contract address must be set
  if (MANTLESCOPE_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONTRACT_ADDRESS env var not set on server" },
      { status: 503 }
    );
  }

  // Write to contract via oracle wallet
  let walletClient;
  try {
    walletClient = getOracleWalletClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Oracle wallet init failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 503 }
    );
  }

  let hash: `0x${string}`;
  try {
    hash = await walletClient.writeContract({
      address: MANTLESCOPE_ADDRESS,
      abi: MANTLESCOPE_ABI,
      functionName: "writeWalletInsight",
      args: [address as `0x${string}`, riskScore, behaviorTag, summaryHash, insight.summary],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[onchain] writeContract failed:", msg);
    return NextResponse.json(
      { error: `Contract write failed: ${msg}` },
      { status: 500 }
    );
  }

  await publicClient.waitForTransactionReceipt({ hash });

  // Increment ERC-8004 agent achievement counter (fire-and-forget — non-blocking)
  if (AGENT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
    void walletClient.writeContract({
      address: AGENT_CONTRACT_ADDRESS,
      abi: AGENT_ABI,
      functionName: "incrementAchievement",
      args: [0n], // token #0 = MantleScope AI Oracle
    }).catch(() => {/* non-fatal */});
  }

  // Log the on-chain write to the oracle activity stream
  void pushOracleEvent({
    type: "onchain_write",
    address,
    riskScore: insight.riskScore,
    behaviorTag: insight.behaviorTag,
    summary: `Insight written on-chain — risk ${insight.riskScore}, tag: ${insight.behaviorTag}`,
    txHash: hash,
  });

  return NextResponse.json({
    success: true,
    txHash: hash,
    insight,
    explorerUrl: `https://sepolia.mantlescan.xyz/tx/${hash}`,
  });
}
