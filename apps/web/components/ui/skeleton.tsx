import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={cn(
        "animate-pulse rounded-md bg-secondary/70",
        className
      )}
    />
  );
}

/** A full metric card skeleton */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** A full chart panel skeleton */
export function ChartSkeleton({ label }: { label?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <Skeleton className="h-4 w-28" />
      <div className="flex items-end gap-1 h-40">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.sin(i) * 50 + 30}%` }}
          />
        ))}
      </div>
      {label && <Skeleton className="h-3 w-16 mx-auto" />}
    </div>
  );
}

/** A wallet table row skeleton */
export function WalletRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <Skeleton className="h-4 w-36 font-mono" />
      <Skeleton className="h-4 w-12 ml-auto" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

/** Protocol card skeleton */
export function ProtocolCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mt-1" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}
