import { getGroqClient, ANALYSIS_MODEL } from "./groq";
import {
  SYSTEM_PROMPT,
  walletProfilerPrompt,
  protocolHealthPrompt,
  anomalyDetectionPrompt,
  trendPredictionPrompt,
} from "./prompts";
import {
  WalletInsightSchema,
  ProtocolHealthSchema,
  AnomalySchema,
  TrendPredictionSchema,
  type WalletInsightResult,
  type ProtocolHealthResult,
  type AnomalyResult,
  type TrendPredictionResult,
} from "./schemas";
import type { WalletActivity } from "@/lib/data/walletData";
import type { ProtocolTvl } from "@/lib/data/defillama";
import { ZodSchema } from "zod";
import { pushOracleEvent } from "@/lib/oracle-log";

async function callGroqJson<T>(prompt: string, schema: ZodSchema<T>, retries = 1): Promise<T> {
  const client = getGroqClient();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await client.chat.completions.create({
      model: ANALYSIS_MODEL,
      temperature: attempt === 0 ? 0.2 : 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    if (attempt === retries) throw new Error(`Groq response failed validation: ${parsed.error.message}`);
  }

  throw new Error("Groq analysis failed after retries");
}

export async function analyzeWallet(activity: WalletActivity): Promise<WalletInsightResult> {
  const tokenSymbols = activity.recentTokenTxs.map((t) => t.tokenSymbol);
  const prompt = walletProfilerPrompt({
    address: activity.address,
    txCount: activity.txCount,
    uniqueCounterparties: activity.uniqueCounterparties,
    netMNTFlow: activity.netMNTFlow.toString(),
    protocols: activity.protocols,
    recentTokenSymbols: tokenSymbols,
  });
  const result = await callGroqJson(prompt, WalletInsightSchema);

  // Fire-and-forget oracle log entry
  void pushOracleEvent({
    type: "ai_analysis",
    address: activity.address,
    riskScore: result.riskScore,
    behaviorTag: result.behaviorTag,
    summary: result.summary.slice(0, 120),
    model: ANALYSIS_MODEL,
  });

  return result;
}

export async function analyzeProtocols(protocols: ProtocolTvl[]): Promise<ProtocolHealthResult> {
  const prompt = protocolHealthPrompt(
    protocols.map((p) => ({
      name: p.name,
      tvl: p.tvl,
      change24h: p.change24h,
      change7d: p.change7d,
    }))
  );
  return callGroqJson(prompt, ProtocolHealthSchema);
}

export async function detectAnomalies(
  wallets: Array<{ address: string; txCount: number; volumeUSD: number; direction: string }>
): Promise<AnomalyResult> {
  if (wallets.length === 0) return { anomalies: [] };
  const prompt = anomalyDetectionPrompt(wallets);
  const result = await callGroqJson(prompt, AnomalySchema);

  void pushOracleEvent({
    type: "anomaly_scan",
    summary: `Scanned ${wallets.length} wallets — ${result.anomalies.length} anomalies found`,
    anomalyCount: result.anomalies.length,
    model: ANALYSIS_MODEL,
  });

  return result;
}

export async function predictTrend(
  tvlSeries: number[],
  volSeries: number[]
): Promise<TrendPredictionResult> {
  const prompt = trendPredictionPrompt(tvlSeries, volSeries);
  return callGroqJson(prompt, TrendPredictionSchema);
}
