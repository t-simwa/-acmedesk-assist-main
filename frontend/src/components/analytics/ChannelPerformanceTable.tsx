/**
 * ChannelPerformanceTable — 7.3.4
 * Table showing channel breakdown: Channel | Conversations | Resolution Rate | Avg Duration
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
    <div
      className={cn("rounded-xl border overflow-hidden", className)}
      style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#2D333B" }}>
        <h3 className="text-sm font-semibold font-heading" style={{ color: "#F9FAFB" }}>
          Channel Performance
        </h3>
        <span className="text-xs font-mono" style={{ color: "#9CA3AF" }}>
          {total.toLocaleString()} total
        </span>
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>
            No channel data available
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #2D333B" }}>
                {["Channel", "Conversations", "Resolution Rate", "Avg Duration"].map((col) => (
                  <th
                    key={col}
                    className="px-4 sm:px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading"
                    style={{ color: "#9CA3AF" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.channel}
                  className="transition-colors duration-150"
                  style={{
                    borderBottom: i < data.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#252A33")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {/* Channel */}
                  <td className="px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base" role="img" aria-label={row.channel}>
                        {row.icon}
                      </span>
                      <span className="font-medium font-description capitalize" style={{ color: "#F9FAFB" }}>
                        {row.channel}
                      </span>
                    </div>
                  </td>

                  {/* Conversations */}
                  <td className="px-4 sm:px-5 py-3">
                    <span className="font-mono font-semibold" style={{ color: "#F9FAFB" }}>
                      {row.conversations.toLocaleString()}
                    </span>
                    {total > 0 && (
                      <span className="text-xs ml-1.5 font-mono" style={{ color: "#9CA3AF" }}>
                        ({((row.conversations / total) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>

                  {/* Resolution Rate */}
                  <td className="px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 w-16 rounded-full overflow-hidden"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.resolution_rate}%`,
                            backgroundColor: row.resolution_rate >= 80 ? "#10B981" : row.resolution_rate >= 60 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <span
                        className="font-mono text-xs font-medium"
                        style={{
                          color: row.resolution_rate >= 80 ? "#10B981" : row.resolution_rate >= 60 ? "#F59E0B" : "#EF4444",
                        }}
                      >
                        {row.resolution_rate.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Avg Duration */}
                  <td className="px-4 sm:px-5 py-3">
                    <span className="font-mono font-description" style={{ color: "#9CA3AF" }}>
                      {row.avg_duration_minutes != null
                        ? `${row.avg_duration_minutes.toFixed(1)} min`
                        : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
