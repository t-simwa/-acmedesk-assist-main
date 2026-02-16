import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("reduce-motion")
  );
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    animationDuration?: number;
  }
>(({ className, value, animationDuration = 800, ...props }, ref) => {
  const [animatedValue, setAnimatedValue] = React.useState(0);
  const previousValueRef = React.useRef(value || 0);

  React.useEffect(() => {
    // Only animate if value has changed
    if (value !== undefined && value !== previousValueRef.current) {
      const startValue = previousValueRef.current;
      const endValue = value;

      // If reduced motion is preferred, set value immediately
      if (prefersReducedMotion()) {
        setAnimatedValue(endValue);
        previousValueRef.current = endValue;
        return;
      }

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Easing function (ease-out cubic) for smooth animation
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(progress);

        const currentValue = startValue + (endValue - startValue) * easedProgress;
        setAnimatedValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Ensure we end exactly at target value
          setAnimatedValue(endValue);
          previousValueRef.current = endValue;
        }
      };

      requestAnimationFrame(animate);
    } else if (value !== undefined) {
      setAnimatedValue(value);
    }
  }, [value, animationDuration]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary"
        style={{ 
          transform: `translateX(-${100 - (animatedValue || 0)}%)`
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
