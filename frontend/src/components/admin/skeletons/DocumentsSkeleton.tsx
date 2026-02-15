/**
 * DocumentsSkeleton Component
 * 
 * Loading skeleton for the Documents page that mimics the structure of:
 * - Page header (title + description)
 * - Search and filter bar
 * - Documents table (header + rows)
 * - Upload area (if visible)
 */

import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Search and filter bar skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-background rounded-xl border border-border shadow-soft-sm overflow-hidden">
        {/* Table header */}
        <div className="border-b border-border">
          <div className="grid grid-cols-[auto_1fr_120px_120px_140px_100px_80px] gap-4 px-6 py-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Table rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_120px_120px_140px_100px_80px] gap-4 px-6 py-4"
              role="status"
              aria-label="Loading document row"
            >
              <Skeleton className="h-4 w-4" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
