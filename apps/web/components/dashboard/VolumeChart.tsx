"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VolumeBar {
  date: string;
  volumeM: number;
}

interface Props {
  data: VolumeBar[];
}

export function VolumeChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">DEX Volume (7d, $M)</h3>
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
    </div>
  );
}
