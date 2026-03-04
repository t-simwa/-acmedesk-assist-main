/**
 * DocumentsSkeleton Component
 *
 * Loading skeleton for the Documents (Knowledge Base) page that mimics:
 * - Page header (title + description + upload button)
 * - Storage usage bar
 * - 5 KPI stat cards (Total, Ready, Processing, Archived, Failed)
 * - Upload zone (file/url tabs + drop area)
 * - Filter bar (search + selects)
 * - Data table with progressive column disclosure
 * - Mobile card list (sm:hidden)
 * - Tips section
 */

import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full animate-fade-in">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-[140px]" />
      </div>

      {/* ── STORAGE USAGE BAR ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* ── KPI STAT CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4"
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* ── UPLOAD ZONE ─────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b px-1">
          <Skeleton className="h-4 w-20 mx-3 my-3" />
          <Skeleton className="h-4 w-20 mx-3 my-3" />
        </div>
        {/* Drop area */}
        <div className="p-8 sm:p-12 flex flex-col items-center justify-center min-h-[180px]">
          <Skeleton className="h-12 w-12 rounded-lg mb-4" />
          <Skeleton className="h-4 w-56 mb-1.5" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>

      {/* ── FILTER BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full sm:w-[220px]" />
        <Skeleton className="h-9 w-[140px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>

      {/* ── DATA TABLE ──────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Desktop table */}
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-3 w-10"><Skeleton className="h-3.5 w-3.5" /></th>
              <th className="px-3 py-3 w-10"><Skeleton className="h-3 w-8" /></th>
              <th className="px-3 py-3 text-left"><Skeleton className="h-3 w-16" /></th>
              <th className="px-3 py-3 text-left"><Skeleton className="h-3 w-12" /></th>
              <th className="px-3 py-3 text-left hidden lg:table-cell"><Skeleton className="h-3 w-8" /></th>
              <th className="px-3 py-3 text-left hidden lg:table-cell"><Skeleton className="h-3 w-12" /></th>
              <th className="px-3 py-3 text-left hidden xl:table-cell"><Skeleton className="h-3 w-20" /></th>
              <th className="px-3 py-3 text-left hidden xl:table-cell"><Skeleton className="h-3 w-16" /></th>
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                <td className="px-3 py-3"><Skeleton className="h-4 w-4 rounded" /></td>
                <td className="px-3 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-3 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                <td className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-14" /></td>
                <td className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                <td className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-16" /></td>
                <td className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-14" /></td>
                <td className="px-3 py-3"><Skeleton className="h-7 w-7 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-1 shrink-0" />
              <Skeleton className="h-4 w-4 mt-0.5 shrink-0 rounded" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                </div>
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-7 w-7 shrink-0 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* ── TIPS SECTION ────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Skeleton className="h-3 w-52" />
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="h-2 w-2 mt-1 rounded-full shrink-0" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
