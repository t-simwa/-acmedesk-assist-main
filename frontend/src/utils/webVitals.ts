import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * Web Vitals tracking utility
 * Tracks Core Web Vitals and other performance metrics
 * 
 * Metrics tracked:
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - INP (Interaction to Next Paint): Measures interactivity (replaces FID)
 * - FCP (First Contentful Paint): Measures loading performance
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - TTFB (Time to First Byte): Measures server response time
 */

interface WebVitalsData {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

/**
 * Get rating for a metric value based on Web Vitals thresholds
 */
function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, { good: number; poor: number }> = {
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 }, // Interaction to Next Paint (replaces FID)
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Send Web Vitals data to analytics endpoint
 * Can be configured to send to your analytics service
 */
function sendToAnalytics(metric: WebVitalsData) {
  // In production, you would send this to your analytics service
  // Example: Google Analytics, Custom API endpoint, etc.
  
  // For now, we'll store in a way that can be accessed programmatically
  // You can extend this to send to your analytics endpoint
  if (typeof window !== "undefined") {
    // Store in window for potential analytics integration
    if (!window.__webVitals) {
      window.__webVitals = [];
    }
    window.__webVitals.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Keep only last 50 metrics to prevent memory issues
    if (window.__webVitals.length > 50) {
      window.__webVitals = window.__webVitals.slice(-50);
    }
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once in your app initialization
 */
export function initWebVitals() {
  // Track CLS (Cumulative Layout Shift)
  onCLS((metric: Metric) => {
    sendToAnalytics({
      name: "CLS",
      value: metric.value,
      rating: getRating("CLS", metric.value),
      delta: metric.delta,
      id: metric.id,
    });
  });

  // Track INP (Interaction to Next Paint) - Replaces FID in web-vitals v3+
  onINP((metric: Metric) => {
    sendToAnalytics({
      name: "INP",
      value: metric.value,
      rating: getRating("INP", metric.value),
      delta: metric.delta,
      id: metric.id,
    });
  });

  // Track FCP (First Contentful Paint)
  onFCP((metric: Metric) => {
    sendToAnalytics({
      name: "FCP",
      value: metric.value,
      rating: getRating("FCP", metric.value),
      delta: metric.delta,
      id: metric.id,
    });
  });

  // Track LCP (Largest Contentful Paint)
  onLCP((metric: Metric) => {
    sendToAnalytics({
      name: "LCP",
      value: metric.value,
      rating: getRating("LCP", metric.value),
      delta: metric.delta,
      id: metric.id,
    });
  });

  // Track TTFB (Time to First Byte)
  onTTFB((metric: Metric) => {
    sendToAnalytics({
      name: "TTFB",
      value: metric.value,
      rating: getRating("TTFB", metric.value),
      delta: metric.delta,
      id: metric.id,
    });
  });
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __webVitals?: Array<WebVitalsData & { timestamp: number }>;
  }
}
