import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressLoaderProps {
  /** Progress value (0-100) */
  value?: number;
  /** Loading message to display */
  message?: string;
  /** Show spinner alongside progress */
  showSpinner?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom className */
  className?: string;
  /** Indeterminate loading (no progress value) */
  indeterminate?: boolean;
}

/**
 * ProgressLoader component that shows actual progress (not just spinners)
 * Provides better user feedback by showing progress percentage
 */
export function ProgressLoader({
  value,
  message,
  showSpinner = false,
  size = "md",
  className,
  indeterminate = false,
}: ProgressLoaderProps) {
  const displayValue = indeterminate ? undefined : (value ?? 0);
  const clampedValue = displayValue !== undefined ? Math.min(100, Math.max(0, displayValue)) : undefined;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const spinnerSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {showSpinner && (
        <Loader2
          size={spinnerSizes[size]}
          className="animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      )}
      
      {!indeterminate && clampedValue !== undefined && (
        <div className="w-full max-w-xs space-y-2">
          <Progress value={clampedValue} className="h-2" />
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{message || "Loading..."}</span>
            <span className="font-medium">{Math.round(clampedValue)}%</span>
          </div>
        </div>
      )}

      {indeterminate && (
        <div className="w-full max-w-xs space-y-2">
          <Progress value={undefined} className="h-2" />
          <div className={cn("text-center text-muted-foreground", sizeClasses[size])}>
            {message || "Loading..."}
          </div>
        </div>
      )}

      {!indeterminate && clampedValue === undefined && (
        <div className={cn("text-center text-muted-foreground", sizeClasses[size])}>
          {message || "Loading..."}
        </div>
      )}
    </div>
  );
}
