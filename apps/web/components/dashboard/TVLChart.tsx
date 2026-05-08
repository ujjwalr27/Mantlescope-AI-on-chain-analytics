"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TvlPoint } from "@/lib/data/defillama";

interface Props {
  data: TvlPoint[];
}

export function TVLChart({ data }: Props) {
  const formatted = data.map((p) => ({
    date: new Date(p.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    tvl: parseFloat((p.tvl / 1e6).toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Mantle Total TVL (14d)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6df1d8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6df1d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
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
            formatter={(v: number) => [`$${v}M`, "TVL"]}
          />
          <Area type="monotone" dataKey="tvl" stroke="#6df1d8" strokeWidth={2} fill="url(#tvlGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
