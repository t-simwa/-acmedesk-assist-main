import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuccessCheckmarkProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

/**
 * Success checkmark animation component
 * Provides a smooth checkmark animation for completed actions
 */
export const SuccessCheckmark = React.forwardRef<HTMLDivElement, SuccessCheckmarkProps>(
  ({ className, size = 20, animated = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <CheckCircle2
          size={size}
          className={cn(
            "text-success",
            animated && "animate-success-checkmark"
          )}
        />
      </div>
    );
  }
);
SuccessCheckmark.displayName = "SuccessCheckmark";
