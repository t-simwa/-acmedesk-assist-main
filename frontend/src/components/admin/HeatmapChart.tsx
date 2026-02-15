import { useMemo } from "react";

interface HeatmapDataPoint {
  day: string;
  hour: number;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  title?: string;
}

export function HeatmapChart({ data, title }: HeatmapChartProps) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  const getCellValue = (day: string, hour: number): number => {
    const point = data.find((d) => d.day === day && d.hour === hour);
    return point?.value || 0;
  };

  const getIntensity = (value: number): string => {
    if (value === 0) return "bg-muted";
    const intensity = value / maxValue;
    if (intensity < 0.2) return "bg-blue-200";
    if (intensity < 0.4) return "bg-blue-400";
    if (intensity < 0.6) return "bg-blue-600";
    if (intensity < 0.8) return "bg-blue-800";
    return "bg-blue-950";
  };

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-medium mb-4">{title}</h4>}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-1" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
            {/* Header row */}
            <div className="text-xs text-muted-foreground font-medium text-center py-2">Hour</div>
            {days.map((day) => (
              <div key={day} className="text-xs text-muted-foreground font-medium text-center py-2">
                {day}
              </div>
            ))}

            {/* Data rows */}
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="text-xs text-muted-foreground text-right pr-2 py-1">{hour}:00</div>
                {days.map((day) => {
                  const value = getCellValue(day, hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`${getIntensity(value)} rounded transition-all hover:opacity-80 cursor-pointer relative group`}
                      style={{ minHeight: "24px" }}
                      title={`${day} ${hour}:00 - ${value} conversations`}
                    >
                      {value > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100">
                          {value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-muted rounded"></div>
          <div className="w-4 h-4 bg-blue-200 rounded"></div>
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <div className="w-4 h-4 bg-blue-800 rounded"></div>
          <div className="w-4 h-4 bg-blue-950 rounded"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
