import { z } from "zod";

export const WalletInsightSchema = z.object({
  riskScore: z.number().int().min(0).max(100),
  behaviorTag: z.enum(["unknown", "accumulator", "trader", "bot", "whale"]),
  summary: z.string().max(280),
  reasoning: z.string(),
});
export type WalletInsightResult = z.infer<typeof WalletInsightSchema>;

export const BEHAVIOR_TAG_ID: Record<WalletInsightResult["behaviorTag"], number> = {
  unknown: 0,
  accumulator: 1,
  trader: 2,
  bot: 3,
  whale: 4,
};

export const ProtocolHealthSchema = z.object({
  protocols: z.array(
    z.object({
      name: z.string(),
      healthScore: z.number().int().min(0).max(100),
      summary: z.string().max(280),
    })
  ),
  ecosystemSummary: z.string().max(500),
});
export type ProtocolHealthResult = z.infer<typeof ProtocolHealthSchema>;

export const AnomalySchema = z.object({
  anomalies: z.array(
    z.object({
      address: z.string(),
      description: z.string().max(280),
      severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    })
  ),
});
export type AnomalyResult = z.infer<typeof AnomalySchema>;

export const TrendPredictionSchema = z.object({
  direction: z.enum(["up", "flat", "down"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().max(400),
});
export type TrendPredictionResult = z.infer<typeof TrendPredictionSchema>;
