import { useMemo, useRef, useState, useEffect } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";

interface HeatmapDataPoint {
  day: string;
  hour: number;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  title?: string;
  onCellClick?: (day: string, hour: number, value: number) => void;
}

export function HeatmapChart({ data, title, onCellClick }: HeatmapChartProps) {
  const { highContrast } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const chartId = useRef(`heatmap-${Math.random().toString(36).substr(2, 9)}`);

  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  const totalDataPoints = useMemo(() => {
    return data.length;
  }, [data]);

  const getCellValue = (day: string, hour: number): number => {
    const point = data.find((d) => d.day === day && d.hour === hour);
    return point?.value || 0;
  };

  const getIntensity = (value: number): string => {
    if (value === 0) return "bg-muted";
    const intensity = value / maxValue;
    if (intensity < 0.2) return "bg-blue-200 dark:bg-blue-900";
    if (intensity < 0.4) return "bg-blue-400 dark:bg-blue-800";
    if (intensity < 0.6) return "bg-blue-600 dark:bg-blue-700";
    if (intensity < 0.8) return "bg-blue-800 dark:bg-blue-600";
    return "bg-blue-950 dark:bg-blue-500";
  };

  const handleCellClick = (day: string, hour: number, value: number) => {
    if (onCellClick) {
      onCellClick(day, hour, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, day: string, hour: number, value: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCellClick(day, hour, value);
    }
  };

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const avg = total / (data.length || 1);
    return `Total activity: ${total} conversations. Average: ${Math.round(avg)} per time slot.`;
  }, [data]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "heatmap", totalDataPoints)
    : `Heatmap chart with ${totalDataPoints} data points`;

  return (
    <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
      {title && (
        <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
          {title}
        </h4>
      )}
      <div
        className="overflow-x-auto"
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>
        <div className="inline-block min-w-full">
          <table
            className="w-full border-collapse"
            role="grid"
            aria-label={`${title || "Heatmap"} data grid`}
          >
            <thead>
              <tr>
                <th scope="col" className="text-xs text-muted-foreground font-medium text-center py-2 w-[60px]">
                  Hour
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="text-xs text-muted-foreground font-medium text-center py-2"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <th
                    scope="row"
                    className="text-xs text-muted-foreground text-right pr-2 py-1 font-normal"
                  >
                    {hour}:00
                  </th>
                  {days.map((day) => {
                    const value = getCellValue(day, hour);
                    const cellId = `${chartId.current}-${day}-${hour}`;
                    const isFocused = focusedCell === cellId;
                    return (
                      <td key={`${day}-${hour}`} className="p-0.5">
                        <button
                          id={cellId}
                          type="button"
                          className={`${getIntensity(value)} rounded transition-all hover:opacity-80 focus:opacity-100 cursor-pointer relative group w-full min-h-[24px] focus:outline-none focus:ring-2 focus:ring-offset-1`}
                          style={{
                            minHeight: "24px",
                            focusRingColor: theme.accessibility.focusRing,
                          }}
                          onClick={() => handleCellClick(day, hour, value)}
                          onKeyDown={(e) => handleKeyDown(e, day, hour, value)}
                          onFocus={() => setFocusedCell(cellId)}
                          onBlur={() => setFocusedCell(null)}
                          aria-label={`${day} ${hour}:00, ${value} conversation${value !== 1 ? "s" : ""}`}
                          aria-describedby={value > 0 ? `${cellId}-value` : undefined}
                          tabIndex={0}
                        >
                          {value > 0 && (
                            <span
                              id={`${cellId}-value`}
                              className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                            >
                              {value}
                            </span>
                          )}
                          <span className="sr-only">
                            {value > 0
                              ? `${value} conversation${value !== 1 ? "s" : ""}`
                              : "No conversations"}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Legend */}
      <div
        className="flex items-center gap-2 mt-4 text-xs text-muted-foreground"
        role="group"
        aria-label="Intensity legend"
      >
        <span>Less</span>
        <div className="flex gap-1" aria-hidden="true">
          <div className="w-4 h-4 bg-muted rounded"></div>
          <div className="w-4 h-4 bg-blue-200 dark:bg-blue-900 rounded"></div>
          <div className="w-4 h-4 bg-blue-400 dark:bg-blue-800 rounded"></div>
          <div className="w-4 h-4 bg-blue-600 dark:bg-blue-700 rounded"></div>
          <div className="w-4 h-4 bg-blue-800 dark:bg-blue-600 rounded"></div>
          <div className="w-4 h-4 bg-blue-950 dark:bg-blue-500 rounded"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
