/**
 * Shared token price fetcher.
 *
 * Single source of truth for USD prices used across:
 *   - bridge inflow tracker
 *   - anomaly detection
 *
 * Strategy:
 *   1. Try Redis cache (TTL 5 min)
 *   2. Try CoinGecko free API (no key required)
 *   3. Fall back to last-known prices (hardcoded sane defaults)
 */

import { cacheGet, cacheSet } from "@/lib/cache/redis";

const CACHE_KEY = "mantle:prices:v1";
const TTL_SECONDS = 300;

/** CoinGecko coin IDs for the tokens we track */
const COINGECKO_IDS = {
  ethereum: "WETH",
  bitcoin: "WBTC",
  mantle: "MNT",
  "tether": "USDT",
  "usd-coin": "USDC",
} as const;

export type TokenSymbol = "WETH" | "WBTC" | "MNT" | "WMNT" | "USDT" | "USDC";

/** Hardcoded fallback if both cache and CoinGecko fail. Updated periodically. */
const FALLBACK_PRICES: Record<TokenSymbol, number> = {
  WETH: 2500,
  WBTC: 60000,
  MNT:  0.85,
  WMNT: 0.85, // same as MNT
  USDT: 1,
  USDC: 1,
};

export interface TokenPrices {
  WETH: number;
  WBTC: number;
  MNT: number;
  WMNT: number;
  USDT: number;
  USDC: number;
  fetchedAt: string;
  source: "cache" | "coingecko" | "fallback";
}

/**
 * Returns USD prices for tracked tokens. Always succeeds (falls back to defaults).
 */
export async function getTokenPrices(): Promise<TokenPrices> {
  // 1. Cache hit
  const cached = await cacheGet<TokenPrices>(CACHE_KEY);
  if (cached) return { ...cached, source: "cache" };

  // 2. CoinGecko fetch
  try {
    const ids = Object.keys(COINGECKO_IDS).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: TTL_SECONDS } }
    );

    if (res.ok) {
      const data = (await res.json()) as Record<string, { usd: number }>;
      const prices: TokenPrices = {
        WETH: data.ethereum?.usd ?? FALLBACK_PRICES.WETH,
        WBTC: data.bitcoin?.usd ?? FALLBACK_PRICES.WBTC,
        MNT:  data.mantle?.usd ?? FALLBACK_PRICES.MNT,
        WMNT: data.mantle?.usd ?? FALLBACK_PRICES.WMNT,
        USDT: data.tether?.usd ?? 1,
        USDC: data["usd-coin"]?.usd ?? 1,
        fetchedAt: new Date().toISOString(),
        source: "coingecko",
      };
      await cacheSet(CACHE_KEY, prices, TTL_SECONDS);
      return prices;
    }
  } catch {
    // fall through to default
  }

  // 3. Hardcoded fallback
  return {
    ...FALLBACK_PRICES,
    fetchedAt: new Date().toISOString(),
    source: "fallback",
  };
}

/** Map a token symbol (case-insensitive) to its current USD price. */
export function priceOf(symbol: string, prices: TokenPrices): number {
  const key = symbol.toUpperCase() as TokenSymbol;
  if (key in prices && typeof prices[key] === "number") {
    return prices[key] as number;
  }
  return 0;
}
