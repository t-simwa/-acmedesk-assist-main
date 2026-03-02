import { useMemo, useState } from "react";
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
    <div className={cn("rounded-xl border p-4 sm:p-5", className)} style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-heading" style={{ color: "#F9FAFB" }}>
          Conversation Volume
        </h3>
        <div className="flex items-center gap-1">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode(mode)}
              className={cn(
                "h-7 px-2.5 text-xs font-medium capitalize",
              )}
              style={viewMode === mode ? { backgroundColor: "#4F8EF7", color: "#fff" } : { color: "#9CA3AF" }}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[200px] sm:h-[250px] lg:h-[300px]">
        {processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
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
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ color: "#F9FAFB", fontWeight: 600, fontFamily: "Plus Jakarta Sans" }}
                itemStyle={{ color: "#4F8EF7", fontFamily: "Geist Mono" }}
                labelFormatter={(label) => formatDate(label)}
                formatter={(value: number) => [value, "Conversations"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#4F8EF7"
                strokeWidth={2.5}
                dot={{ fill: "#4F8EF7", strokeWidth: 0, r: 4 }}
                activeDot={{ fill: "#4F8EF7", strokeWidth: 0, r: 6, stroke: "#fff", strokeWidth: 2 }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>No conversation data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
