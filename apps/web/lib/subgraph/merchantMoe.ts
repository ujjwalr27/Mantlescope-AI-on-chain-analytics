export interface MoePair {
  id: string;
  token0Symbol: string;
  token1Symbol: string;
  reserveUSD: number;
  volumeUSD24h: number;
  txCount: number;
}

interface RawMoePair {
  id?: string;
  address?: string;
  tokenX?: { symbol?: string };
  tokenY?: { symbol?: string };
  token0Symbol?: string;
  token1Symbol?: string;
  reserveUSD?: string | number;
  tvlUSD?: string | number;
  volumeUSD?: string | number;
  volume24h?: string | number;
  txCount?: string | number;
}

export async function getMoePairs(): Promise<MoePair[]> {
  try {
    const res = await fetch("https://api.merchantmoe.com/v1/pools?orderBy=reserveUSD&limit=20", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Merchant Moe API ${res.status}`);
    const data = await res.json();
    const pairs: RawMoePair[] = (data?.data ?? data ?? []) as RawMoePair[];
    return pairs.map((p) => ({
      id: p.id ?? p.address ?? "",
      token0Symbol: p.tokenX?.symbol ?? p.token0Symbol ?? "?",
      token1Symbol: p.tokenY?.symbol ?? p.token1Symbol ?? "?",
      reserveUSD: parseFloat(String(p.reserveUSD ?? p.tvlUSD ?? "0")),
      volumeUSD24h: parseFloat(String(p.volumeUSD ?? p.volume24h ?? "0")),
      txCount: parseInt(String(p.txCount ?? "0")),
    }));
  } catch {
    return [];
  }
}
