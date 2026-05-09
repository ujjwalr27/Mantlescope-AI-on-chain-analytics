"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ExternalLink, Cpu, Zap, AlertTriangle, Radio } from "lucide-react";
import { formatAddress } from "@/lib/utils";
import type { OracleEvent } from "@/lib/oracle-log";

const EVENT_META: Record<
  OracleEvent["type"],
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  ai_analysis: {
    label: "AI Analysis",
    icon: Cpu,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  onchain_write: {
    label: "On-chain Write",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  anomaly_scan: {
    label: "Anomaly Scan",
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  analysis_request: {
    label: "Analysis Request",
    icon: Radio,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
};

function relativeTime(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function EventRow({ event }: { event: OracleEvent }) {
  const meta = EVENT_META[event.type] ?? EVENT_META.ai_analysis;
  const Icon = meta.icon;

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border last:border-0 animate-in fade-in slide-in-from-top-1 duration-300">
      {/* Event type badge */}
      <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-md border ${meta.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>

          {event.address && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatAddress(event.address, 6)}
            </span>
          )}

          {event.riskScore !== undefined && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
                event.riskScore > 70
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : event.riskScore > 40
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  : "bg-green-500/10 text-green-400 border-green-500/20"
              }`}
            >
              Risk {event.riskScore}
            </span>
          )}

          {event.behaviorTag && event.behaviorTag !== "unknown" && (
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border capitalize">
              {event.behaviorTag}
            </span>
          )}

          {event.anomalyCount !== undefined && (
            <span className="text-xs text-yellow-400">
              {event.anomalyCount} anomalies
            </span>
          )}
        </div>

        {event.summary && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed truncate max-w-lg">
            {event.summary}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground/60">
            {relativeTime(event.timestamp)}
          </span>

          {event.model && (
            <span className="text-xs text-muted-foreground/50">
              {event.model.split("/").pop()}
            </span>
          )}

          {event.txHash && (
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {event.txHash.slice(0, 8)}…
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
    </span>
  );
}

export default function OraclePage() {
  const { data: events = [], dataUpdatedAt } = useQuery<OracleEvent[]>({
    queryKey: ["oracle-log"],
    queryFn: () => fetch("/api/oracle/log?limit=50").then((r) => r.json()),
    refetchInterval: 5_000,
    staleTime: 0,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Oracle Activity Log</h1>
        <div className="ml-auto flex items-center gap-2">
          <PulsingDot />
          <span className="text-xs text-muted-foreground">
            Live · refreshes every 5s · last: {lastUpdated}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(EVENT_META).map(([type, meta]) => {
          const Icon = meta.icon;
          return (
            <div
              key={type}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${meta.bg}`}
            >
              <Icon className={`w-3 h-3 ${meta.color}`} />
              <span className={meta.color}>{meta.label}</span>
            </div>
          );
        })}
      </div>

      {/* Event stream */}
      <div className="rounded-xl border border-border bg-card px-5">
        {events.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3">
            <Activity className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No oracle activity yet.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Analyze a wallet in the Profiler to generate your first event.
            </p>
          </div>
        ) : (
          events.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>

      <p className="text-xs text-muted-foreground/50 mt-4 text-center">
        Showing last {events.length} events · stored in Redis · max 100 retained
      </p>
    </div>
  );
}
