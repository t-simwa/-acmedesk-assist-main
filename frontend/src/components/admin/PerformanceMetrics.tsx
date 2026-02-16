import { useMemo, useRef } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PerformanceMetricsData {
  response_accuracy?: {
    average_query_time_ms?: number;
    average_sources_count?: number;
  };
  resolution_rate?: {
    resolved_via_bot?: number;
    escalated?: number;
    total?: number;
    percentage?: number;
  };
}

interface PerformanceMetricsProps {
  data?: PerformanceMetricsData;
  title?: string;
}

export function PerformanceMetrics({ data, title }: PerformanceMetricsProps) {
  const { highContrast, reduceMotion } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const chartId = useRef(`performance-${Math.random().toString(36).slice(2, 11)}`);

  // Process performance data
  const chartData = useMemo(() => {
    const metrics = [];

    // Response time metric
    if (data?.response_accuracy?.average_query_time_ms !== undefined) {
      const timeMs = data.response_accuracy.average_query_time_ms;
      const timeSeconds = (timeMs / 1000).toFixed(2);
      metrics.push({
        name: "Avg Response Time",
        value: timeMs,
        displayValue: `${timeSeconds}s`,
        unit: "ms",
        target: 2000, // 2 seconds target
        status: timeMs <= 2000 ? "good" : timeMs <= 5000 ? "warning" : "poor",
      });
    }

    // Sources count metric
    if (data?.response_accuracy?.average_sources_count !== undefined) {
      metrics.push({
        name: "Avg Sources",
        value: data.response_accuracy.average_sources_count,
        displayValue: data.response_accuracy.average_sources_count.toFixed(1),
        unit: "sources",
        target: 3,
        status: "info",
      });
    }

    // Resolution rate metric
    if (data?.resolution_rate?.percentage !== undefined) {
      metrics.push({
        name: "Resolution Rate",
        value: data.resolution_rate.percentage,
        displayValue: `${data.resolution_rate.percentage.toFixed(1)}%`,
        unit: "%",
        target: 80, // 80% target
        status:
          data.resolution_rate.percentage >= 80
            ? "good"
            : data.resolution_rate.percentage >= 60
              ? "warning"
              : "poor",
      });
    }

    return metrics;
  }, [data]);

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    if (chartData.length === 0) return "No performance metrics available";
    const metrics = chartData
      .map((m) => `${m.name}: ${m.displayValue}`)
      .join(", ");
    return `Performance metrics: ${metrics}.`;
  }, [chartData]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "bar", chartData.length)
    : `Performance metrics dashboard with ${chartData.length} metrics`;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Value: </span>
              <span className="font-semibold text-foreground">{data.displayValue}</span>
            </p>
            {data.target && (
              <p>
                <span className="text-muted-foreground">Target: </span>
                <span className="font-semibold text-foreground">{data.target}{data.unit}</span>
              </p>
            )}
            {data.status && (
              <p>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-semibold text-foreground capitalize">{data.status}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (status: string) => {
    switch (status) {
      case "good":
        return highContrast ? "#22c55e" : "#10b981";
      case "warning":
        return highContrast ? "#f59e0b" : "#f59e0b";
      case "poor":
        return highContrast ? "#ef4444" : "#ef4444";
      default:
        return theme.colors.primary;
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
        {title && (
          <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
            {title}
          </h4>
        )}
        <div className="flex items-center justify-center h-[300px] bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">No performance metrics available</p>
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
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: theme.typography.axis.fontSize,
                fill: theme.colors.axis,
                fontFamily: theme.typography.axis.fontFamily,
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: theme.typography.axis.fontSize,
                fill: theme.colors.axis,
                fontFamily: theme.typography.axis.fontFamily,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reduceMotion}
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.status)}
                  aria-label={`${entry.name}: ${entry.displayValue}`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {chartData.map((metric, index) => {
          const metricId = `${chartId.current}-metric-${index}`;
          return (
            <div
              key={metric.name}
              className="bg-background border border-border rounded-lg p-4"
              role="group"
              aria-labelledby={metricId}
            >
              <h5 id={metricId} className="text-xs font-medium text-muted-foreground mb-2">
                {metric.name}
              </h5>
              <p className="text-2xl font-bold text-foreground mb-1">{metric.displayValue}</p>
              {metric.target && (
                <p className="text-xs text-muted-foreground">
                  Target: {metric.target}
                  {metric.unit}
                </p>
              )}
              <div className="mt-2">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    metric.status === "good"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : metric.status === "warning"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : metric.status === "poor"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }`}
                >
                  {metric.status === "good"
                    ? "Good"
                    : metric.status === "warning"
                      ? "Needs Attention"
                      : metric.status === "poor"
                        ? "Poor"
                        : "Info"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data table for screen readers */}
      <div className="sr-only">
        <table>
          <caption>{title || "Performance Metrics Data"}</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Value</th>
              <th scope="col">Target</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((metric) => (
              <tr key={metric.name}>
                <td>{metric.name}</td>
                <td>{metric.displayValue}</td>
                <td>{metric.target ? `${metric.target}${metric.unit}` : "N/A"}</td>
                <td className="capitalize">{metric.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
