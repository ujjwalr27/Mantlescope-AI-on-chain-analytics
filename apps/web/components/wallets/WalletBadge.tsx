import { cn, BEHAVIOR_COLORS } from "@/lib/utils";

interface Props {
  tag: string;
  size?: "sm" | "md";
}

export function WalletBadge({ tag, size = "md" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium capitalize",
        size === "sm" ? "text-xs" : "text-xs",
        BEHAVIOR_COLORS[tag] ?? BEHAVIOR_COLORS.unknown
      )}
    >
      {tag}
    </span>
  );
}
