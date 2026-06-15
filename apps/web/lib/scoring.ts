/**
 * MantleScope Composite Score (0–100)
 *
 * Combines six on-chain signals into a single number that captures
 * a wallet's engagement depth on Mantle. Higher = more active / influential.
 *
 * Weights:
 *   Tx volume (activity)       — 20%
 *   Counterparty diversity     — 15%
 *   Behavior classification    — 20%  (whale/trader > accumulator > bot > unknown)
 *   Token diversity            — 15%  (proxy for protocol breadth)
 *   Risk-adjusted engagement   — 20%  (lower risk + high activity → higher score)
 *   Counterparty ratio         — 10%  (unique / total txs, penalizes loop txs)
 */

export interface WalletSignals {
  txCount: number;
  uniqueCounterparties: number;
  behaviorHint: "bot" | "whale" | "trader" | "accumulator" | "unknown";
  riskScore?: number;          // 0-100 from AI (optional)
  uniqueTokenCount?: number;   // number of distinct tokens interacted with
}

/** A single weighted signal that contributes to the composite score. */
export interface ScoreComponent {
  key: string;
  label: string;
  value: number; // points earned (rounded)
  max: number;   // max points for this component
}

export interface ScoreBreakdown {
  total: number;
  components: ScoreComponent[];
}

/**
 * Full breakdown of the composite score — the per-signal points that sum to the
 * total. Surfacing this makes the MantleScore auditable rather than a black box.
 */
export function computeMantleScoreBreakdown(signals: WalletSignals): ScoreBreakdown {
  const { txCount, uniqueCounterparties, behaviorHint, riskScore, uniqueTokenCount } = signals;

  // ── Component 1: Tx volume (0–20) ────────────────────────────────────
  // cap at 500 txs → max 20 pts
  const txScore = Math.min(txCount / 500, 1) * 20;

  // ── Component 2: Counterparty diversity (0–15) ───────────────────────
  // cap at 100 unique counterparties → max 15 pts
  const cpScore = Math.min(uniqueCounterparties / 100, 1) * 15;

  // ── Component 3: Behavior classification (0–20) ──────────────────────
  const behaviorMap: Record<WalletSignals["behaviorHint"], number> = {
    whale: 20,
    trader: 16,
    accumulator: 12,
    unknown: 6,
    bot: 2,  // bots inflate tx count, penalise
  };
  const behaviorScore = behaviorMap[behaviorHint] ?? 6;

  // ── Component 4: Token diversity (0–15) ──────────────────────────────
  // cap at 5 distinct tokens → max 15 pts
  const tokenCount = uniqueTokenCount ?? Math.min(Math.ceil(uniqueCounterparties / 10), 5);
  const tokenScore = Math.min(tokenCount / 5, 1) * 15;

  // ── Component 5: Risk-adjusted engagement (0–20) ─────────────────────
  // Low risk + high activity = high score.
  // If no riskScore, assume neutral 50.
  const risk = riskScore ?? 50;
  const riskFactor = (100 - risk) / 100;  // 0..1, lower risk → higher factor
  const activityFactor = Math.min(txCount / 200, 1);
  const riskAdjustedScore = riskFactor * activityFactor * 20;

  // ── Component 6: Counterparty ratio (0–10) ───────────────────────────
  // Penalises wallets that interact with very few unique addresses
  // relative to their tx count (loop / self-transfer bots).
  const cpRatio = txCount > 0 ? uniqueCounterparties / txCount : 0;
  const cpRatioScore = Math.min(cpRatio, 1) * 10;

  const rawTotal =
    txScore + cpScore + behaviorScore + tokenScore + riskAdjustedScore + cpRatioScore;
  const total = Math.round(Math.max(0, Math.min(100, rawTotal)));

  return {
    total,
    components: [
      { key: "tx",       label: "Tx volume",            value: Math.round(txScore),           max: 20 },
      { key: "cp",       label: "Counterparty diversity", value: Math.round(cpScore),         max: 15 },
      { key: "behavior", label: "Behavior",             value: Math.round(behaviorScore),     max: 20 },
      { key: "token",    label: "Token diversity",      value: Math.round(tokenScore),        max: 15 },
      { key: "risk",     label: "Risk-adjusted activity", value: Math.round(riskAdjustedScore), max: 20 },
      { key: "ratio",    label: "Counterparty ratio",   value: Math.round(cpRatioScore),      max: 10 },
    ],
  };
}

/** Returns a score 0–100 (integer). */
export function computeMantleScore(signals: WalletSignals): number {
  return computeMantleScoreBreakdown(signals).total;
}

/** Score band label */
export function scoreBand(score: number): "elite" | "high" | "mid" | "low" {
  if (score >= 75) return "elite";
  if (score >= 50) return "high";
  if (score >= 25) return "mid";
  return "low";
}
