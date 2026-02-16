import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuccessCheckmarkProps {
  /** Whether to show the animation */
  show?: boolean;
  /** Size of the checkmark */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export function SuccessCheckmark({
  show = true,
  size = "md",
  className,
  onComplete,
}: SuccessCheckmarkProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        if (onComplete) {
          onComplete();
        }
      }, 2000); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label="Success"
    >
      {/* Circle background */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-primary/20",
          isAnimating && "animate-ping"
        )}
      />
      <div
        className={cn(
          "relative rounded-full bg-primary flex items-center justify-center",
          sizeClasses[size],
          isAnimating && "animate-scale-in"
        )}
      >
        <svg
          className={cn(
            "text-primary-foreground",
            isAnimating && "animate-checkmark-draw"
          )}
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: isAnimating ? 100 : 0,
          }}
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    </div>
  );
}
