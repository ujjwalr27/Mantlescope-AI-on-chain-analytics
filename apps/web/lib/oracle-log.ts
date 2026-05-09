/**
 * Oracle Activity Log — Redis-backed event stream.
 *
 * Every AI analysis call and every on-chain write is recorded here so
 * the /oracle page can show a live public audit trail, demonstrating
 * "radical transparency" as described in the hackathon spec.
 */

import { Redis } from "@upstash/redis";

const LOG_KEY = "mantle:oracle:log";
const MAX_EVENTS = 100;

export type OracleEventType =
  | "ai_analysis"       // Groq was called to analyze a wallet
  | "onchain_write"     // writeWalletInsight tx confirmed
  | "anomaly_scan"      // anomaly detection batch completed
  | "analysis_request"; // AnalysisRequested event detected on-chain

export interface OracleEvent {
  id: string;           // nanoid-style unique ID
  type: OracleEventType;
  timestamp: string;    // ISO 8601
  address?: string;     // wallet address involved (if any)
  riskScore?: number;   // from AI result
  behaviorTag?: string; // from AI result
  summary?: string;     // short text (≤ 120 chars)
  txHash?: string;      // on-chain tx hash (if type === "onchain_write")
  model?: string;       // AI model used (if type === "ai_analysis")
  anomalyCount?: number;// for type === "anomaly_scan"
}

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _redis;
}

/** Push one event to the front of the log list (newest first). */
export async function pushOracleEvent(event: Omit<OracleEvent, "id" | "timestamp">): Promise<void> {
  try {
    const redis = getRedis();
    const full: OracleEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    await redis.lpush(LOG_KEY, JSON.stringify(full));
    await redis.ltrim(LOG_KEY, 0, MAX_EVENTS - 1);
  } catch {
    // Non-fatal — never let logging crash the caller
  }
}

/** Retrieve the last N events (newest first). */
export async function getOracleLog(limit = 50): Promise<OracleEvent[]> {
  try {
    const redis = getRedis();
    const raw = await redis.lrange(LOG_KEY, 0, limit - 1);
    return raw.map((item) => {
      if (typeof item === "string") return JSON.parse(item) as OracleEvent;
      return item as OracleEvent;
    });
  } catch {
    return [];
  }
}
