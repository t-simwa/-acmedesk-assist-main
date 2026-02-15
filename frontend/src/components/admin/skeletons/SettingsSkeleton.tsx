/**
 * SettingsSkeleton Component
 * 
 * Loading skeleton for the Settings page that mimics the structure of:
 * - Page header (title + description)
 * - Model Configuration section (form fields)
 * - Retrieval Settings section (slider)
 * - System Prompt section (textarea)
 * - Branding & Appearance section (color picker)
 */

import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-6">
        {/* Model Configuration skeleton */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-16 mb-1.5" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        </div>

        {/* Retrieval Settings skeleton */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <Skeleton className="h-5 w-40" />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-64 mt-1.5" />
          </div>
        </div>

        {/* System Prompt skeleton */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-3 w-80" />
        </div>

        {/* Branding & Appearance skeleton */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <Skeleton className="h-5 w-48" />
          <div>
            <Skeleton className="h-4 w-36 mb-1.5" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-16 rounded-lg" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-3 w-96 mt-1.5" />
          </div>
        </div>

        {/* Save button skeleton */}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
