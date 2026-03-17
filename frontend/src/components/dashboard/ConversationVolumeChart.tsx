/**
 * Conversation Volume Chart Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Section card styling with proper borders
 * - View toggle button group
 * - Responsive chart sizing
 * - Consistent typography
 */

import { useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ConversationVolumeChartProps {
  data: Array<{ date: string; count: number }>;
  compareData?: Array<{ date: string; count: number }>;
  className?: string;
}

type ViewMode = "daily" | "weekly" | "monthly";

export function ConversationVolumeChart({ data, compareData, className }: ConversationVolumeChartProps) {
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

  const processedCompareData = (() => {
    if (!compareData) return [];
    if (viewMode === "weekly") {
      const weeklyData: Record<string, number> = {};
      compareData.forEach((item) => {
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
      compareData.forEach((item) => {
        const monthKey = item.date.substring(0, 7);
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + item.count;
      });
      return Object.entries(monthlyData).map(([date, count]) => ({ date, count }));
    }
    return compareData;
  })();

  const combinedData = (() => {
    if (!compareData || compareData.length === 0) return processedData;
    const minLength = Math.min(processedData.length, processedCompareData.length);
    return processedData.slice(0, minLength).map((entry, index) => ({
      ...entry,
      compare: processedCompareData[index]?.count ?? 0,
    }));
  })();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (viewMode === "monthly") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
    if (viewMode === "weekly") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:border-border/80",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
        <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
          Conversation Volume
        </h2>
        
        {/* View toggle */}
        <div className="flex rounded-lg border bg-card overflow-hidden">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold font-heading transition-all capitalize",
                viewMode === mode 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <span className="hidden sm:inline">{mode}</span>
              <span className="sm:hidden">{mode.charAt(0).toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 sm:px-6 py-5 sm:py-6">
        <div className="h-[200px] sm:h-[240px] lg:h-[280px]">
          {combinedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="transparent"
                  tick={{ 
                    fill: "hsl(var(--muted-foreground))", 
                    fontSize: 11,
                    fontFamily: "Satoshi, sans-serif",
                  }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="transparent"
                  tick={{ 
                    fill: "hsl(var(--muted-foreground))", 
                    fontSize: 11,
                    fontFamily: "Geist Mono, monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                />
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
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontSize: "13px",
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: "hsl(var(--primary))",
                    fontFamily: "Geist Mono, monospace",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                  labelFormatter={formatTooltipDate}
                  formatter={(value: number, name: string) => {
                    if (name === "compare") {
                      return [value.toLocaleString(), "Previous" as const];
                    }
                    return [value.toLocaleString(), "Conversations"];
                  }}
                  cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#volumeGradient)"
                  dot={false}
                  activeDot={{
                    fill: "hsl(var(--primary))",
                    r: 5,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                  animationDuration={500}
                />
                {compareData && compareData.length > 0 && (
                  <Area
                    type="monotone"
                    dataKey="compare"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                    dot={false}
                    activeDot={{
                      fill: "hsl(var(--foreground))",
                      r: 4,
                      strokeWidth: 0,
                    }}
                    animationDuration={500}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                No conversation data yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Data will appear once your chatbot starts receiving messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
