import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface ConversationOutcomesDonutProps {
  data: Array<{ outcome: string; count: number; percentage: number }>;
  className?: string;
}

/* Semantic outcome colors — these are fixed status colors, not theme-dependent */
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

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col",
      className
    )}>
      <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
        Conversation Outcomes
      </h3>

      {total > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Donut chart */}
          <div className="h-[170px] sm:h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
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
                    borderRadius: "8px",
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
                    `${value} (${chartData.find(d => d.name === name)?.percentage || 0}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom legend */}
          <div className="flex items-center justify-center gap-4 sm:gap-5 mt-2">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11px] text-muted-foreground font-description">
                  {entry.name}
                </span>
                <span className="text-[11px] font-mono font-medium text-foreground">
                  {entry.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm font-description text-muted-foreground">
            No outcome data available
          </p>
        </div>
      )}
    </div>
  );
}
