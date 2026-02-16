import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
  Brush,
  TooltipProps,
} from "recharts";
import { analyticsApi, ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsSummary } from "@/hooks/useAnalytics";
import { AlertCircle, Download, RefreshCw, FileSpreadsheet, FileText, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, differenceInDays, parseISO, getHours, getDay } from "date-fns";
import {
  exportChartAsPNG,
  exportChartAsPDF,
  exportChartAsSVG,
  exportDataAsCSV,
  exportDataAsExcel,
  generatePDFReport,
} from "@/utils/chartExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { HeatmapChart } from "@/components/admin/HeatmapChart";
import { SankeyDiagram } from "@/components/admin/SankeyDiagram";
import { WordCloud } from "@/components/admin/WordCloud";
import { ConversationTimeline } from "@/components/admin/ConversationTimeline";
import { UserJourney } from "@/components/admin/UserJourney";
import { SentimentAnalysis } from "@/components/admin/SentimentAnalysis";
import { PerformanceMetrics } from "@/components/admin/PerformanceMetrics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { getChartTheme, chartA11y } from "@/lib/chartTheme";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { EmptyState } from "@/components/error/EmptyState";

interface ChartDataPoint {
  day: string;
  date?: string;
  conversations?: number;
  rate?: number;
  category?: string;
}

interface DrillDownData {
  date: string;
  conversations: number;
  details?: any;
}

// Custom tooltip component with enhanced formatting
const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const total = data.conversations ? payload.reduce((sum, p) => sum + (p.value as number), 0) : 0;
    const percentage = data.conversations && total > 0 ? ((data.conversations / total) * 100).toFixed(1) : null;

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="text-sm">
            <span className="text-muted-foreground">{entry.name || entry.dataKey}: </span>
            <span className="font-semibold text-foreground">
              {typeof entry.value === "number" && entry.dataKey === "rate"
                ? `${entry.value.toFixed(1)}%`
                : entry.value}
            </span>
            {percentage && entry.dataKey === "conversations" && (
              <span className="text-muted-foreground ml-2">({percentage}%)</span>
            )}
          </div>
        ))}
        {data.date && (
          <p className="text-xs text-muted-foreground mt-2">{format(new Date(data.date), "MMM dd, yyyy")}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [error, setError] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<ChartDataPoint[]>([]);
  const [resolutionData, setResolutionData] = useState<ChartDataPoint[]>([]);
  const [topCategories, setTopCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [resolutionRate, setResolutionRate] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { from: start, to: end };
  });
  const [isPolling, setIsPolling] = useState(true);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [filteredDate, setFilteredDate] = useState<string | null>(null);
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  const { toast } = useToast();
  const { reduceMotion, highContrast } = useAccessibility();
  const theme = getChartTheme(highContrast);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationsChartRef = useRef<HTMLDivElement>(null);
  const resolutionChartRef = useRef<HTMLDivElement>(null);

  const calculateDays = useCallback((range: DateRange | undefined): number => {
    if (!range?.from || !range?.to) return 7;
    const days = differenceInDays(range.to, range.from);
    return Math.max(1, Math.min(days, 90)); // Clamp between 1 and 90 days
  }, []);

  const days = calculateDays(dateRange);
  
  // Use React Query for analytics with automatic caching and refetching
  const {
    data: summary,
    isLoading: loading,
    error: queryError,
    refetch: refetchAnalytics,
  } = useAnalyticsSummary(days);

  // Transform data when summary changes
  useEffect(() => {
    if (summary) {
      // Transform conversations_by_day to chart format
      const transformedConversations = summary.conversations_by_day.map((item) => {
        const date = new Date(item.date);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return {
          day: dayNames[date.getDay()],
          date: item.date,
          conversations: item.count,
        };
      });

      // For resolution rate, calculate per-day if possible, otherwise use overall
      const transformedResolution = summary.conversations_by_day.map((item) => {
        const date = new Date(item.date);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return {
          day: dayNames[date.getDay()],
          date: item.date,
          rate: summary.resolution_rate?.percentage || 0,
        };
      });

      setConversationData(transformedConversations);
      setResolutionData(transformedResolution);
      setResolutionRate(summary.resolution_rate?.percentage || 0);
      setTopCategories(summary.top_categories);
    }
  }, [summary]);

  // Set error from query
  useEffect(() => {
    if (queryError) {
      const errorMessage = queryError?.message || "Failed to load analytics data";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
    } else {
      setError(null);
    }
  }, [queryError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Filter data based on selected date or category
  const filteredConversationData = useMemo(() => {
    let filtered = [...conversationData];
    if (filteredDate) {
      filtered = filtered.filter((item) => item.date === filteredDate);
    }
    if (filteredCategory) {
      // Filter by category if we have category data
      filtered = filtered.filter((item) => item.category === filteredCategory);
    }
    return filtered;
  }, [conversationData, filteredDate, filteredCategory]);

  const filteredResolutionData = useMemo(() => {
    let filtered = [...resolutionData];
    if (filteredDate) {
      filtered = filtered.filter((item) => item.date === filteredDate);
    }
    return filtered;
  }, [resolutionData, filteredDate]);

  // Handle bar click with filtering
  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload as ChartDataPoint;
      setFilteredDate(payload.date || null);
      setDrillDownData({
        date: payload.date || payload.day,
        conversations: payload.conversations || 0,
      });
      setDrillDownOpen(true);
    }
  };

  // Handle line click with filtering
  const handleLineClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload as ChartDataPoint;
      setFilteredDate(payload.date || null);
      setDrillDownData({
        date: payload.date || payload.day,
        conversations: 0,
        details: { rate: payload.rate },
      });
      setDrillDownOpen(true);
    }
  };

  // Handle category click for filtering
  const handleCategoryClick = (category: string) => {
    setFilteredCategory(filteredCategory === category ? null : category);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilteredDate(null);
    setFilteredCategory(null);
    setBrushStartIndex(undefined);
    setBrushEndIndex(undefined);
  };

  // Export handlers
  const handleExportPNG = async (chartId: string, filename: string) => {
    try {
      await exportChartAsPNG(chartId, filename);
      toast({
        title: "Export successful",
        description: `Chart exported as ${filename}`,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export chart as PNG",
        variant: "destructive",
      });
    }
  };

  const handleExportSVG = async (chartId: string, filename: string) => {
    try {
      await exportChartAsSVG(chartId, filename);
      toast({
        title: "Export successful",
        description: `Chart exported as ${filename}`,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export chart as SVG",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async (chartId: string, filename: string) => {
    try {
      await exportChartAsPDF(chartId, filename);
      toast({
        title: "Export successful",
        description: `Chart exported as ${filename}`,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export chart as PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const csvData = conversationData.map((item) => ({
        Date: item.date || item.day,
        Day: item.day,
        Conversations: item.conversations || 0,
        "Resolution Rate": item.rate ? `${item.rate}%` : "N/A",
      }));
      exportDataAsCSV(csvData, `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`);
      toast({
        title: "Export successful",
        description: "Data exported as CSV",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export data as CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const excelData = conversationData.map((item) => ({
        Date: item.date || item.day,
        Day: item.day,
        Conversations: item.conversations || 0,
        "Resolution Rate": item.rate || 0,
      }));
      exportDataAsExcel(excelData, `analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`, "Analytics");
      toast({
        title: "Export successful",
        description: "Data exported as Excel",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export data as Excel",
        variant: "destructive",
      });
    }
  };

  const handleExportPDFReport = async () => {
    try {
      const charts = [
        { id: "conversations-chart", title: "Conversations Over Time" },
        { id: "resolution-chart", title: "Resolution Rate" },
      ];
      const reportData = conversationData.map((item) => ({
        Date: item.date || item.day,
        Conversations: item.conversations || 0,
        "Resolution Rate": item.rate ? `${item.rate}%` : "N/A",
      }));
      await generatePDFReport(charts, reportData, `analytics-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({
        title: "Export successful",
        description: "PDF report generated",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  // Generate heatmap data (mock data based on conversations - in real app, this would come from backend)
  const heatmapData = useMemo(() => {
    const data: Array<{ day: string; hour: number; value: number }> = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    conversationData.forEach((item) => {
      if (item.date) {
        const date = parseISO(item.date);
        const dayName = days[getDay(date)];
        const hour = getHours(date);
        const existing = data.find((d) => d.day === dayName && d.hour === hour);
        if (existing) {
          existing.value += item.conversations || 0;
        } else {
          data.push({
            day: dayName,
            hour,
            value: item.conversations || 0,
          });
        }
      }
    });

    return data;
  }, [conversationData]);

  // Generate Sankey data
  const sankeyData = useMemo(() => {
    if (!resolutionRate) return { nodes: [], links: [] };

    const resolved = Math.round((resolutionRate / 100) * (conversationData.reduce((sum, d) => sum + (d.conversations || 0), 0) || 1));
    const escalated = Math.max(0, (conversationData.reduce((sum, d) => sum + (d.conversations || 0), 0) || 0) - resolved);

    return {
      nodes: [
        { id: "total", name: "Total Conversations", value: resolved + escalated },
        { id: "resolved", name: "Resolved", value: resolved },
        { id: "escalated", name: "Escalated", value: escalated },
      ],
      links: [
        { source: "total", target: "resolved", value: resolved },
        { source: "total", target: "escalated", value: escalated },
      ],
    };
  }, [resolutionRate, conversationData]);

  // Generate word cloud data from top categories
  const wordCloudData = useMemo(() => {
    return topCategories.map((cat) => ({
      word: cat.category,
      count: cat.count,
    }));
  }, [topCategories]);

  const getDateRangeLabel = () => {
    if (!dateRange?.from || !dateRange?.to) return "Last 7 days";
    return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const hasActiveFilters = filteredDate !== null || filteredCategory !== null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Chatbot usage and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
              <FilterX className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isPolling ? "animate-spin" : ""}`} />
            {isPolling ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-3 w-3" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDFReport}>
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {queryError && (
        <NetworkErrorState
          error={queryError as ApiError}
          onRetry={() => {
            refetchAnalytics();
          }}
          variant="inline"
        />
      )}

      {hasActiveFilters && (
        <div className="bg-muted/50 border border-border px-4 py-2 rounded-lg text-sm">
          <span className="text-muted-foreground">Active filters: </span>
          {filteredDate && (
            <span className="font-medium">
              Date: {format(new Date(filteredDate), "MMM dd, yyyy")}
            </span>
          )}
          {filteredCategory && (
            <span className="font-medium ml-2">Category: {filteredCategory}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Conversations chart */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-labelledby="conversations-chart-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 id="conversations-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">
                Conversations
              </h3>
              <p className="text-[13px] text-muted-foreground">{getDateRangeLabel()}</p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      handleExportPNG("conversations-chart", `conversations-${format(new Date(), "yyyy-MM-dd")}.png`)
                    }
                  >
                    PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleExportSVG("conversations-chart", `conversations-${format(new Date(), "yyyy-MM-dd")}.svg`)
                    }
                  >
                    SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleExportPDF("conversations-chart", `conversations-${format(new Date(), "yyyy-MM-dd")}.pdf`)
                    }
                  >
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <div
              id="conversations-chart"
              ref={conversationsChartRef}
              role="img"
              aria-label={chartA11y.getChartLabel("Conversations", "bar", filteredConversationData.length)}
              aria-describedby="conversations-chart-description"
            >
              <div id="conversations-chart-description" className="sr-only">
                {chartA11y.getChartDescription(
                  "Conversations chart",
                  `Shows ${filteredConversationData.length} data points over the selected date range. Total conversations: ${filteredConversationData.reduce((sum, d) => sum + (d.conversations || 0), 0)}.`
                )}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={filteredConversationData}
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  accessibilityLayer
                >
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: theme.typography.axis.fontSize,
                      fill: theme.colors.axis,
                      fontFamily: theme.typography.axis.fontFamily,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: theme.typography.axis.fontSize,
                      fill: theme.colors.axis,
                      fontFamily: theme.typography.axis.fontFamily,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="conversations"
                    fill={theme.colors.primary}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={!reduceMotion}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {filteredConversationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          filteredDate && entry.date === filteredDate
                            ? theme.colors.primaryHover
                            : theme.colors.primary
                        }
                        aria-label={chartA11y.getDataPointLabel(
                          entry.day,
                          entry.conversations || 0,
                          index,
                          filteredConversationData.length
                        )}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Resolution rate chart */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-labelledby="resolution-chart-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 id="resolution-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">
                Resolution Rate
              </h3>
              <p className="text-[13px] text-muted-foreground">{getDateRangeLabel()}</p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      handleExportPNG("resolution-chart", `resolution-rate-${format(new Date(), "yyyy-MM-dd")}.png`)
                    }
                  >
                    PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleExportSVG("resolution-chart", `resolution-rate-${format(new Date(), "yyyy-MM-dd")}.svg`)
                    }
                  >
                    SVG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleExportPDF("resolution-chart", `resolution-rate-${format(new Date(), "yyyy-MM-dd")}.pdf`)
                    }
                  >
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <div
              id="resolution-chart"
              ref={resolutionChartRef}
              role="img"
              aria-label={chartA11y.getChartLabel("Resolution Rate", "line", filteredResolutionData.length)}
              aria-describedby="resolution-chart-description"
            >
              <div id="resolution-chart-description" className="sr-only">
                {chartA11y.getChartDescription(
                  "Resolution Rate chart",
                  `Shows ${filteredResolutionData.length} data points over the selected date range. Average resolution rate: ${Math.round(filteredResolutionData.reduce((sum, d) => sum + (d.rate || 0), 0) / (filteredResolutionData.length || 1))}%.`
                )}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={filteredResolutionData}
                  onClick={handleLineClick}
                  style={{ cursor: "pointer" }}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: theme.typography.axis.fontSize,
                      fill: theme.colors.axis,
                      fontFamily: theme.typography.axis.fontFamily,
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: theme.typography.axis.fontSize,
                      fill: theme.colors.axis,
                      fontFamily: theme.typography.axis.fontFamily,
                    }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke={theme.colors.primary}
                    strokeWidth={2}
                    dot={{ r: 3, fill: theme.colors.primary }}
                    isAnimationActive={!reduceMotion}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Brush
                    dataKey="day"
                    height={30}
                    stroke={theme.colors.primary}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onChange={(brushData) => {
                      if (brushData && typeof brushData.startIndex === "number" && typeof brushData.endIndex === "number") {
                        setBrushStartIndex(brushData.startIndex);
                        setBrushEndIndex(brushData.endIndex);
                      }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Additional Visualizations */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Heatmap */}
        <section
          className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
          aria-labelledby="heatmap-section-heading"
        >
          <h3 id="heatmap-section-heading" className="sr-only">
            Conversation Activity Heatmap
          </h3>
          <HeatmapChart
            data={heatmapData}
            title="Conversation Activity Heatmap (by Hour/Day)"
          />
        </section>

        {/* Sankey and Word Cloud in a row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
            aria-labelledby="sankey-section-heading"
          >
            <h3 id="sankey-section-heading" className="sr-only">
              Conversation Flow Diagram
            </h3>
            <SankeyDiagram
              nodes={sankeyData.nodes}
              links={sankeyData.links}
              title="Conversation Flow (Resolved vs Escalated)"
            />
          </section>
          <section
            className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
            aria-labelledby="wordcloud-section-heading"
          >
            <h3 id="wordcloud-section-heading" className="sr-only">
              Word Cloud Visualization
            </h3>
            <WordCloud words={wordCloudData} title="Most Common Question Keywords" />
          </section>
        </div>
      </div>

      {/* Advanced Analytics Views - F8.2 */}
      <div className="space-y-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Advanced Analytics Views</h2>
          <p className="text-[14px] text-muted-foreground">
            Detailed insights into conversation patterns, user journeys, and performance metrics
          </p>
        </div>

        {/* Performance Metrics Dashboard */}
        <section
          className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
          aria-labelledby="performance-metrics-heading"
        >
          <h3 id="performance-metrics-heading" className="sr-only">
            Performance Metrics Dashboard
          </h3>
          <PerformanceMetrics
            data={{
              response_accuracy: summary?.response_accuracy,
              resolution_rate: summary?.resolution_rate,
            }}
            title="Performance Metrics Dashboard"
          />
        </section>

        {/* Conversation Timeline and User Journey in a row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
            aria-labelledby="timeline-heading"
          >
            <h3 id="timeline-heading" className="sr-only">
              Conversation Timeline
            </h3>
            <ConversationTimeline
              data={conversationData.map((item) => ({
                date: item.date || item.day,
                count: item.conversations || 0,
              }))}
              title="Conversation Timeline"
            />
          </section>

          <section
            className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
            aria-labelledby="user-journey-heading"
          >
            <h3 id="user-journey-heading" className="sr-only">
              User Journey Visualization
            </h3>
            <UserJourney
              data={[
                {
                  step: "Initial Question",
                  count: summary?.total_conversations || 0,
                  percentage: 100,
                },
                {
                  step: "Follow-up Question",
                  count: Math.round((summary?.total_conversations || 0) * 0.65),
                  percentage: 65,
                },
                {
                  step: "Resolution",
                  count: summary?.resolution_rate?.resolved_via_bot || 0,
                  percentage: summary?.resolution_rate?.percentage || 0,
                },
                {
                  step: "Escalation",
                  count: summary?.resolution_rate?.escalated || 0,
                  percentage: summary?.resolution_rate?.escalated
                    ? Math.round(
                        ((summary.resolution_rate.escalated || 0) /
                          (summary?.resolution_rate?.total || 1)) *
                          100
                      )
                    : 0,
                },
              ]}
              title="User Journey Visualization"
            />
          </section>
        </div>

        {/* Sentiment Analysis */}
        <section
          className="bg-background rounded-xl border border-border p-6 shadow-soft-sm"
          aria-labelledby="sentiment-heading"
        >
          <h3 id="sentiment-heading" className="sr-only">
            Sentiment Analysis
          </h3>
          <SentimentAnalysis
            data={
              summary?.user_satisfaction
                ? {
                    positive: summary.user_satisfaction.thumbs_up || 0,
                    negative: summary.user_satisfaction.thumbs_down || 0,
                    neutral:
                      (summary.user_satisfaction.total_feedback || 0) -
                      (summary.user_satisfaction.thumbs_up || 0) -
                      (summary.user_satisfaction.thumbs_down || 0),
                    total: summary.user_satisfaction.total_feedback || 0,
                  }
                : undefined
            }
            title="Sentiment Analysis"
          />
        </section>
      </div>

      {/* Top Categories */}
      <section className="bg-background rounded-xl border border-border shadow-soft-sm" aria-labelledby="top-categories-heading">
        <div className="px-6 py-4 border-b border-border">
          <h3 id="top-categories-heading" className="text-[15px] font-semibold text-foreground">
            Top Question Categories
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : topCategories.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">No categories available</p>
          ) : (
            topCategories.map((cat) => {
              const maxCount = topCategories[0]?.count || 1;
              const width = (cat.count / maxCount) * 100;
              const isFiltered = filteredCategory === cat.category;
              return (
                <div
                  key={cat.category}
                  onClick={() => handleCategoryClick(cat.category)}
                  className={`cursor-pointer transition-all ${
                    isFiltered ? "bg-muted/50 rounded p-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[14px] text-foreground">{cat.category}</span>
                    <span className="text-[13px] text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFiltered ? "bg-primary" : "bg-primary/70"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Drill-down Dialog */}
      <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Date Details</DialogTitle>
            <DialogDescription>
              Detailed information for{" "}
              {drillDownData?.date ? format(new Date(drillDownData.date), "MMMM dd, yyyy") : "selected date"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {drillDownData && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(drillDownData.date), "EEEE, MMMM dd, yyyy")}
                  </p>
                </div>
                {drillDownData.conversations !== undefined && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Conversations</p>
                    <p className="text-sm text-muted-foreground">{drillDownData.conversations}</p>
                  </div>
                )}
                {drillDownData.details?.rate !== undefined && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Resolution Rate</p>
                    <p className="text-sm text-muted-foreground">{drillDownData.details.rate}%</p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
