/**
 * On-chain entity labeling for Mantle addresses.
 *
 * Turns raw 0x addresses into human-readable entities (tokens, the canonical
 * bridge, lending pools, system predeploys, our own oracle). Known-entity
 * labels are the kind of "hard to obtain elsewhere" signal that turns a wallet
 * graph into actionable insight — e.g. "this whale's biggest counterparty is
 * the L2 bridge" reads very differently from a bare hex string.
 *
 * Resolution order: explicit static map → deterministic OP-stack predeploy
 * heuristic → null (unlabeled EOA / unknown contract).
 */
import {
  RESERVE_ASSETS,
  LENDLE_POOL_ADDRESS,
  AURELIUS_POOL_ADDRESS,
  MANTLESCOPE_ADDRESS,
  AGENT_CONTRACT_ADDRESS,
} from "@/lib/mantle/contracts";

export type EntityType =
  | "token"
  | "bridge"
  | "protocol"
  | "system"
  | "oracle"
  | "dex";

export interface EntityLabel {
  label: string;
  type: EntityType;
}

export interface LabeledAddress extends EntityLabel {
  address: string;
}

const ZERO = "0x0000000000000000000000000000000000000000";

// Canonical Mantle / OP-stack addresses we can assert with confidence.
const L2_STANDARD_BRIDGE = "0x4200000000000000000000000000000000000010";

const STATIC: Record<string, EntityLabel> = {};

function reg(address: string, label: string, type: EntityType) {
  if (!address || address === ZERO) return;
  STATIC[address.toLowerCase()] = { label, type };
}

// Tokens (from the single source of truth in contracts.ts)
for (const [symbol, addr] of Object.entries(RESERVE_ASSETS)) {
  reg(addr, symbol, "token");
}

// Bridge + lending protocols
reg(L2_STANDARD_BRIDGE, "L2 Standard Bridge", "bridge");
reg(LENDLE_POOL_ADDRESS, "Lendle Lending Pool", "protocol");
reg(AURELIUS_POOL_ADDRESS, "Aurelius Lending Pool", "protocol");

// Our own deployed contracts (env-driven — only registered if set)
reg(MANTLESCOPE_ADDRESS, "MantleScope Oracle", "oracle");
reg(AGENT_CONTRACT_ADDRESS, "MantleScope Agent NFT", "oracle");

// Deterministic OP-stack predeploys live under the 0x42...00XX namespace.
const PREDEPLOY_PREFIX = "0x4200000000000000000000000000000000";

/**
 * Resolve a single address to a known entity label, or null if unknown.
 */
export function labelAddress(address: string): EntityLabel | null {
  if (!address) return null;
  const a = address.toLowerCase();

  if (a === ZERO) return { label: "Null Address", type: "system" };

  const hit = STATIC[a];
  if (hit) return hit;

  // Any remaining 0x42..00XX address is a Mantle/OP system predeploy.
  if (a.startsWith(PREDEPLOY_PREFIX)) {
    return { label: "Mantle System Contract", type: "system" };
  }

  return null;
}

/**
 * Label a list of addresses, returning only the ones we could identify.
 * Deduped, preserving first-seen order.
 */
export function labelCounterparties(addresses: string[]): LabeledAddress[] {
  const seen = new Set<string>();
  const out: LabeledAddress[] = [];
  for (const addr of addresses) {
    const a = addr.toLowerCase();
    if (seen.has(a)) continue;
    seen.add(a);
    const label = labelAddress(a);
    if (label) out.push({ address: a, ...label });
  }
  return out;
}
