import { NextResponse } from "next/server";
import { getMantleChainTvl, getAllProtocolTvls } from "@/lib/data/defillama";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

const CACHE_KEY = "mantle:tvl:snapshot";
const TTL = 300;

export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const [chainHistory, protocols] = await Promise.all([
    getMantleChainTvl(),
    getAllProtocolTvls(),
  ]);

  const currentTvl = chainHistory.at(-1)?.tvl ?? 0;
  const tvl7dAgo = chainHistory.at(-8)?.tvl ?? currentTvl;

  const data = {
    currentTvl,
    change7d: tvl7dAgo ? ((currentTvl - tvl7dAgo) / tvl7dAgo) * 100 : 0,
    chainHistory,
    protocols,
    totalProtocolCount: protocols.length,
    fetchedAt: new Date().toISOString(),
  };

  await cacheSet(CACHE_KEY, data, TTL);
  return NextResponse.json(data);
}
