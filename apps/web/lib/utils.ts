import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number, decimals = 2): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
  return `$${value.toFixed(decimals)}`;
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pctColor(pct: number | null): string {
  if (pct === null) return "text-muted-foreground";
  if (pct > 5) return "text-green-400";
  if (pct > 0) return "text-green-300";
  if (pct < -5) return "text-red-400";
  if (pct < 0) return "text-red-300";
  return "text-muted-foreground";
}

export const BEHAVIOR_COLORS: Record<string, string> = {
  whale: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  accumulator: "bg-green-500/20 text-green-300 border-green-500/30",
  trader: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  bot: "bg-red-500/20 text-red-300 border-red-500/30",
  unknown: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};
