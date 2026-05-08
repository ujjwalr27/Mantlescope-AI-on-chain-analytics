/**
 * Unified wallet data fetcher with automatic Mantlescan → Blockscout failover.
 */
import * as mantlescan from "./mantlescan";
import * as blockscout from "./blockscout";
import type { WalletActivity } from "./mantlescan";

export type { WalletActivity, NormalTx, TokenTx } from "./mantlescan";

export async function getWalletActivity(address: string): Promise<WalletActivity> {
  try {
    return await mantlescan.getWalletActivity(address);
  } catch {
    return blockscout.getWalletActivity(address);
  }
}

export async function getNativeBalance(address: string): Promise<string> {
  try {
    return await mantlescan.getNativeBalance(address);
  } catch {
    return blockscout.getNativeBalance(address);
  }
}
