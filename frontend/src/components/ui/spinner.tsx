import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  size?: number;
  variant?: "default" | "smooth";
}

/**
 * Loading spinner component with smooth animations
 * Provides a non-jarring loading indicator
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 20, variant = "smooth", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <Loader2
          size={size}
          className={cn(
            "text-muted-foreground",
            variant === "smooth" ? "animate-spinner-smooth" : "animate-spin"
          )}
        />
      </div>
    );
  }
);
Spinner.displayName = "Spinner";
