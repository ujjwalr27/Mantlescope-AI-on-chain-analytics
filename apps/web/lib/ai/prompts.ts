export const SYSTEM_PROMPT = `You are MantleScope AI, an on-chain analytics expert for the Mantle Network (EVM L2, chainId 5000/5003).
You analyze: wallet transfer history, DEX volumes (Agni Finance, Merchant Moe), lending rates (Lendle, Aurelius, INIT Capital), and protocol TVL.
Your analysis is concise and strictly data-driven. Never invent transactions or data not provided.
When asked for JSON, output ONLY valid JSON matching the exact schema specified — no markdown, no code blocks, no extra keys.`;

export function walletProfilerPrompt(data: {
  address: string;
  txCount: number;
  uniqueCounterparties: number;
  netMNTFlow: string;
  protocols: string[];
  recentTokenSymbols: string[];
  selfLabel?: string | null;
  knownCounterparties?: string[];
}): string {
  return `Analyze this Mantle wallet and return JSON matching exactly:
{"riskScore": <0-100>, "behaviorTag": <"unknown"|"accumulator"|"trader"|"bot"|"whale">, "summary": <string max 280 chars>, "reasoning": <string>}

Wallet: ${data.address}${data.selfLabel ? ` — IDENTIFIED AS: ${data.selfLabel}` : ""}
Last 7 days on-chain activity:
- Total transactions: ${data.txCount}
- Unique counterparties: ${data.uniqueCounterparties}
- Net MNT flow (wei): ${data.netMNTFlow} ${BigInt(data.netMNTFlow) > 0 ? "(inflow)" : "(outflow)"}
- Protocols interacted: ${data.protocols.length > 0 ? data.protocols.join(", ") : "none detected"}
- Tokens transferred: ${data.recentTokenSymbols.length > 0 ? [...new Set(data.recentTokenSymbols)].join(", ") : "none"}
- Known entities interacted with: ${data.knownCounterparties && data.knownCounterparties.length > 0 ? data.knownCounterparties.join(", ") : "none identified"}

When known entities are present, cite them by name in your reasoning (e.g. bridge usage, lending-pool deposits) — these are the most informative signals. If the wallet itself is a known contract, factor that into the behavior tag.

Classification guide:
- bot: >50 unique counterparties OR very regular tx intervals
- whale: net MNT flow >100 ETH equivalent OR total txCount >200
- accumulator: consistent net inflow over the period
- trader: high txCount with small net flow (in+out roughly balanced)
- unknown: insufficient data`;
}

export function protocolHealthPrompt(protocols: Array<{
  name: string;
  tvl: number;
  change24h: number | null;
  change7d: number | null;
}>): string {
  const lines = protocols.map(
    (p) =>
      `${p.name}: TVL $${(p.tvl / 1e6).toFixed(2)}M, 24h change: ${p.change24h?.toFixed(1) ?? "N/A"}%, 7d change: ${p.change7d?.toFixed(1) ?? "N/A"}%`
  );
  return `Analyze Mantle DeFi protocol health and return JSON matching exactly:
{"protocols": [{"name": <string>, "healthScore": <0-100>, "summary": <string max 280 chars>}], "ecosystemSummary": <string max 500 chars>}

Current data:
${lines.join("\n")}

Score each protocol 0-100 based on TVL size, trend direction, and relative health.
Provide an overall 1-2 sentence ecosystem summary.`;
}

export function anomalyDetectionPrompt(
  wallets: Array<{ address: string; txCount: number; volumeUSD: number; direction: string }>
): string {
  const rows = wallets
    .map((w) => `${w.address}: ${w.txCount} txs, $${w.volumeUSD.toFixed(0)} volume, direction=${w.direction}`)
    .join("\n");

  return `Review these Mantle wallet activity snapshots (last 15 min vs 24h average) and return JSON matching exactly:
{"anomalies": [{"address": <string>, "description": <string max 280 chars>, "severity": <1|2|3>}]}

If no anomalies, return: {"anomalies": []}

Severity: 1=low (unusual but benign), 2=medium (watch), 3=high (likely manipulation or exploit)

Data:
${rows}`;
}

export function trendPredictionPrompt(tvlSeries: number[], volSeries: number[]): string {
  return `Predict the 3-day TVL trend for Mantle DeFi and return JSON matching exactly:
{"direction": <"up"|"flat"|"down">, "confidence": <0-100>, "reasoning": <string max 400 chars>}

14-day TVL series (USD millions): ${tvlSeries.map((v) => (v / 1e6).toFixed(2)).join(", ")}
14-day volume series (USD millions): ${volSeries.map((v) => (v / 1e6).toFixed(2)).join(", ")}`;
}

export function chatSystemPrompt(snapshot: {
  totalTvl: number;
  topWallets: Array<{ address: string; riskScore: number; behaviorTag: string }>;
  latestAnomaly: string | null;
  dataFreshAt: string;
}): string {
  return `${SYSTEM_PROMPT}

Current Mantle Network snapshot (as of ${snapshot.dataFreshAt}):
- Total DeFi TVL: $${(snapshot.totalTvl / 1e6).toFixed(2)}M
- Top tracked wallets: ${snapshot.topWallets.map((w) => `${w.address.slice(0, 8)}... (risk=${w.riskScore}, tag=${w.behaviorTag})`).join("; ")}
- Latest anomaly: ${snapshot.latestAnomaly ?? "none detected"}

Answer the user's question based on this data. Be concise. If asked about a specific wallet not in the snapshot, say you need to run a fresh analysis.`;
}
