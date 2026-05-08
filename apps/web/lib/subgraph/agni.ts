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

interface RawAgniPool {
  id?: string;
  address?: string;
  token0?: { symbol?: string };
  token1?: { symbol?: string };
  token0Symbol?: string;
  token1Symbol?: string;
  totalValueLockedUSD?: string | number;
  tvlUSD?: string | number;
  volumeUSD?: string | number;
  volume24hUSD?: string | number;
  feeTier?: string | number;
  txCount?: string | number;
}

export async function getAgniPools(): Promise<Pool[]> {
  try {
    const res = await fetch("https://agni.finance/api/v3/pools?orderBy=totalValueLockedUSD&orderDirection=desc&itemsPerPage=20", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Agni API ${res.status}`);
    const data = await res.json();
    const pools: RawAgniPool[] = (data?.data ?? data ?? []) as RawAgniPool[];
    return pools.map((p) => ({
      id: p.id ?? p.address ?? "",
      token0Symbol: p.token0?.symbol ?? p.token0Symbol ?? "?",
      token1Symbol: p.token1?.symbol ?? p.token1Symbol ?? "?",
      tvlUSD: parseFloat(String(p.totalValueLockedUSD ?? p.tvlUSD ?? "0")),
      volumeUSD24h: parseFloat(String(p.volumeUSD ?? p.volume24hUSD ?? "0")),
      feeTier: parseFloat(String(p.feeTier ?? "0")) / 10000,
      txCount: parseInt(String(p.txCount ?? "0")),
    }));
  } catch {
    return [];
  }
}

export async function getAgniRecentSwaps(): Promise<RecentSwap[]> {
  return [];
}
