import { streamText } from "ai";
import { groqProvider, ANALYSIS_MODEL } from "@/lib/ai/groq";
import { cacheGet } from "@/lib/cache/redis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Fetch rich context — live data if cache is cold
  const [tvlSnapshot, walletRows, anomalies] = await Promise.all([
    cacheGet<{ currentTvl: number; protocols: Array<{ name: string; tvl: number; change7d: number | null }> }>("mantle:tvl:snapshot").then(async (cached) => {
      if (cached) return cached;
      const { getMantleChainTvl, getAllProtocolTvls } = await import("@/lib/data/defillama");
      const [history, protocols] = await Promise.all([getMantleChainTvl().catch(() => []), getAllProtocolTvls().catch(() => [])]);
      return { currentTvl: history.at(-1)?.tvl ?? 0, protocols };
    }),
    cacheGet<Array<{ address: string; txCount: number; uniqueCounterparties: number; behaviorHint: string; mantleScore?: number }>>("mantle:wallets:top50:v2").then(async (cached) => {
      if (cached) return cached;
      const res = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/api/data/wallets`).catch(() => null);
      return res?.ok ? res.json() : [];
    }),
    cacheGet<Array<{ address: string; description: string }>>("mantle:anomalies:latest"),
  ]);

  const snap = tvlSnapshot as { currentTvl: number; protocols?: Array<{ name: string; tvl: number; change7d: number | null }> } | null;
  const protocols = snap?.protocols ?? [];
  const topWalletRows = (walletRows as Array<{ address: string; txCount: number; behaviorHint: string; mantleScore?: number }> | null) ?? [];

  const protocolLines = protocols
    .sort((a, b) => b.tvl - a.tvl)
    .map((p) => `${p.name}: TVL $${(p.tvl / 1e6).toFixed(2)}M (7d: ${p.change7d?.toFixed(1) ?? "N/A"}%)`)
    .join("; ");

  const walletLines = topWalletRows
    .slice(0, 5)
    .map((w) => `${w.address} — ${w.txCount} txs, ${w.behaviorHint}${w.mantleScore !== undefined ? `, MantleScope Score: ${w.mantleScore}/100` : ""}`)
    .join("; ");

  const systemPrompt = `You are MantleScope AI, an on-chain analytics expert for the Mantle Network (EVM L2).
You have access to live Mantle data as of ${new Date().toISOString()}.

PROTOCOL TVL DATA:
${protocolLines || "No protocol data available"}

TOP WALLETS (by activity):
${walletLines || "No wallet data available"}

ANOMALIES: ${((anomalies as Array<{ description: string }> | null) ?? [])[0]?.description ?? "None detected"}

TOTAL MANTLE DeFi TVL: $${((snap?.currentTvl ?? 0) / 1e6).toFixed(2)}M

Answer questions using this data directly. Be specific with numbers. If asked about the highest TVL protocol, reference the data above.`;

  const result = streamText({
    model: groqProvider(ANALYSIS_MODEL),
    system: systemPrompt,
    messages,
    maxTokens: 1024,
  });

  return result.toDataStreamResponse();
}
