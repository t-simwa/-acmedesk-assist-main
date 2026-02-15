/**
 * AnalyticsSkeleton Component
 * 
 * Loading skeleton for the Analytics page that mimics the structure of:
 * - Page header (title + description)
 * - Chart grid (2 charts side by side)
 * - Top Categories section (horizontal bars)
 */

import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Charts grid skeleton */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Conversations chart skeleton */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-label="Loading conversations chart">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-24 mb-6" />
          <Skeleton className="h-[200px] w-full rounded" />
        </section>

        {/* Resolution rate chart skeleton */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-label="Loading resolution rate chart">
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-24 mb-6" />
          <Skeleton className="h-[200px] w-full rounded" />
        </section>
      </div>

      {/* Top Categories section skeleton */}
      <section className="bg-background rounded-xl border border-border shadow-soft-sm" aria-label="Loading top categories">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
