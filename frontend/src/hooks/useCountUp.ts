import { useEffect, useState, useRef } from "react";

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

/**
 * Custom hook for animating numbers counting up
 * Useful for displaying metrics with smooth counting animations
 * Respects prefers-reduced-motion accessibility preference
 * 
 * @param targetValue - The target number to count to
 * @param duration - Animation duration in milliseconds (default: 1000ms)
 * @param decimals - Number of decimal places (default: 0)
 * @param suffix - Optional suffix to append (e.g., "%", "k")
 * @returns The current animated value as a string
 * 
 * @example
 * const count = useCountUp(1250, 1000, 0, "");
 * // Returns "0" → "1250" over 1 second
 * 
 * @example
 * const percentage = useCountUp(87.5, 800, 1, "%");
 * // Returns "0.0%" → "87.5%" over 0.8 seconds
 */
export function useCountUp(
  targetValue: number,
  duration: number = 1000,
  decimals: number = 0,
  suffix: string = ""
): string {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousValueRef = useRef<number>(0);

  useEffect(() => {
    // Reset when target value changes
    if (targetValue !== previousValueRef.current) {
      previousValueRef.current = targetValue;
      
      // If reduced motion is preferred, set value immediately
      if (prefersReducedMotion()) {
        setDisplayValue(targetValue);
        return;
      }

      setDisplayValue(0);
      startTimeRef.current = null;

      // Cancel any existing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const animate = (currentTime: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = currentTime;
        }

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(progress);

        const currentValue = targetValue * easedProgress;
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Ensure we end exactly at target value
          setDisplayValue(targetValue);
        }
      };

      // Start animation
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration]);

  // Format the value with decimals and suffix
  const formattedValue = displayValue.toFixed(decimals);
  return suffix ? `${formattedValue}${suffix}` : formattedValue;
}
