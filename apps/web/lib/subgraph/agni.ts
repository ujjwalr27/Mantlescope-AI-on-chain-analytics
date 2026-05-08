export interface Pool {
  id: string;
  token0Symbol: string;
  token1Symbol: string;
  tvlUSD: number;
  volumeUSD24h: number;
  feeTier: number;
  txCount: number;
}

export interface RecentSwap {
  id: string;
  amountUSD: number;
  timestamp: number;
  origin: string;
  pool: { token0Symbol: string; token1Symbol: string };
}

export async function getAgniPools(): Promise<Pool[]> {
  try {
    const res = await fetch("https://agni.finance/api/v3/pools?orderBy=totalValueLockedUSD&orderDirection=desc&itemsPerPage=20", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Agni API ${res.status}`);
    const data = await res.json();
    const pools = data?.data ?? data ?? [];
    return pools.map((p: Record<string, string>) => ({
      id: p.id ?? p.address ?? "",
      token0Symbol: p.token0?.symbol ?? p.token0Symbol ?? "?",
      token1Symbol: p.token1?.symbol ?? p.token1Symbol ?? "?",
      tvlUSD: parseFloat(p.totalValueLockedUSD ?? p.tvlUSD ?? "0"),
      volumeUSD24h: parseFloat(p.volumeUSD ?? p.volume24hUSD ?? "0"),
      feeTier: parseFloat(p.feeTier ?? "0") / 10000,
      txCount: parseInt(p.txCount ?? "0"),
    }));
  } catch {
    return [];
  }
}

export async function getAgniRecentSwaps(): Promise<RecentSwap[]> {
  // Agni public API does not expose individual swaps — return empty for now
  return [];
}
