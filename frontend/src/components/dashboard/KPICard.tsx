import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: number | null;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({ label, value, trend, trendLabel, icon, className }: KPICardProps) {
  const trendDirection = trend === null || trend === undefined 
    ? null 
    : trend > 0 ? "up" 
    : trend < 0 ? "down" 
    : "neutral";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-[#1C1F26] border border-[#2D333B]",
        "p-4 sm:p-5 lg:p-6",
        "transition-all duration-200",
        "hover:border-[#3D444B] hover:bg-[#252A33]",
        "group",
        className
      )}
    >
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="mb-3" style={{ color: "#9CA3AF" }}>
            {icon}
          </div>
        )}

        {/* Label */}
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider font-heading mb-2" style={{ color: "#9CA3AF" }}>
          {label}
        </p>

        {/* Value */}
        <div className="flex items-end gap-3">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono tracking-tight" style={{ color: "#F9FAFB" }}>
            {value}
          </p>
          
          {/* Trend indicator */}
          {trend !== null && trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 pb-1",
              trendDirection === "up" && "text-emerald-500",
              trendDirection === "down" && "text-rose-500",
              trendDirection === "neutral" && "text-muted-foreground"
            )}>
              {trendDirection === "up" && <TrendingUp className="h-4 w-4" />}
              {trendDirection === "down" && <TrendingDown className="h-4 w-4" />}
              {trendDirection === "neutral" && <Minus className="h-4 w-4" />}
              <span className="text-sm font-mono font-medium">
                {trend > 0 ? "+" : ""}{trend}%
              </span>
            </div>
          )}
        </div>

        {/* Trend label */}
        {trendLabel && (
          <p className="text-xs mt-2 font-description" style={{ color: "#9CA3AF" }}>
            {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}
