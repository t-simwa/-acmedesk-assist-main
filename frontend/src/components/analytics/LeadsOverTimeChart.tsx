/**
 * LeadsOverTimeChart — 7.3.6
 * Line chart showing leads captured over time.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { LeadCountByDay } from "@/lib/api";

interface LeadsOverTimeChartProps {
  data: LeadCountByDay[];
  className?: string;
}

export function LeadsOverTimeChart({ data, className }: LeadsOverTimeChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={cn("rounded-xl border p-4 sm:p-5", className)}
      style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
    >
      <h3 className="text-sm font-semibold font-heading mb-4" style={{ color: "#F9FAFB" }}>
        Leads Over Time
      </h3>

      <div className="h-[200px] sm:h-[240px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ color: "#F9FAFB", fontWeight: 600, fontFamily: "Plus Jakarta Sans" }}
                itemStyle={{ color: "#10B981", fontFamily: "Geist Mono" }}
                labelFormatter={formatDate}
                formatter={(value: number) => [value, "Leads"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }}
                activeDot={{ fill: "#10B981", r: 5, stroke: "#fff", strokeWidth: 2 }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>
              No lead data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
