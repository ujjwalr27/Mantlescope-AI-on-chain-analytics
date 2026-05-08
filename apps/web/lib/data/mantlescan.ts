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

  return {
    address,
    txCount: txs.length,
    uniqueCounterparties: counterparties.size,
    netMNTFlow,
    protocols: Array.from(protocols).slice(0, 10),
    recentTxs: txs.slice(0, 20),
    recentTokenTxs: tokenTxs.slice(0, 20),
  };
}
