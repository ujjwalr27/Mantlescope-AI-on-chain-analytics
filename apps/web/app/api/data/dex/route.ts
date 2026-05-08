import { NextResponse } from "next/server";
import { getAgniPools } from "@/lib/subgraph/agni";
import { getMoePairs } from "@/lib/subgraph/merchantMoe";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

const CACHE_KEY = "mantle:dex:combined";
const TTL = 300;

async function getDefiLlamaVolume(): Promise<{ agni: number; moe: number }> {
  try {
    const [agniRes, moeRes] = await Promise.allSettled([
      fetch("https://api.llama.fi/summary/dexs/agni-finance?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume", {
        next: { revalidate: 300 },
      }),
      fetch("https://api.llama.fi/summary/dexs/merchant-moe?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume", {
        next: { revalidate: 300 },
      }),
    ]);

    const agniVol = agniRes.status === "fulfilled" && agniRes.value.ok
      ? ((await agniRes.value.json()) as { total24h?: number }).total24h ?? 0
      : 0;

    const moeVol = moeRes.status === "fulfilled" && moeRes.value.ok
      ? ((await moeRes.value.json()) as { total24h?: number }).total24h ?? 0
      : 0;

    return { agni: agniVol, moe: moeVol };
  } catch {
    return { agni: 0, moe: 0 };
  }
}

export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const [agniPools, moePairs, volumes] = await Promise.all([
    getAgniPools(),
    getMoePairs(),
    getDefiLlamaVolume(),
  ]);

  const totalAgniTvl = agniPools.reduce((s, p) => s + p.tvlUSD, 0);
  const totalMoeTvl = moePairs.reduce((s, p) => s + p.reserveUSD, 0);

  const data = {
    agni: {
      pools: agniPools.slice(0, 10),
      totalTvl: totalAgniTvl,
      totalVolume24h: volumes.agni,
    },
    merchantMoe: {
      pairs: moePairs.slice(0, 10),
      totalTvl: totalMoeTvl,
      totalVolume24h: volumes.moe,
    },
    totalDexTvl: totalAgniTvl + totalMoeTvl,
    totalDexVolume24h: volumes.agni + volumes.moe,
  };

  await cacheSet(CACHE_KEY, data, TTL);
  return NextResponse.json(data);
}
