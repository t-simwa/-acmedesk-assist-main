/**
 * ConversionFunnel -- 7.3.6
 *
 * Funnel visualization: Conversations -> Leads -> Contacted -> Qualified -> Converted
 * Redesigned with proper Tailwind design tokens, semantic Tailwind color classes,
 * and refined editorial SaaS aesthetic.
 */

import { cn } from "@/lib/utils";
import type { ConversionFunnelItem } from "@/lib/api";

interface ConversionFunnelProps {
  data: ConversionFunnelItem[];
  className?: string;
}

/** Semantic stage colors using Tailwind classes */
const STAGE_STYLES = [
  { bar: "bg-blue-500/10", border: "border-l-blue-500", text: "text-blue-500" },
  { bar: "bg-violet-500/10", border: "border-l-violet-500", text: "text-violet-500" },
  { bar: "bg-amber-500/10", border: "border-l-amber-500", text: "text-amber-500" },
  { bar: "bg-emerald-500/10", border: "border-l-emerald-500", text: "text-emerald-500" },
  { bar: "bg-emerald-500/15", border: "border-l-emerald-500", text: "text-emerald-500" },
];

export function ConversionFunnel({ data, className }: ConversionFunnelProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
        <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
          Conversion Funnel
        </h3>
        <div className="h-[180px] flex items-center justify-center">
          <p className="text-sm font-description text-muted-foreground">
            No funnel data available
          </p>
        </div>
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}>
      <h3 className="text-sm font-semibold font-heading text-foreground mb-5">
        Conversion Funnel
      </h3>

      <div className="space-y-2">
        {data.map((stage, i) => {
          const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
          const styles = STAGE_STYLES[i] || STAGE_STYLES[STAGE_STYLES.length - 1];

          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold font-heading text-muted-foreground">
                  {stage.stage}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-mono", styles.text)}>
                    {stage.percentage.toFixed(1)}%
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Funnel bar */}
              <div className="h-7 rounded-md overflow-hidden relative flex items-center bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded-md flex items-center px-3 transition-all duration-500 border-l-[3px]",
                    styles.bar,
                    styles.border,
                  )}
                  style={{ width: `${widthPct}%`, minWidth: "60px" }}
                >
                  <span className={cn("text-xs font-mono font-medium", styles.text)}>
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Drop arrow */}
              {i < data.length - 1 && (
                <div className="flex items-center justify-start ml-3 mt-1 mb-0.5">
                  <span className="text-[10px] font-description text-muted-foreground/70">
                    &darr; {data[i + 1]?.percentage.toFixed(1)}% converted
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
