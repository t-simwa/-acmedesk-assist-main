import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * F6.1 - Page Transition Component
 * Provides smooth fade and slide animations between routes
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"entering" | "entered" | "exiting">("entered");

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("exiting");
      // Wait for exit animation to complete before changing location
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("entering");
        // Trigger enter animation on next frame
        requestAnimationFrame(() => {
          setTimeout(() => {
            setTransitionStage("entered");
          }, 10);
        });
      }, 200); // Match exit animation duration

      return () => clearTimeout(timer);
    } else if (location.pathname === displayLocation.pathname && transitionStage !== "entered") {
      // Ensure we're in entered state if paths match
      setTransitionStage("entered");
    }
  }, [location.pathname, displayLocation.pathname, transitionStage]);

  return (
    <div
      key={displayLocation.pathname}
      className={cn(
        "page-transition-wrapper",
        transitionStage === "entering" && "page-transition-entering",
        transitionStage === "entered" && "page-transition-entered",
        transitionStage === "exiting" && "page-transition-exiting",
        className
      )}
    >
      {children}
    </div>
  );
}
