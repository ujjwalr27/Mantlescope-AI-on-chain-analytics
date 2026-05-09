/**
 * Mantle Bridge Inflow Tracker
 *
 * Tracks deposits from Ethereum → Mantle via the L2StandardBridge.
 * This is unique data not available on DefiLlama or any other dashboard.
 *
 * L2StandardBridge on Mantle Mainnet: 0x4200000000000000000000000000000000000010
 * When a deposit is finalized, the bridge mints/transfers tokens to the recipient.
 * We track incoming transfers TO the bridge contract area by monitoring
 * ETH deposits and ERC-20 deposits via tokentx.
 */

const BASE = "https://api.etherscan.io/v2/api";
const API_KEY = process.env.ETHERSCAN_API_KEY ?? "";
const DATA_CHAIN_ID = process.env.DATA_CHAIN_ID ?? "5000"; // Mainnet

// L2StandardBridge on Mantle Mainnet
const L2_BRIDGE = "0x4200000000000000000000000000000000000010";

// Key bridged tokens on Mantle (L2 addresses)
const BRIDGED_TOKENS: Record<string, { symbol: string; decimals: number; priceUSD: number }> = {
  "0x201eba5cc46d216ce6dc03f6a759e8e766e956ae": { symbol: "USDT", decimals: 6, priceUSD: 1 },
  "0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9": { symbol: "USDC", decimals: 6, priceUSD: 1 },
  "0xdeaddeaddeaddeaddeaddeaddeaddeaddead1111": { symbol: "WETH", decimals: 18, priceUSD: 2500 },
  "0xcabae6f6ea1ecab08ad02fe02ce9a44f09aebfa2": { symbol: "WBTC", decimals: 8, priceUSD: 60000 },
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
}

export async function getBridgeInflows(hours = 24): Promise<BridgeInflowData> {
  try {
    const sinceTs = Math.floor(Date.now() / 1000) - hours * 3600;
    const allTransfers: BridgeTransfer[] = [];

    // Fetch transfers FROM the bridge to recipients (completed deposits)
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

        for (const tx of txs) {
          const ts = parseInt(tx.timeStamp);
          if (ts < sinceTs) continue;
          // Only count outbound from bridge (these are completed deposits arriving to users)
          if (tx.from.toLowerCase() !== L2_BRIDGE.toLowerCase()) continue;

          const rawAmount = parseFloat(tx.value) / Math.pow(10, token.decimals);
          const amountUSD = rawAmount * token.priceUSD;

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

    // Also check native MNT inflows via normal tx to bridge
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

      for (const tx of nativeTxs) {
        const ts = parseInt(tx.timeStamp);
        if (ts < sinceTs) continue;
        const mntAmount = parseFloat(tx.value) / 1e18;
        const amountUSD = mntAmount * 0.85; // approximate MNT price
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
    };
  } catch {
    return {
      totalInflowUSD: 0,
      txCount: 0,
      topRecipients: [],
      recentTransfers: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
