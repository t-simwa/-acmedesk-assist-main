/**
 * ChannelPerformanceTable -- 7.3.4
 *
 * Table showing channel breakdown: Channel | Conversations | Resolution Rate | Avg Duration
 * Redesigned with proper Tailwind design tokens, responsive card layout on mobile,
 * and progressive column disclosure.
 */

import { cn } from "@/lib/utils";
import type { ChannelConversationItem } from "@/lib/api";

interface ChannelPerformanceTableProps {
  data: ChannelConversationItem[];
  total: number;
  className?: string;
}

export function ChannelPerformanceTable({ data, total, className }: ChannelPerformanceTableProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold font-heading text-foreground">
          Channel Performance
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {total.toLocaleString()} total
        </span>
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-description text-muted-foreground">
            No channel data available
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop table (sm+) ────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Channel", "Conversations", "Resolution Rate", "Avg Duration"].map((col) => (
                    <th
                      key={col}
                      className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.map((row) => (
                  <tr
                    key={row.channel}
                    className="transition-colors duration-150 hover:bg-muted/50"
                  >
                    {/* Channel */}
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base" role="img" aria-label={row.channel}>
                          {row.icon}
                        </span>
                        <span className="font-medium font-description capitalize text-foreground">
                          {row.channel}
                        </span>
                      </div>
                    </td>

                    {/* Conversations */}
                    <td className="px-4 sm:px-5 py-3">
                      <span className="font-mono font-semibold text-foreground">
                        {row.conversations.toLocaleString()}
                      </span>
                      {total > 0 && (
                        <span className="text-xs ml-1.5 font-mono text-muted-foreground">
                          ({((row.conversations / total) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </td>

                    {/* Resolution Rate */}
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full overflow-hidden bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              row.resolution_rate >= 80
                                ? "bg-emerald-500"
                                : row.resolution_rate >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500",
                            )}
                            style={{ width: `${row.resolution_rate}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "font-mono text-xs font-medium",
                            row.resolution_rate >= 80
                              ? "text-emerald-500"
                              : row.resolution_rate >= 60
                                ? "text-amber-500"
                                : "text-rose-500",
                          )}
                        >
                          {row.resolution_rate.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Avg Duration */}
                    <td className="px-4 sm:px-5 py-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        {row.avg_duration_minutes != null
                          ? `${row.avg_duration_minutes.toFixed(1)} min`
                          : "\u2014"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card layout (<sm) ───────────────────────────── */}
          <div className="sm:hidden divide-y divide-border/50">
            {data.map((row) => (
              <div key={row.channel} className="px-4 py-3.5 space-y-2">
                {/* Channel name row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base" role="img" aria-label={row.channel}>
                      {row.icon}
                    </span>
                    <span className="font-medium font-description capitalize text-foreground text-sm">
                      {row.channel}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {row.conversations.toLocaleString()}
                    {total > 0 && (
                      <span className="text-xs ml-1 text-muted-foreground font-normal">
                        ({((row.conversations / total) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </div>

                {/* Resolution + Duration row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-full overflow-hidden bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          row.resolution_rate >= 80
                            ? "bg-emerald-500"
                            : row.resolution_rate >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500",
                        )}
                        style={{ width: `${row.resolution_rate}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs font-medium",
                        row.resolution_rate >= 80
                          ? "text-emerald-500"
                          : row.resolution_rate >= 60
                            ? "text-amber-500"
                            : "text-rose-500",
                      )}
                    >
                      {row.resolution_rate.toFixed(1)}%
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.avg_duration_minutes != null
                      ? `${row.avg_duration_minutes.toFixed(1)} min`
                      : "\u2014"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
