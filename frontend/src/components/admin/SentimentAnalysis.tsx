import { useMemo, useRef } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface SentimentData {
  positive?: number;
  negative?: number;
  neutral?: number;
  total?: number;
}

interface SentimentAnalysisProps {
  data?: SentimentData;
  title?: string;
}

export function SentimentAnalysis({ data, title }: SentimentAnalysisProps) {
  const { highContrast, reduceMotion } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const chartId = useRef(`sentiment-${Math.random().toString(36).slice(2, 11)}`);

  // Process sentiment data
  const chartData = useMemo(() => {
    if (!data || !data.total || data.total === 0) {
      // Return empty data structure
      return [];
    }

    const items = [];
    if (data.positive) {
      items.push({
        name: "Positive",
        value: data.positive,
        percentage: Math.round((data.positive / data.total!) * 100),
      });
    }
    if (data.negative) {
      items.push({
        name: "Negative",
        value: data.negative,
        percentage: Math.round((data.negative / data.total!) * 100),
      });
    }
    if (data.neutral) {
      items.push({
        name: "Neutral",
        value: data.neutral,
        percentage: Math.round((data.neutral / data.total!) * 100),
      });
    }

    return items;
  }, [data]);

  const colors = useMemo(() => {
    if (highContrast) {
      return ["#22c55e", "#ef4444", "#6b7280"]; // High contrast colors
    }
    return ["#10b981", "#ef4444", "#6b7280"]; // Green, Red, Gray
  }, [highContrast]);

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    if (!data || !data.total || data.total === 0) {
      return "Sentiment analysis data not available. This feature may not be implemented yet.";
    }
    const parts = [];
    if (data.positive) parts.push(`${data.positive} positive`);
    if (data.negative) parts.push(`${data.negative} negative`);
    if (data.neutral) parts.push(`${data.neutral} neutral`);
    return `Sentiment analysis: ${parts.join(", ")} out of ${data.total} total responses.`;
  }, [data]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "bar", chartData.length)
    : `Sentiment analysis with ${chartData.length} categories`;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-1">{data.name}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Count: </span>
            <span className="font-semibold text-foreground">{data.value}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Percentage: </span>
            <span className="font-semibold text-foreground">{data.payload.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || !data.total || data.total === 0 || chartData.length === 0) {
    return (
      <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
        {title && (
          <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
            {title}
          </h4>
        )}
        <div
          className="flex flex-col items-center justify-center h-[300px] bg-muted/30 rounded-lg p-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-muted-foreground mb-2">Sentiment analysis not available</p>
          <p className="text-xs text-muted-foreground text-center">
            This feature may not be implemented yet or no sentiment data is available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
      {title && (
        <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
          {title}
        </h4>
      )}
      <div
        className="relative w-full"
        style={{ minHeight: "300px" }}
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={!reduceMotion}
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  aria-label={`${entry.name}: ${entry.value} (${entry.percentage}%)`}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => {
                const item = chartData.find((d) => d.name === value);
                return item ? `${value} (${item.percentage}%)` : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Data table for screen readers */}
      <div className="sr-only">
        <table>
          <caption>{title || "Sentiment Analysis Data"}</caption>
          <thead>
            <tr>
              <th scope="col">Sentiment</th>
              <th scope="col">Count</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.value}</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
