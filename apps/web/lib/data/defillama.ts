const BASE = "https://api.llama.fi";

export interface TvlPoint {
  date: number;
  tvl: number;
}

export interface ProtocolTvl {
  name: string;
  slug: string;
  tvl: number;
  change24h: number | null;
  change7d: number | null;
  tvlHistory: TvlPoint[];
}

// Maps DefiLlama slug → display name
const MANTLE_PROTOCOLS: Record<string, string> = {
  "agni-finance": "Agni Finance",
  "merchant-moe": "Merchant Moe",
  "lendle": "Lendle",
  "aurelius": "Aurelius",
  "init-capital": "INIT Capital",
};

export async function getMantleChainTvl(): Promise<TvlPoint[]> {
  const res = await fetch(`${BASE}/v2/historicalChainTvl/Mantle`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`DefiLlama chain TVL error: ${res.status}`);
  const data = await res.json();
  return (data as TvlPoint[]).slice(-14);
}

export async function getProtocolTvl(slug: string): Promise<ProtocolTvl> {
  const res = await fetch(`${BASE}/protocol/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`DefiLlama protocol error: ${res.status}`);
  const data = await res.json();

  const chainTvls = data.chainTvls?.Mantle?.tvl ?? [];
  const history: TvlPoint[] = chainTvls.slice(-14).map((p: { date: number; totalLiquidityUSD: number }) => ({
    date: p.date,
    tvl: p.totalLiquidityUSD,
  }));

  const currentTvl = history.at(-1)?.tvl ?? data.tvl ?? 0;
  const tvl7dAgo = history.at(-8)?.tvl ?? currentTvl;
  const tvl1dAgo = history.at(-2)?.tvl ?? currentTvl;

  return {
    name: MANTLE_PROTOCOLS[slug] ?? slug,
    slug,
    tvl: currentTvl,
    change24h: tvl1dAgo ? ((currentTvl - tvl1dAgo) / tvl1dAgo) * 100 : null,
    change7d: tvl7dAgo ? ((currentTvl - tvl7dAgo) / tvl7dAgo) * 100 : null,
    tvlHistory: history,
  };
}

export async function getAllProtocolTvls(): Promise<ProtocolTvl[]> {
  const results = await Promise.allSettled(
    Object.keys(MANTLE_PROTOCOLS).map((slug) => getProtocolTvl(slug))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<ProtocolTvl> => r.status === "fulfilled")
    .map((r) => r.value);
}
