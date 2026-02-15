/**
 * DashboardSkeleton Component
 * 
 * Loading skeleton for the Dashboard page that mimics the structure of:
 * - Page header (title + description)
 * - Stats grid (4 stat cards)
 * - Top Questions section (list of questions)
 */

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid skeleton */}
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-background rounded-xl border border-border/40 p-8"
            role="status"
            aria-label="Loading stat card"
            aria-live="polite"
          >
            <Skeleton className="h-9 w-24 mb-3" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Top Questions section skeleton */}
      <section className="bg-background rounded-xl border border-border shadow-soft-sm" aria-label="Loading top questions">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-4 w-5" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
