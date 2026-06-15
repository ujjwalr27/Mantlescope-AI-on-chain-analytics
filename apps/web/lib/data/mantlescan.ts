import { labelAddress, type LabeledAddress } from "./labels";

const BASE = "https://api.etherscan.io/v2/api";
const API_KEY = process.env.ETHERSCAN_API_KEY ?? "";
// Use DATA_CHAIN_ID for fetching on-chain data (mainnet = richer data)
// Falls back to NEXT_PUBLIC_CHAIN_ID, then defaults to mainnet
const CHAIN_ID = process.env.DATA_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? "5000";

async function fetchEtherscan<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE);
  url.searchParams.set("chainid", CHAIN_ID);
  url.searchParams.set("apikey", API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Mantlescan HTTP ${res.status}`);

  const json = await res.json();
  if (json.status === "0" && json.message !== "No transactions found") {
    throw new Error(`Mantlescan API error: ${json.result}`);
  }
  return json.result as T;
}

export interface NormalTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  functionName: string;
  isError: string;
}

export interface TokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  timeStamp: string;
  tokenDecimal: string;
}

export async function getTransactions(address: string, page = 1, offset = 100): Promise<NormalTx[]> {
  try {
    return await fetchEtherscan<NormalTx[]>({
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: String(page),
      offset: String(offset),
      sort: "desc",
    });
  } catch {
    return [];
  }
}

export async function getTokenTransfers(address: string, page = 1, offset = 100): Promise<TokenTx[]> {
  try {
    return await fetchEtherscan<TokenTx[]>({
      module: "account",
      action: "tokentx",
      address,
      startblock: "0",
      endblock: "99999999",
      page: String(page),
      offset: String(offset),
      sort: "desc",
    });
  } catch {
    return [];
  }
}

export async function getNativeBalance(address: string): Promise<string> {
  try {
    return await fetchEtherscan<string>({
      module: "account",
      action: "balance",
      address,
      tag: "latest",
    });
  } catch {
    return "0";
  }
}

export interface WalletActivity {
  address: string;
  txCount: number;
  uniqueCounterparties: number;
  netMNTFlow: bigint;
  protocols: string[];
  recentTxs: NormalTx[];
  recentTokenTxs: TokenTx[];
  /** Known on-chain entities this wallet interacted with (bridge, pools, tokens…). */
  labeledCounterparties: LabeledAddress[];
  /** Label for the analyzed address itself, if it is a known entity. */
  selfLabel: LabeledAddress | null;
}

/**
 * Discover top active wallets on Mantle by scanning recent blocks.
 * Queries the last N transactions across 4 major tokens in parallel
 * (USDC, USDT, WETH, WMNT) and merges frequency maps so whales active
 * in any token are included — not just USDC holders.
 */
export async function getTopActiveWallets(limit = 20): Promise<string[]> {
  // Key tokens on Mantle Mainnet (L2 addresses)
  const TOKENS = [
    { address: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9", symbol: "USDC" },
    { address: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE", symbol: "USDT" },
    { address: "0xdEAddEaDdeadDEadDEADDEaddEADDEadDEADDEad", symbol: "WETH" },
    { address: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8", symbol: "WMNT" },
  ];

  // Addresses to always ignore (zero address, token contracts themselves, bridge)
  const IGNORED = new Set(
    [
      "0x0000000000000000000000000000000000000000",
      "0x4200000000000000000000000000000000000010", // L2 Bridge
      ...TOKENS.map((t) => t.address.toLowerCase()),
    ].map((a) => a.toLowerCase())
  );

  try {
    // Resolve latest block once
    const blockRes = await fetchEtherscan<string>({
      module: "proxy",
      action: "eth_blockNumber",
    });
    const latestBlock = parseInt(blockRes, 16);
    const fromBlock = latestBlock - 5000; // ~7 days at ~6 s/block

    // Fetch recent transfers for all 4 tokens in parallel
    const results = await Promise.allSettled(
      TOKENS.map(async (token) => {
        const url = new URL(BASE);
        url.searchParams.set("chainid", CHAIN_ID);
        url.searchParams.set("apikey", API_KEY);
        url.searchParams.set("module", "account");
        url.searchParams.set("action", "tokentx");
        url.searchParams.set("contractaddress", token.address);
        url.searchParams.set("startblock", String(fromBlock));
        url.searchParams.set("endblock", String(latestBlock));
        url.searchParams.set("page", "1");
        url.searchParams.set("offset", "200");
        url.searchParams.set("sort", "desc");

        const res = await fetch(url.toString(), { next: { revalidate: 0 } });
        const json = await res.json();
        return Array.isArray(json.result)
          ? (json.result as Array<{ from: string; to: string }>)
          : [];
      })
    );

    // Merge frequency maps across all tokens
    const freq = new Map<string, number>();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const tx of result.value) {
        const from = tx.from.toLowerCase();
        const to = tx.to.toLowerCase();
        if (!IGNORED.has(from) && !from.startsWith("0x000000")) {
          freq.set(from, (freq.get(from) ?? 0) + 1);
        }
        if (!IGNORED.has(to) && !to.startsWith("0x000000")) {
          freq.set(to, (freq.get(to) ?? 0) + 1);
        }
      }
    }

    if (freq.size === 0) throw new Error("No addresses found");

    // Sort by frequency, return top addresses
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([addr]) => addr);
  } catch {
    // Fallback to known active Mantle addresses
    return [
      "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
      "0x4200000000000000000000000000000000000006",
      "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
      "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
      "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
    ];
  }
}

export async function getWalletActivity(address: string): Promise<WalletActivity> {
  const [txs, tokenTxs] = await Promise.all([
    getTransactions(address, 1, 100),
    getTokenTransfers(address, 1, 100),
  ]);

  const counterparties = new Set<string>();
  let netMNTFlow = 0n;
  const protocols = new Set<string>();

  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;

  for (const tx of txs) {
    if (parseInt(tx.timeStamp) < sevenDaysAgo) continue;
    if (tx.from.toLowerCase() === address.toLowerCase()) {
      counterparties.add(tx.to.toLowerCase());
      netMNTFlow -= BigInt(tx.value);
    } else {
      counterparties.add(tx.from.toLowerCase());
      netMNTFlow += BigInt(tx.value);
    }
    if (tx.functionName) protocols.add(tx.to.toLowerCase());
  }

  // Fold in token-transfer counterparties too — token flows reveal protocol/bridge
  // interactions that native txlist misses (e.g. an ERC-20 deposit to the bridge).
  for (const t of tokenTxs) {
    if (parseInt(t.timeStamp) < sevenDaysAgo) continue;
    counterparties.add(
      t.from.toLowerCase() === address.toLowerCase() ? t.to.toLowerCase() : t.from.toLowerCase()
    );
  }

  const labeledCounterparties = Array.from(counterparties)
    .map((addr) => {
      const label = labelAddress(addr);
      return label ? { address: addr, ...label } : null;
    })
    .filter((x): x is LabeledAddress => x !== null);

  const self = labelAddress(address);

  return {
    address,
    txCount: txs.length,
    uniqueCounterparties: counterparties.size,
    netMNTFlow,
    protocols: Array.from(protocols).slice(0, 10),
    recentTxs: txs.slice(0, 20),
    recentTokenTxs: tokenTxs.slice(0, 20),
    labeledCounterparties,
    selfLabel: self ? { address: address.toLowerCase(), ...self } : null,
  };
}
