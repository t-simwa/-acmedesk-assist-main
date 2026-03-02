/**
 * LeadSourceDonut — 7.3.6
 * Donut chart showing lead source breakdown by channel.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { LeadSourceItem } from "@/lib/api";

interface LeadSourceDonutProps {
  data: LeadSourceItem[];
  className?: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  web: "#4F8EF7",
  whatsapp: "#10B981",
  instagram: "#F59E0B",
  facebook: "#7C3AED",
  email: "#EF4444",
  sms: "#EC4899",
};

const DEFAULT_COLORS = ["#4F8EF7", "#10B981", "#F59E0B", "#7C3AED", "#EF4444", "#EC4899"];

export function LeadSourceDonut({ data, className }: LeadSourceDonutProps) {
  const chartData = data.map((item, i) => ({
    name: item.channel.charAt(0).toUpperCase() + item.channel.slice(1),
    value: item.count,
    percentage: item.percentage,
    color: CHANNEL_COLORS[item.channel.toLowerCase()] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div
      className={cn("rounded-xl border p-4 sm:p-5", className)}
      style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
    >
      <h3 className="text-sm font-semibold font-heading mb-4" style={{ color: "#F9FAFB" }}>
        Lead Sources by Channel
      </h3>

      <div className="h-[200px] sm:h-[240px]">
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
                  backgroundColor: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#F9FAFB", fontWeight: 600 }}
                itemStyle={{ color: "#9CA3AF" }}
                formatter={(value: number, name: string) => {
                  const item = chartData.find((d) => d.name === name);
                  return [`${value} (${item?.percentage ?? 0}%)`, name];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-description" style={{ color: "#9CA3AF" }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>
              No lead source data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
