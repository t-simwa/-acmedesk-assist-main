/**
 * LeadsOverTimeChart -- 7.3.6
 *
 * Area chart showing leads captured over time with gradient fill.
 * Redesigned with proper Tailwind design tokens and theme-aware recharts colors
 * using hsl(var(--...)) CSS variables.
 */

import {
  AreaChart,
  Area,
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
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
        Leads Over Time
      </h3>

      <div className="h-[200px] sm:h-[240px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--border))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--border))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
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
                  color: "#10B981",
                  fontFamily: "Geist Mono",
                }}
                labelFormatter={formatDate}
                formatter={(value: number) => [value, "Leads"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#leadsGradient)"
                dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }}
                activeDot={{ fill: "#10B981", r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description text-muted-foreground">
              No lead data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
