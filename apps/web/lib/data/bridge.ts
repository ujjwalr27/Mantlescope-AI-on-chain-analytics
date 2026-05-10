/**
 * Mantle Bridge Inflow Tracker
 *
 * Tracks deposits from Ethereum → Mantle via the L2StandardBridge.
 * This is unique data not available on DefiLlama or any other dashboard.
 *
 * L2StandardBridge on Mantle Mainnet: 0x4200000000000000000000000000000000000010
 * When a deposit is finalized, the bridge transfers tokens to the recipient.
 * We track those transfers via the tokentx endpoint and aggregate by recipient.
 */

import { getTokenPrices, priceOf } from "@/lib/data/prices";

const BASE = "https://api.etherscan.io/v2/api";
const API_KEY = process.env.ETHERSCAN_API_KEY ?? "";
const DATA_CHAIN_ID = process.env.DATA_CHAIN_ID ?? "5000"; // Mainnet

// L2StandardBridge on Mantle Mainnet
const L2_BRIDGE = "0x4200000000000000000000000000000000000010";

/**
 * Key bridged tokens on Mantle (L2 addresses).
 * Addresses MUST match `lib/mantle/contracts.ts` and `lib/data/mantlescan.ts` —
 * a mismatch silently underreports inflows for that token.
 */
const BRIDGED_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "0x201eba5cc46d216ce6dc03f6a759e8e766e956ae": { symbol: "USDT", decimals: 6 },
  "0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9": { symbol: "USDC", decimals: 6 },
  "0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead": { symbol: "WETH", decimals: 18 }, // canonical Mantle WETH
  "0xcabae6f6ea1ecab08ad02fe02ce9a44f09aebfa2": { symbol: "WBTC", decimals: 8 },
};

export interface BridgeTransfer {
  hash: string;
  from: string;
  to: string;
  tokenSymbol: string;
  amountUSD: number;
  timestamp: number;
}

export interface BridgeInflowData {
  totalInflowUSD: number;
  txCount: number;
  topRecipients: Array<{ address: string; totalUSD: number; txCount: number }>;
  recentTransfers: BridgeTransfer[];
  fetchedAt: string;
  priceSource: "cache" | "coingecko" | "fallback";
}

export async function getBridgeInflows(hours = 24): Promise<BridgeInflowData> {
  try {
    // Get live token prices (cached 5 min, falls back to last-known on failure)
    const prices = await getTokenPrices();

    const sinceTs = Math.floor(Date.now() / 1000) - hours * 3600;
    const allTransfers: BridgeTransfer[] = [];

    // Fetch transfers FROM the bridge to recipients (completed deposits) for each token in parallel
    await Promise.allSettled(
      Object.entries(BRIDGED_TOKENS).map(async ([contractAddress, token]) => {
        const url = new URL(BASE);
        url.searchParams.set("chainid", DATA_CHAIN_ID);
        url.searchParams.set("apikey", API_KEY);
        url.searchParams.set("module", "account");
        url.searchParams.set("action", "tokentx");
        url.searchParams.set("contractaddress", contractAddress);
        url.searchParams.set("address", L2_BRIDGE);
        url.searchParams.set("page", "1");
        url.searchParams.set("offset", "100");
        url.searchParams.set("sort", "desc");

        const res = await fetch(url.toString(), { next: { revalidate: 0 } });
        if (!res.ok) return;

        const json = await res.json();
        const txs: Array<{
          hash: string;
          from: string;
          to: string;
          value: string;
          timeStamp: string;
        }> = Array.isArray(json.result) ? json.result : [];

        const tokenPrice = priceOf(token.symbol, prices);

        for (const tx of txs) {
          const ts = parseInt(tx.timeStamp);
          if (ts < sinceTs) continue;
          // Only count outbound from bridge (these are completed deposits arriving to users)
          if (tx.from.toLowerCase() !== L2_BRIDGE.toLowerCase()) continue;

          const rawAmount = parseFloat(tx.value) / Math.pow(10, token.decimals);
          const amountUSD = rawAmount * tokenPrice;

          if (amountUSD < 10) continue; // Skip dust

          allTransfers.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            tokenSymbol: token.symbol,
            amountUSD,
            timestamp: ts,
          });
        }
      })
    );

    // Native MNT inflows via normal tx to bridge
    const url = new URL(BASE);
    url.searchParams.set("chainid", DATA_CHAIN_ID);
    url.searchParams.set("apikey", API_KEY);
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "txlist");
    url.searchParams.set("address", L2_BRIDGE);
    url.searchParams.set("page", "1");
    url.searchParams.set("offset", "100");
    url.searchParams.set("sort", "desc");

    const nativeRes = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (nativeRes.ok) {
      const nativeJson = await nativeRes.json();
      const nativeTxs: Array<{ hash: string; from: string; to: string; value: string; timeStamp: string }> =
        Array.isArray(nativeJson.result) ? nativeJson.result : [];

      const mntPrice = priceOf("MNT", prices);

      for (const tx of nativeTxs) {
        const ts = parseInt(tx.timeStamp);
        if (ts < sinceTs) continue;
        const mntAmount = parseFloat(tx.value) / 1e18;
        const amountUSD = mntAmount * mntPrice;
        if (amountUSD < 10) continue;

        allTransfers.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          tokenSymbol: "MNT",
          amountUSD,
          timestamp: ts,
        });
      }
    }

    // Aggregate by recipient
    const recipientMap = new Map<string, { totalUSD: number; txCount: number }>();
    let totalInflowUSD = 0;

    for (const t of allTransfers) {
      totalInflowUSD += t.amountUSD;
      const key = t.to.toLowerCase();
      const existing = recipientMap.get(key) ?? { totalUSD: 0, txCount: 0 };
      recipientMap.set(key, {
        totalUSD: existing.totalUSD + t.amountUSD,
        txCount: existing.txCount + 1,
      });
    }

    const topRecipients = Array.from(recipientMap.entries())
      .sort((a, b) => b[1].totalUSD - a[1].totalUSD)
      .slice(0, 5)
      .map(([address, data]) => ({ address, ...data }));

    return {
      totalInflowUSD,
      txCount: allTransfers.length,
      topRecipients,
      recentTransfers: allTransfers
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
      fetchedAt: new Date().toISOString(),
      priceSource: prices.source,
    };
  } catch {
    return {
      totalInflowUSD: 0,
      txCount: 0,
      topRecipients: [],
      recentTransfers: [],
      fetchedAt: new Date().toISOString(),
      priceSource: "fallback",
    };
  }
}
