import { useMemo, useRef } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";

interface JourneyStep {
  step: string;
  count: number;
  percentage: number;
  nextSteps?: Array<{ step: string; count: number }>;
}

interface UserJourneyProps {
  data?: JourneyStep[];
  title?: string;
}

// Default journey steps based on common conversation patterns
const DEFAULT_JOURNEY_STEPS: JourneyStep[] = [
  { step: "Initial Question", count: 100, percentage: 100 },
  { step: "Follow-up Question", count: 65, percentage: 65 },
  { step: "Clarification", count: 35, percentage: 35 },
  { step: "Resolution", count: 80, percentage: 80 },
  { step: "Escalation", count: 20, percentage: 20 },
];

export function UserJourney({ data, title }: UserJourneyProps) {
  const { highContrast, reduceMotion } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const chartId = useRef(`journey-${Math.random().toString(36).slice(2, 11)}`);

  const journeyData = useMemo(() => {
    return data && data.length > 0 ? data : DEFAULT_JOURNEY_STEPS;
  }, [data]);

  // Generate data summary for screen readers
  const dataSummary = useMemo(() => {
    if (journeyData.length === 0) return "No user journey data available";
    const steps = journeyData.map((s) => `${s.step} (${s.percentage}%)`).join(", ");
    return `User journey showing: ${steps}.`;
  }, [journeyData]);

  const chartLabel = title
    ? chartA11y.getChartLabel(title, "bar", journeyData.length)
    : `User journey visualization with ${journeyData.length} steps`;

  return (
    <div className="w-full" role="region" aria-labelledby={`${chartId.current}-title`}>
      {title && (
        <h4 id={`${chartId.current}-title`} className="text-sm font-medium mb-4">
          {title}
        </h4>
      )}
      <div
        className="relative w-full"
        style={{ minHeight: "300px" }}
        role="img"
        aria-label={chartLabel}
        aria-describedby={`${chartId.current}-description`}
      >
        <div id={`${chartId.current}-description`} className="sr-only">
          {dataSummary}
        </div>

        {/* Journey flow visualization */}
        <div className="space-y-6">
          {journeyData.map((step, index) => {
            const isLast = index === journeyData.length - 1;
            const stepId = `${chartId.current}-step-${index}`;

            return (
              <div key={step.step} className="relative">
                {/* Step node */}
                <div className="flex items-center gap-4">
                  <div
                    className="flex-1 relative"
                    role="group"
                    aria-label={`Step ${index + 1}: ${step.step}`}
                  >
                    {/* Step bar */}
                    <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg transition-all"
                        style={{
                          width: `${step.percentage}%`,
                          backgroundColor: theme.colors.primary,
                          transitionDuration: reduceMotion ? "0ms" : "500ms",
                        }}
                        role="progressbar"
                        aria-valuenow={step.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${step.step}: ${step.percentage}%`}
                        tabIndex={0}
                        onFocus={(e) => {
                          e.currentTarget.style.opacity = "0.8";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-4">
                        <span className="text-sm font-medium text-foreground z-10">
                          {step.step}
                        </span>
                        <span className="text-sm font-semibold text-foreground z-10">
                          {step.count} ({step.percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow connector (except for last step) */}
                {!isLast && (
                  <div className="flex justify-center my-2" aria-hidden="true">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-muted-foreground"
                    >
                      <path
                        d="M12 5v14M5 12l7-7 7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data table for screen readers */}
      <div className="sr-only">
        <table>
          <caption>{title || "User Journey Data"}</caption>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">Count</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {journeyData.map((step, index) => (
              <tr key={step.step}>
                <td>Step {index + 1}: {step.step}</td>
                <td>{step.count}</td>
                <td>{step.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
