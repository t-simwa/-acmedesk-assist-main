/**
 * F8.1 - Chart Library Enhancement
 * Unified chart theme configuration for consistent styling across all visualizations
 */

export interface ChartTheme {
  colors: {
    primary: string;
    primaryHover: string;
    grid: string;
    axis: string;
    tooltip: {
      background: string;
      border: string;
      text: string;
      textMuted: string;
    };
  };
  typography: {
    axis: {
      fontSize: number;
      fontFamily: string;
      fill: string;
    };
    tooltip: {
      fontSize: number;
      fontFamily: string;
    };
    legend: {
      fontSize: number;
      fontFamily: string;
    };
  };
  spacing: {
    padding: number;
    margin: number;
  };
  accessibility: {
    focusRing: string;
    focusRingOffset: number;
  };
}

/**
 * Default chart theme matching the design system
 */
export const defaultChartTheme: ChartTheme = {
  colors: {
    primary: "hsl(228, 66%, 47%)",
    primaryHover: "hsl(228, 66%, 60%)",
    grid: "hsl(220, 13%, 91%)",
    axis: "hsl(220, 9%, 46%)",
    tooltip: {
      background: "hsl(var(--background))",
      border: "hsl(var(--border))",
      text: "hsl(var(--foreground))",
      textMuted: "hsl(var(--muted-foreground))",
    },
  },
  typography: {
    axis: {
      fontSize: 12,
      fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      fill: "hsl(220, 9%, 46%)",
    },
    tooltip: {
      fontSize: 14,
      fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    },
    legend: {
      fontSize: 13,
      fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    },
  },
  spacing: {
    padding: 6,
    margin: 4,
  },
  accessibility: {
    focusRing: "hsl(var(--ring))",
    focusRingOffset: 2,
  },
};

/**
 * High contrast chart theme for accessibility
 */
export const highContrastChartTheme: ChartTheme = {
  ...defaultChartTheme,
  colors: {
    primary: "hsl(228, 100%, 50%)",
    primaryHover: "hsl(228, 100%, 65%)",
    grid: "hsl(220, 20%, 80%)",
    axis: "hsl(220, 10%, 20%)",
    tooltip: {
      background: "hsl(var(--background))",
      border: "hsl(220, 10%, 20%)",
      text: "hsl(var(--foreground))",
      textMuted: "hsl(220, 10%, 40%)",
    },
  },
};

/**
 * Get chart theme based on accessibility settings
 */
export function getChartTheme(highContrast: boolean = false): ChartTheme {
  return highContrast ? highContrastChartTheme : defaultChartTheme;
}

/**
 * Chart accessibility utilities
 */
export const chartA11y = {
  /**
   * Generate ARIA label for chart
   */
  getChartLabel: (title: string, type: "bar" | "line" | "heatmap" | "sankey" | "wordcloud", dataPoints: number): string => {
    return `${title}. ${type.charAt(0).toUpperCase() + type.slice(1)} chart with ${dataPoints} data point${dataPoints !== 1 ? "s" : ""}. Use arrow keys to navigate data points, Enter or Space to select.`;
  },

  /**
   * Generate ARIA label for data point
   */
  getDataPointLabel: (label: string, value: string | number, index: number, total: number): string => {
    return `${label}: ${value}. Data point ${index + 1} of ${total}. Press Enter or Space to select.`;
  },

  /**
   * Generate description for screen readers
   */
  getChartDescription: (title: string, dataSummary: string): string => {
    return `${title}. ${dataSummary}`;
  },
};
