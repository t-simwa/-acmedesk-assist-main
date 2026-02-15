import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { analyticsApi, ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import { exportChartAsPNG, exportChartAsPDF } from "@/utils/chartExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ChartDataPoint {
  day: string;
  date?: string;
  conversations?: number;
  rate?: number;
}

interface DrillDownData {
  date: string;
  conversations: number;
  details?: any;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
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
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationsChartRef = useRef<HTMLDivElement>(null);
  const resolutionChartRef = useRef<HTMLDivElement>(null);

  const calculateDays = useCallback((range: DateRange | undefined): number => {
    if (!range?.from || !range?.to) return 7;
    const days = differenceInDays(range.to, range.from);
    return Math.max(1, Math.min(days, 90)); // Clamp between 1 and 90 days
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const days = calculateDays(dateRange);
      const summary = await analyticsApi.getSummary(days);

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

      // For resolution rate, the backend returns an overall percentage
      const overallResolutionRate = summary.resolution_rate?.percentage || 0;
      const transformedResolution = summary.conversations_by_day.map((item) => {
        const date = new Date(item.date);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return {
          day: dayNames[date.getDay()],
          date: item.date,
          rate: overallResolutionRate,
        };
      });

      setConversationData(transformedConversations);
      setResolutionData(transformedResolution);
      setResolutionRate(overallResolutionRate);
      setTopCategories(summary.top_categories);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to load analytics data";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, calculateDays]);

  // Real-time polling
  useEffect(() => {
    fetchAnalytics();

    if (isPolling) {
      pollingIntervalRef.current = setInterval(() => {
        fetchAnalytics();
      }, 30000); // Poll every 30 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
  }, [fetchAnalytics, isPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload as ChartDataPoint;
      setDrillDownData({
        date: payload.date || payload.day,
        conversations: payload.conversations || 0,
      });
      setDrillDownOpen(true);
    }
  };

  const handleLineClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload as ChartDataPoint;
      setDrillDownData({
        date: payload.date || payload.day,
        conversations: 0,
        details: { rate: payload.rate },
      });
      setDrillDownOpen(true);
    }
  };

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

  const getDateRangeLabel = () => {
    if (!dateRange?.from || !dateRange?.to) return "Last 7 days";
    return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPolling(!isPolling)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isPolling ? "animate-spin" : ""}`} />
            {isPolling ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Conversations chart */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-labelledby="conversations-chart-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 id="conversations-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">Conversations</h3>
              <p className="text-[13px] text-muted-foreground">{getDateRangeLabel()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPNG("conversations-chart", `conversations-${format(new Date(), "yyyy-MM-dd")}.png`)}
                className="gap-2"
              >
                <Download className="h-3 w-3" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPDF("conversations-chart", `conversations-${format(new Date(), "yyyy-MM-dd")}.pdf`)}
                className="gap-2"
              >
                <Download className="h-3 w-3" />
                PDF
              </Button>
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
              aria-label="Bar chart showing conversations over the selected date range"
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={conversationData} onClick={handleBarClick} style={{ cursor: "pointer" }}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="conversations" fill="hsl(228, 66%, 47%)" radius={[4, 4, 0, 0]}>
                    {conversationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(228, 66%, 47%)" />
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
              <h3 id="resolution-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">Resolution Rate</h3>
              <p className="text-[13px] text-muted-foreground">{getDateRangeLabel()}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPNG("resolution-chart", `resolution-rate-${format(new Date(), "yyyy-MM-dd")}.png`)}
                className="gap-2"
              >
                <Download className="h-3 w-3" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPDF("resolution-chart", `resolution-rate-${format(new Date(), "yyyy-MM-dd")}.pdf`)}
                className="gap-2"
              >
                <Download className="h-3 w-3" />
                PDF
              </Button>
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
              aria-label="Line chart showing resolution rate over the selected date range"
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={resolutionData} onClick={handleLineClick} style={{ cursor: "pointer" }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Rate"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(228, 66%, 47%)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(228, 66%, 47%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Top Categories */}
      <section className="bg-background rounded-xl border border-border shadow-soft-sm" aria-labelledby="top-categories-heading">
        <div className="px-6 py-4 border-b border-border">
          <h3 id="top-categories-heading" className="text-[15px] font-semibold text-foreground">Top Question Categories</h3>
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
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[14px] text-foreground">{cat.category}</span>
                    <span className="text-[13px] text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
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
              Detailed information for {drillDownData?.date ? format(new Date(drillDownData.date), "MMMM dd, yyyy") : "selected date"}
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
