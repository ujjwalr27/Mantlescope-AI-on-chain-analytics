"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface VolumeBar {
  date: string;
  volumeM: number;
}

interface Props {
  data: VolumeBar[];
}

export function VolumeChart({ data }: Props) {
  // Detect "no data" — either empty array or all bars at zero (DefiLlama miss)
  const hasRealData = data.length > 0 && data.some((b) => b.volumeM > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">DEX Volume (7d, $M)</h3>
        <span className="text-[10px] text-muted-foreground/60">via DefiLlama</span>
      </div>

      {hasRealData ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7e9a" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7e9a" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}M`}
            />
            <Tooltip
              contentStyle={{ background: "#0f1e35", border: "1px solid #1e2d45", borderRadius: 8 }}
              labelStyle={{ color: "#c4d4e8" }}
              formatter={(v: number) => [`$${v}M`, "Volume"]}
            />
            <Bar dataKey="volumeM" fill="#6df1d8" radius={[4, 4, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
          <Activity className="w-6 h-6" />
          <p className="text-sm">DEX volume data unavailable</p>
          <p className="text-xs">DefiLlama API may be temporarily down</p>
        </div>
      )}
    </div>
  );
}
