import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ConversationVolumeChartProps {
  data: Array<{ date: string; count: number }>;
  className?: string;
}

type ViewMode = "daily" | "weekly" | "monthly";

export function ConversationVolumeChart({ data, className }: ConversationVolumeChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");

  const processedData = useMemo(() => {
    if (viewMode === "weekly") {
      const weeklyData: Record<string, number> = {};
      data.forEach((item) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + item.count;
      });
      return Object.entries(weeklyData).map(([date, count]) => ({ date, count }));
    }
    if (viewMode === "monthly") {
      const monthlyData: Record<string, number> = {};
      data.forEach((item) => {
        const monthKey = item.date.substring(0, 7);
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.count;
      });
      return Object.entries(monthlyData).map(([date, count]) => ({ date, count }));
    }
    return data;
  }, [data, viewMode]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (viewMode === "monthly") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
    if (viewMode === "weekly") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 sm:p-5",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-heading text-foreground">
          Conversation Volume
        </h3>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "h-7 px-2.5 rounded-md text-xs font-medium capitalize transition-all duration-150 font-description",
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] sm:h-[250px] lg:h-[300px]">
        {processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                width={35}
              />
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
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                }}
                itemStyle={{
                  color: "hsl(var(--primary))",
                  fontFamily: "Geist Mono, monospace",
                }}
                labelFormatter={(label) => formatDate(label)}
                formatter={(value: number) => [value, "Conversations"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#volumeGradient)"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                activeDot={{
                  fill: "hsl(var(--primary))",
                  r: 5,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description text-muted-foreground">
              No conversation data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
