import { NextResponse } from "next/server";
import { getBridgeInflows } from "@/lib/data/bridge";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

const CACHE_KEY = "mantle:bridge:inflow24h";
const TTL = 600; // 10 min

export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const data = await getBridgeInflows(24);
  await cacheSet(CACHE_KEY, data, TTL);
  return NextResponse.json(data);
}
