import type { ReactNode } from "react";

/** A grey placeholder block that pulses while content loads (the pulse stops for users who prefer reduced motion). */
export function Skeleton({ className = "", height }: { className?: string; height?: number }) {
  return <div aria-hidden style={{ height }} className={`rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800 ${className}`} />;
}

/** Wraps a skeleton so screen readers announce "Loading" once instead of reading grey boxes. */
export function LoadingRegion({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** Placeholder for list rows: a badge, two lines of text. Matches the case / task rows. */
export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <Skeleton className="h-5 w-14 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}
