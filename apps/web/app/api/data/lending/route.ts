import { NextResponse } from "next/server";
import { publicClient } from "@/lib/mantle/rpc";
import { LENDING_POOL_ABI, LENDLE_POOL_ADDRESS, AURELIUS_POOL_ADDRESS, RESERVE_ASSETS } from "@/lib/mantle/contracts";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

const CACHE_KEY = "mantle:lending:combined";
const TTL = 600;

const RAY = 10n ** 27n;

function rayToPercent(ray: bigint): number {
  return Number((ray * 10000n) / RAY) / 100;
}

async function getReserves(poolAddress: `0x${string}`, label: string) {
  const results = await Promise.allSettled(
    Object.entries(RESERVE_ASSETS).map(async ([symbol, asset]) => {
      const data = await publicClient.readContract({
        address: poolAddress,
        abi: LENDING_POOL_ABI,
        functionName: "getReserveData",
        args: [asset],
      });
      return {
        symbol,
        liquidityRate: rayToPercent(data.currentLiquidityRate),
        variableBorrowRate: rayToPercent(data.currentVariableBorrowRate),
      };
    })
  );

  return {
    label,
    reserves: results
      .filter((r): r is PromiseFulfilledResult<{ symbol: string; liquidityRate: number; variableBorrowRate: number }> => r.status === "fulfilled")
      .map((r) => r.value),
  };
}

export async function GET() {
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const [lendle, aurelius] = await Promise.allSettled([
    getReserves(LENDLE_POOL_ADDRESS, "Lendle"),
    getReserves(AURELIUS_POOL_ADDRESS, "Aurelius"),
  ]);

  const data = {
    lendle: lendle.status === "fulfilled" ? lendle.value : { label: "Lendle", reserves: [] },
    aurelius: aurelius.status === "fulfilled" ? aurelius.value : { label: "Aurelius", reserves: [] },
  };

  await cacheSet(CACHE_KEY, data, TTL);
  return NextResponse.json(data);
}
