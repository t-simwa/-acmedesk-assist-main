/**
 * LeadSourceDonut -- 7.3.6
 *
 * Donut chart showing lead source breakdown by channel with custom inline legend.
 * Redesigned with proper Tailwind design tokens and theme-aware recharts colors.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { LeadSourceItem } from "@/lib/api";

interface LeadSourceDonutProps {
  data: LeadSourceItem[];
  className?: string;
}

/** Semantic channel colors -- these are fixed brand colors that don't change with theme */
const CHANNEL_COLORS: Record<string, string> = {
  web: "#3b82f6",
  whatsapp: "#10B981",
  instagram: "#f59e0b",
  facebook: "#7c3aed",
  email: "#ef4444",
  sms: "#ec4899",
};

const DEFAULT_COLORS = ["#3b82f6", "#10B981", "#f59e0b", "#7c3aed", "#ef4444", "#ec4899"];

export function LeadSourceDonut({ data, className }: LeadSourceDonutProps) {
  const chartData = data.map((item, i) => ({
    name: item.channel.charAt(0).toUpperCase() + item.channel.slice(1),
    value: item.count,
    percentage: item.percentage,
    color: CHANNEL_COLORS[item.channel.toLowerCase()] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
        Lead Sources by Channel
      </h3>

      <div className="h-[200px] sm:h-[210px]">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationDuration={500}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: 600,
                  fontFamily: "Plus Jakarta Sans",
                }}
                itemStyle={{
                  color: "hsl(var(--muted-foreground))",
                  fontFamily: "Geist Mono",
                }}
                formatter={(value: number, name: string) => {
                  const item = chartData.find((d) => d.name === name);
                  return [`${value} (${item?.percentage ?? 0}%)`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description text-muted-foreground">
              No lead source data available
            </p>
          </div>
        )}
      </div>

      {/* Custom inline legend */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-description text-muted-foreground">
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
