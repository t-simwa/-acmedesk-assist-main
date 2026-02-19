import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: () => void; // Optional action to perform before showing step
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  storageKey?: string;
}

const TOUR_STORAGE_KEY = "acmedesk-onboarding-tour-completed";

export function OnboardingTour({
  steps,
  onComplete,
  onSkip,
  storageKey = TOUR_STORAGE_KEY,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  // Check if tour was already completed
  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (completed === "true") {
      return;
    }
    // Start tour after a short delay
    const timer = setTimeout(() => {
      startTour();
    }, 500);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const startTour = useCallback(() => {
    if (steps.length === 0) return;
    setCurrentStep(0);
    setIsVisible(true);
    updateStepPosition(0);
  }, [steps]);

  const updateStepPosition = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    const step = steps[stepIndex];
    const element = document.querySelector(step.target) as HTMLElement;

    if (!element) {
      // If element not found, try to scroll to it or wait
      setTimeout(() => updateStepPosition(stepIndex), 100);
      return;
    }

    // Scroll element into view
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    // Wait for scroll to complete
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      // Store highlighted element for overlay calculation

      // Calculate tooltip position
      const position = step.position || "bottom";
      let tooltipTop = 0;
      let tooltipLeft = 0;

      switch (position) {
        case "top":
          tooltipTop = rect.top + scrollY - 20;
          tooltipLeft = rect.left + scrollX + rect.width / 2;
          break;
        case "bottom":
          tooltipTop = rect.bottom + scrollY + 20;
          tooltipLeft = rect.left + scrollX + rect.width / 2;
          break;
        case "left":
          tooltipTop = rect.top + scrollY + rect.height / 2;
          tooltipLeft = rect.left + scrollX - 20;
          break;
        case "right":
          tooltipTop = rect.top + scrollY + rect.height / 2;
          tooltipLeft = rect.right + scrollX + 20;
          break;
        case "center":
          tooltipTop = window.innerHeight / 2 + scrollY;
          tooltipLeft = window.innerWidth / 2 + scrollX;
          break;
      }

      setTooltipStyle({
        position: "absolute",
        top: `${tooltipTop}px`,
        left: `${tooltipLeft}px`,
        transform: position === "center" ? "translate(-50%, -50%)" : "translateX(-50%)",
        zIndex: 9999,
        maxWidth: "400px",
        minWidth: "300px",
      });

      setHighlightedElement(element);
    }, 300);
  }, [steps]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const nextIndex = currentStep + 1;
      const nextStep = steps[nextIndex];
      
      // Execute action if provided
      if (nextStep.action) {
        nextStep.action();
      }
      
      setCurrentStep(nextIndex);
      updateStepPosition(nextIndex);
    } else {
      completeTour();
    }
  }, [currentStep, steps, updateStepPosition]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      updateStepPosition(prevIndex);
    }
  }, [currentStep, updateStepPosition]);

  const skipTour = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
    setHighlightedElement(null);
    if (onSkip) {
      onSkip();
    }
  }, [storageKey, onSkip]);

  const completeTour = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
    setHighlightedElement(null);
    if (onComplete) {
      onComplete();
    }
  }, [storageKey, onComplete]);

  // Handle escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTour();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, skipTour]);

  // Update overlay when highlighted element changes
  useEffect(() => {
    if (!highlightedElement || !isVisible) return;

    const updateOverlay = () => {
      const rect = highlightedElement.getBoundingClientRect();
      setOverlayStyle({
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9998,
        pointerEvents: "auto",
      });
    };

    updateOverlay();
    const interval = setInterval(updateOverlay, 100); // Update frequently for scrolling

    return () => clearInterval(interval);
  }, [highlightedElement, isVisible]);

  const hasSteps = steps.length > 0;
  const step = hasSteps ? steps[currentStep] : null;
  const isFirst = currentStep === 0;
  const isLast = hasSteps ? currentStep === steps.length - 1 : true;

  return (
    <>
      {/* Overlay */}
      {isVisible && hasSteps && (
        <div
          onClick={skipTour}
          className="fixed inset-0 bg-black/50 z-[9998]"
          style={overlayStyle}
        />
      )}
      
      {/* Highlight border */}
      {isVisible && hasSteps && highlightedElement && (
        <div
          className="fixed border-4 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-[9999] pointer-events-none transition-all duration-200"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 4 + window.scrollY,
            left: highlightedElement.getBoundingClientRect().left - 4 + window.scrollX,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      {isVisible && hasSteps && step && (
        <div
          style={tooltipStyle}
          className="bg-background border border-border rounded-lg shadow-lg p-6 z-[9999]"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-lg mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.content}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={skipTour}
              className="h-6 w-6 -mt-1 -mr-1"
              aria-label="Skip tour"
            >
              <X size={14} />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={prevStep}>
                  <ChevronLeft size={16} className="mr-1" />
                  Previous
                </Button>
              )}
              <Button variant="default" size="sm" onClick={nextStep}>
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight size={16} className="ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook to reset tour (for testing or admin use)
export function useOnboardingTour() {
  const resetTour = useCallback((storageKey: string = TOUR_STORAGE_KEY) => {
    localStorage.removeItem(storageKey);
  }, []);

  const startTour = useCallback((storageKey: string = TOUR_STORAGE_KEY) => {
    localStorage.removeItem(storageKey);
    window.location.reload();
  }, []);

  return { resetTour, startTour };
}
