"use client";

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface Anomaly {
  address: string;
  description: string;
  severity: 1 | 2 | 3;
}

interface AnomalyData {
  anomalies: Anomaly[];
  scannedAt: string;
}

const SEVERITY_COLORS: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-orange-400",
  3: "text-red-400",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

export function AnomalyCard() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        // Try to get cached anomalies first
        const res = await fetch("/api/cron/anomalies/status");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchAnomalies();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wider font-medium">Anomalies</span>
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground animate-pulse">...</div>
          <div className="text-xs text-muted-foreground mt-0.5">Scanning...</div>
        </div>
      </div>
    );
  }

  const anomalies = data?.anomalies ?? [];
  const scannedAt = data?.scannedAt;
  const timeAgo = scannedAt
    ? Math.floor((Date.now() - new Date(scannedAt).getTime()) / 60000)
    : null;

  const topAnomaly = anomalies[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider font-medium">Anomalies</span>
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div>
        <div className={`text-2xl font-bold ${anomalies.length > 0 ? "text-orange-400" : "text-foreground"}`}>
          {anomalies.length}
        </div>
        {topAnomaly ? (
          <div className={`text-xs mt-0.5 ${SEVERITY_COLORS[topAnomaly.severity]}`}>
            {SEVERITY_LABELS[topAnomaly.severity]} severity detected
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-green-400 mt-0.5">
            <CheckCircle className="w-3 h-3" />
            {timeAgo !== null ? `No anomalies · ${timeAgo}m ago` : "No anomalies detected"}
          </div>
        )}
      </div>

      {topAnomaly && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2 truncate">
          {topAnomaly.description}
        </div>
      )}

      {timeAgo !== null && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Last scan: {timeAgo < 1 ? "just now" : `${timeAgo}m ago`}
        </div>
      )}
    </div>
  );
}
