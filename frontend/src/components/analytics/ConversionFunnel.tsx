/**
 * ConversionFunnel — 7.3.6
 * Funnel visualization: Conversations → Leads → Contacted → Qualified → Converted
 */

import { cn } from "@/lib/utils";
import type { ConversionFunnelItem } from "@/lib/api";

interface ConversionFunnelProps {
  data: ConversionFunnelItem[];
  className?: string;
}

const STAGE_COLORS = [
  "#4F8EF7", // Conversations — blue
  "#7C3AED", // Leads — violet
  "#F59E0B", // Contacted — amber
  "#10B981", // Qualified — emerald
  "#EF4444", // Converted — but positive, so keep emerald variant
];

const STAGE_COLORS_BG = [
  "rgba(79,142,247,0.1)",
  "rgba(124,58,237,0.1)",
  "rgba(245,158,11,0.1)",
  "rgba(16,185,129,0.1)",
  "rgba(16,185,129,0.15)",
];

export function ConversionFunnel({ data, className }: ConversionFunnelProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn("rounded-xl border p-4 sm:p-5", className)}
        style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
      >
        <h3 className="text-sm font-semibold font-heading mb-4" style={{ color: "#F9FAFB" }}>
          Conversion Funnel
        </h3>
        <div className="h-[180px] flex items-center justify-center">
          <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>
            No funnel data available
          </p>
        </div>
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div
      className={cn("rounded-xl border p-4 sm:p-5", className)}
      style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
    >
      <h3 className="text-sm font-semibold font-heading mb-5" style={{ color: "#F9FAFB" }}>
        Conversion Funnel
      </h3>

      <div className="space-y-2">
        {data.map((stage, i) => {
          const widthPct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
          const color = STAGE_COLORS[i] || STAGE_COLORS[STAGE_COLORS.length - 1];
          const bgColor = STAGE_COLORS_BG[i] || STAGE_COLORS_BG[STAGE_COLORS_BG.length - 1];

          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold font-heading" style={{ color: "#9CA3AF" }}>
                  {stage.stage}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color }}>
                    {stage.percentage.toFixed(1)}%
                  </span>
                  <span className="text-xs font-mono font-semibold" style={{ color: "#F9FAFB" }}>
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
              {/* Funnel bar — centered to create funnel shape */}
              <div
                className="h-7 rounded-md overflow-hidden relative flex items-center"
                style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="h-full rounded-md flex items-center px-3 transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: bgColor,
                    borderLeft: `3px solid ${color}`,
                    minWidth: "60px",
                  }}
                >
                  <span className="text-xs font-mono font-medium" style={{ color }}>
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>
              {/* Drop arrow */}
              {i < data.length - 1 && (
                <div className="flex items-center justify-start ml-3 mt-1 mb-0.5">
                  <span className="text-[10px] font-description" style={{ color: "#6B7280" }}>
                    ↓ {data[i + 1]?.percentage.toFixed(1)}% converted
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
