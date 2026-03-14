/**
 * Conversation Outcomes Donut Chart Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Section card styling
 * - Centered donut chart with legend
 * - Responsive sizing
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { PieChartIcon } from "lucide-react";

interface ConversationOutcomesDonutProps {
  data: Array<{ outcome: string; count: number; percentage: number }>;
  className?: string;
}

/* Semantic outcome colors — these are fixed status colors */
const OUTCOME_CONFIG: Record<string, { color: string; label: string }> = {
  resolved:  { color: "#10B981", label: "Resolved" },
  escalated: { color: "#F59E0B", label: "Escalated" },
  abandoned: { color: "#EF4444", label: "Abandoned" },
};

export function ConversationOutcomesDonut({ data, className }: ConversationOutcomesDonutProps) {
  const chartData = data.map((item) => ({
    name: OUTCOME_CONFIG[item.outcome]?.label || item.outcome,
    value: item.count,
    percentage: item.percentage,
    color: OUTCOME_CONFIG[item.outcome]?.color || "hsl(var(--muted-foreground))",
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  // Find the largest segment for center display
  const primarySegment = chartData.length > 0 
    ? chartData.reduce((prev, curr) => prev.percentage > curr.percentage ? prev : curr)
    : null;

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:border-border/80 flex flex-col h-full",
      className
    )}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
        <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
          Conversation Outcomes
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5 font-description">
          Resolution distribution
        </p>
      </div>

      {/* Chart */}
      <div className="px-4 sm:px-6 py-5 sm:py-6 flex-1 flex flex-col">
        {total > 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Donut chart with center label */}
            <div className="relative h-[160px] sm:h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={500}
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      boxShadow: "0 4px 16px hsl(var(--foreground) / 0.08)",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: 600,
                    }}
                    itemStyle={{
                      color: "hsl(var(--muted-foreground))",
                      fontFamily: "Geist Mono, monospace",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} (${chartData.find(d => d.name === name)?.percentage || 0}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center label */}
              {primarySegment && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                    {primarySegment.percentage}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-description uppercase tracking-wide">
                    {primarySegment.name}
                  </span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="w-full mt-4 space-y-2.5">
              {chartData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-muted-foreground font-description">
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-foreground">
                      {entry.value.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {entry.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No outcome data yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1 text-center">
              Outcome distribution will appear once conversations are completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
