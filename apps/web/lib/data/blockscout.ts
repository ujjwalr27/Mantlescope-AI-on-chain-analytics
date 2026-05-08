/**
 * Blockscout fallback — mirrors the mantlescan.ts interface.
 * No API key required; rate-limited by IP only.
 */

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID ?? "5003";
const BASE =
  CHAIN_ID === "5000"
    ? "https://explorer.mantle.xyz/api"
    : "https://explorer.sepolia.mantle.xyz/api";

async function fetchBlockscout<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Blockscout HTTP ${res.status}`);

  const json = await res.json();
  if (json.status === "0" && json.message !== "No transactions found") {
    throw new Error(`Blockscout error: ${json.result}`);
  }
  return json.result as T;
}

import type { NormalTx, TokenTx, WalletActivity } from "./mantlescan";

export async function getTransactions(address: string, page = 1, offset = 100): Promise<NormalTx[]> {
  try {
    return await fetchBlockscout<NormalTx[]>({
      module: "account",
      action: "txlist",
      address,
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
    return await fetchBlockscout<TokenTx[]>({
      module: "account",
      action: "tokentx",
      address,
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
    return await fetchBlockscout<string>({
      module: "account",
      action: "balance",
      address,
      tag: "latest",
    });
  } catch {
    return "0";
  }
}

export async function getWalletActivity(address: string): Promise<WalletActivity> {
  const { getWalletActivity: buildActivity } = await import("./mantlescan");
  // Re-use the aggregation logic but swap the fetcher
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

  void buildActivity; // suppress unused import warning
}
