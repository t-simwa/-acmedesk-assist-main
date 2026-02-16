import { useMemo, useRef } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";
import { format, parseISO, differenceInMinutes } from "date-fns";

interface ConversationTimelineData {
  date: string;
  count: number;
  conversations?: Array<{
    id: string;
    started_at: string;
    last_activity_at: string;
    duration_minutes: number;
  }>;
}

interface ConversationTimelineProps {
  data: ConversationTimelineData[];
  title?: string;
}

export function ConversationTimeline({ data, title }: ConversationTimelineProps) {
  const { highContrast, reduceMotion } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const chartId = useRef(`timeline-${Math.random().toString(36).slice(2, 11)}`);

  // Process data for timeline visualization
  const timelineData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group conversations by hour for better visualization
    const hourlyData: Record<string, { hour: number; count: number; conversations: any[] }> = {};

    data.forEach((dayData) => {
      const date = parseISO(dayData.date);
      const dayKey = format(date, "yyyy-MM-dd");

      // If we have individual conversation data, use it
      if (dayData.conversations && dayData.conversations.length > 0) {
        dayData.conversations.forEach((conv) => {
          const startDate = parseISO(conv.started_at);
          const hour = startDate.getHours();
          const hourKey = `${dayKey}-${hour}`;

          if (!hourlyData[hourKey]) {
            hourlyData[hourKey] = {
              hour,
              count: 0,
              conversations: [],
            };
          }

          hourlyData[hourKey].count += 1;
          hourlyData[hourKey].conversations.push(conv);
        });
      } else {
        // Otherwise, distribute evenly across hours
        const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // Business hours
        const conversationsPerHour = Math.ceil(dayData.count / hours.length);

        hours.forEach((hour) => {
          const hourKey = `${dayKey}-${hour}`;
          hourlyData[hourKey] = {
            hour,
            count: conversationsPerHour,
            conversations: [],
          };
        });
      }
    });

    return Object.values(hourlyData).sort((a, b) => a.hour - b.hour);
  }, [data]);

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    if (data.length === 0) return "No conversation data available";
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const avgPerDay = Math.round(total / data.length);
    return `Timeline showing ${total} conversations over ${data.length} days. Average ${avgPerDay} conversations per day.`;
  }, [data]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "bar", data.length)
    : `Conversation timeline with ${data.length} data points`;

  if (data.length === 0) {
    return (
      <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
        {title && (
          <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
            {title}
          </h4>
        )}
        <div className="flex items-center justify-center h-[300px] bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">No conversation data available</p>
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
        className="relative w-full overflow-x-auto"
        style={{ minHeight: "300px" }}
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>
        <div className="inline-block min-w-full">
          {/* Timeline axis */}
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
            <div className="text-xs text-muted-foreground font-medium w-24">Time</div>
            <div className="flex-1 grid grid-cols-24 gap-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground text-center"
                  aria-hidden="true"
                >
                  {i % 3 === 0 ? `${i}:00` : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline bars */}
          <div className="space-y-2">
            {data.slice(0, 7).map((dayData, dayIndex) => {
              const date = parseISO(dayData.date);
              const dayName = format(date, "EEE, MMM dd");

              return (
                <div
                  key={dayData.date}
                  className="flex items-center gap-2"
                  role="row"
                  aria-label={`${dayName}: ${dayData.count} conversations`}
                >
                  <div className="text-xs text-foreground font-medium w-24">{dayName}</div>
                  <div className="flex-1 relative h-8 bg-muted/30 rounded">
                    {/* Distribute conversations across the day */}
                    {Array.from({ length: Math.min(dayData.count, 20) }, (_, i) => {
                      const hour = Math.floor((i / dayData.count) * 24);
                      const leftPercent = (hour / 24) * 100;
                      const width = Math.max(2, (1 / dayData.count) * 100);

                      return (
                        <div
                          key={i}
                          className="absolute h-full rounded"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${width}%`,
                            backgroundColor: theme.colors.primary,
                            minWidth: "4px",
                          }}
                          role="cell"
                          aria-label={`Conversation at ${hour}:00`}
                          tabIndex={0}
                          onFocus={(e) => {
                            e.currentTarget.style.opacity = "0.8";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        />
                      );
                    })}
                    <div className="sr-only">
                      {dayData.count} conversation{dayData.count !== 1 ? "s" : ""} on {dayName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div
        className="flex items-center gap-2 mt-4 text-xs text-muted-foreground"
        role="group"
        aria-label="Timeline legend"
      >
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: theme.colors.primary }}
          aria-hidden="true"
        />
        <span>Each bar represents a conversation</span>
      </div>
    </div>
  );
}
