import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface ConversationOutcomesDonutProps {
  data: Array<{ outcome: string; count: number; percentage: number }>;
  className?: string;
}

const COLORS: Record<string, string> = {
  resolved: "#10B981",
  escalated: "#F59E0B",
  abandoned: "#EF4444",
};

const OUTCOME_LABELS: Record<string, string> = {
  resolved: "Resolved",
  escalated: "Escalated",
  abandoned: "Abandoned",
};

export function ConversationOutcomesDonut({ data, className }: ConversationOutcomesDonutProps) {
  const chartData = data.map((item) => ({
    name: OUTCOME_LABELS[item.outcome] || item.outcome,
    value: item.count,
    percentage: item.percentage,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", className)} style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
      <h3 className="text-sm font-semibold font-heading mb-4" style={{ color: "#F9FAFB" }}>
        Conversation Outcomes
      </h3>

      <div className="h-[200px] sm:h-[220px]">
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
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name.toLowerCase()] || "#6B7280"}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ color: "#F9FAFB", fontWeight: 600 }}
                itemStyle={{ color: "#9CA3AF" }}
                formatter={(value: number, name: string) => [
                  `${value} (${chartData.find(d => d.name === name)?.percentage || 0}%)`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground font-description">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>No outcome data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
