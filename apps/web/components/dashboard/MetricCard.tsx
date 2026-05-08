import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "flat" | null;
}

export function MetricCard({ title, value, sub, icon: Icon, trend }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider font-medium">{title}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {sub && (
          <div
            className={cn(
              "text-xs mt-0.5",
              trend === "up" && "text-green-400",
              trend === "down" && "text-red-400",
              (!trend || trend === "flat") && "text-muted-foreground"
            )}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
