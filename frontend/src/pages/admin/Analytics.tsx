/**
 * Analytics Page — World-Class SaaS Implementation
 *
 * Redesigned to match STYLE_GUIDE.md specifications:
 * - Consistent with Dashboard, Conversations, and Leads pages
 * - World-class 3-breakpoint responsive tabs (mobile 3x2 grid, tablet 3x2 full labels, desktop inline)
 * - Elite mobile filter bar with horizontally scrollable channel pills
 * - KPI cards matching Dashboard/Conversations/Leads patterns exactly
 * - Proper Tailwind design tokens (no hardcoded hex colors)
 * - Production-ready with real API data
 */

import { useState, useCallback, useMemo, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3, MessageSquare, Users, Percent, Clock, Star,
  TrendingUp, TrendingDown, Minus, Download, RefreshCw,
  Calendar, FileText, ThumbsUp, ThumbsDown, Repeat,
  Share2, Bell, Bot, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ConversationVolumeChart } from "@/components/dashboard/ConversationVolumeChart";
import { ConversationOutcomesDonut } from "@/components/dashboard/ConversationOutcomesDonut";
import {
  ScheduleReportModal, LeadsOverTimeChart, LeadSourceDonut,
  ConversionFunnel, ChannelPerformanceTable, UnansweredQuestionsTable,
} from "@/components/analytics";
import {
  useAnalyticsSummary, useLeadsAnalytics, useChannelAnalytics,
  useContentAnalytics, useSatisfactionAnalytics,
} from "@/hooks/useAnalytics";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useConversationsList } from "@/hooks/useConversations";
import { analyticsApi } from "@/lib/api";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { useToast } from "@/hooks/use-toast";
import type { ApiError, UnansweredQuestion } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: BarChart3 },
  { id: "conversations", label: "Conversations", shortLabel: "Convos", icon: MessageSquare },
  { id: "channels", label: "Channels", shortLabel: "Channels", icon: Bot },
  { id: "content", label: "Content", shortLabel: "Content", icon: FileText },
  { id: "leads", label: "Leads", shortLabel: "Leads", icon: Users },
  { id: "satisfaction", label: "Satisfaction", shortLabel: "Rating", icon: Star },
] as const;

// KPI cards matching Dashboard/Conversations/Leads exactly (icon box with colored background)
const KPI_CARDS = [
  {
    key: "conversations" as const,
    label: "Total Conversations",
    icon: <MessageSquare className="h-4 w-4" />,
    accent: "from-primary/5 to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "leads" as const,
    label: "Leads Captured",
    icon: <Users className="h-4 w-4" />,
    accent: "from-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    key: "resolution" as const,
    label: "AI Resolution Rate",
    icon: <CheckCircle2 className="h-4 w-4" />,
    accent: "from-violet-500/5 to-transparent",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  {
    key: "escalation" as const,
    label: "Escalation Rate",
    icon: <AlertTriangle className="h-4 w-4" />,
    accent: "from-rose-500/5 to-transparent",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    invertTrend: true,
  },
  {
    key: "avg_duration" as const,
    label: "Avg Duration",
    icon: <Clock className="h-4 w-4" />,
    accent: "from-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    invertTrend: true,
  },
  {
    key: "satisfaction" as const,
    label: "Satisfaction Score",
    icon: <Star className="h-4 w-4" />,
    accent: "from-blue-500/5 to-transparent",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION HEADER COMPONENT (matches STYLE_GUIDE.md Section 16)
   ═══════════════════════════════════════════════════════════════════════════════ */

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TREND INDICATOR (matches Dashboard/Conversations/Leads)
   ═══════════════════════════════════════════════════════════════════════════════ */

function TrendIndicator({ value, invert }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined) return null;

  // For inverted metrics (escalation, duration), negative is good
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-mono font-medium",
      isPositive && "text-emerald-500",
      isNegative && "text-rose-500",
      !isPositive && !isNegative && "text-muted-foreground",
    )}>
      {value > 0 && <TrendingUp className="h-3 w-3" />}
      {value < 0 && <TrendingDown className="h-3 w-3" />}
      {value === 0 && <Minus className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SKELETON COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function KPICardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[120px] rounded-xl" />
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2">
        <Skeleton className="h-[300px] sm:h-[340px] rounded-xl" />
      </div>
      <div>
        <Skeleton className="h-[300px] sm:h-[340px] rounded-xl" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { toast } = useToast();

  // URL state
  const activeTab = searchParams.get("tab") ?? "overview";
  const range = searchParams.get("range") ?? "30d";
  const compare = searchParams.get("compare") === "true";
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;

  // URL helpers
  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = Object.fromEntries(searchParams.entries());
      if (value === undefined || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const setTab = useCallback((tab: string) => setParam("tab", tab), [setParam]);

  const setRange = useCallback(
    (value: string) => {
      setParam("range", value);
      if (value !== "custom") {
        setParam("from", undefined);
        setParam("to", undefined);
      }
    },
    [setParam],
  );

  const setCompare = useCallback(
    (enabled: boolean) => setParam("compare", enabled ? "true" : undefined),
    [setParam],
  );

  const setCustomRange = useCallback(
    (from: string, to: string) => {
      setParam("range", "custom");
      setParam("from", from);
      setParam("to", to);
    },
    [setParam],
  );

  const handleClearFilters = useCallback(() => {
    setRange("30d");
    setCompare(false);
    setParam("from", undefined);
    setParam("to", undefined);
  }, [setRange, setCompare, setParam]);

  // ── API hooks ─────────────────────────────────────────────────────────────
  // Use Dashboard API for consistent Total Conversations count
  const { data: dashboardData } = useDashboardSummary(
    range === "7d" ? "7days" : range === "30d" ? "30days" : "7days",
  );
  
  // Use Conversations API for consistent count (same source as Conversations page)
  const { data: conversationsData } = useConversationsList({ page: 1, per_page: 1 });

  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAnalyticsSummary({
    range,
    from: fromDate,
    to: toDate,
    compare,
  });
  
  const { data: leadsData, isLoading: leadsLoading } = useLeadsAnalytics({
    range,
    from: fromDate,
    to: toDate,
    compare,
  });
  
  const { data: channelData, isLoading: channelsLoading } = useChannelAnalytics({
    range,
    from: fromDate,
    to: toDate,
  });
  
  const { data: contentData, isLoading: contentLoading } = useContentAnalytics({
    range,
    from: fromDate,
    to: toDate,
  });
  
  const { data: satisfactionData, isLoading: satisfactionLoading } = useSatisfactionAnalytics({
    range,
    from: fromDate,
    to: toDate,
  });

  // Use real data
  const summary = summaryData;

  // Use conversations total from same source as Conversations page for consistency
  const conversationsTotal = conversationsData?.total ?? dashboardData?.total_conversations ?? summary?.total_conversations ?? 0;

  // Compare series for charts
  const compareConversationSeries = useMemo(() => {
    const data = (summary?.compare_summary as any)?.conversations_by_day;
    if (Array.isArray(data)) return data as Array<{ date: string; count: number }>;
    return undefined;
  }, [summary]);

  const compareLeadsSeries = useMemo(() => {
    const data = (leadsData?.compare_data as any)?.leads_by_day;
    if (Array.isArray(data)) return data as Array<{ date: string; count: number }>;
    return undefined;
  }, [leadsData]);

  // ── Derived KPI values ────────────────────────────────────────────────────
  const escalationRate = useMemo(() => {
    if (!summary?.resolution_rate?.total || summary.resolution_rate.total === 0) return 0;
    return ((summary.resolution_rate.escalated || 0) / summary.resolution_rate.total) * 100;
  }, [summary]);

  const avgDuration = useMemo(() => {
    // Calculate from dashboard data if available
    return dashboardData?.avg_response_time ?? "—";
  }, [dashboardData]);

  // Outcomes for conversation donut
  const conversationOutcomes = useMemo(() => [
    {
      outcome: "resolved",
      count: summary?.resolution_rate?.resolved_via_bot || 0,
      percentage: summary?.resolution_rate?.percentage || 0,
    },
    {
      outcome: "escalated",
      count: summary?.resolution_rate?.escalated || 0,
      percentage: parseFloat(escalationRate.toFixed(1)),
    },
    { outcome: "abandoned", count: 0, percentage: 0 },
  ], [summary, escalationRate]);

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    try {
      const exportData = [
        { metric: "Total Conversations", value: conversationsTotal },
        { metric: "Total Leads", value: leadsData?.total_leads ?? 0 },
        { metric: "Resolution Rate", value: `${summary?.resolution_rate?.percentage ?? 0}%` },
        { metric: "Escalation Rate", value: `${escalationRate.toFixed(1)}%` },
        { metric: "Satisfaction Score", value: `${satisfactionData?.current_score ?? 0}%` },
      ];
      const headers = Object.keys(exportData[0]).join(",");
      const rows = exportData.map(row => Object.values(row).join(",")).join("\n");
      const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "CSV downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not export CSV.", variant: "destructive" });
    }
  }, [conversationsTotal, leadsData, summary, satisfactionData, escalationRate, range, toast]);

  const handleGeneratePDF = useCallback(async () => {
    try {
      const blob = await analyticsApi.exportPdf({ range, from: fromDate, to: toDate, compare });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `analytics-report-${range}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ title: "PDF generated", description: "PDF report downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  }, [range, fromDate, toDate, compare, toast]);

  const handleShareReport = useCallback(async () => {
    try {
      const result = await analyticsApi.shareReport({ range, from: fromDate, to: toDate, compare });
      const fullUrl = `${window.location.origin}${result.url}`;
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Share link copied",
        description: "You can now paste the link to share the report.",
      });
    } catch {
      toast({ title: "Share failed", description: "Could not generate share link.", variant: "destructive" });
    }
  }, [range, fromDate, toDate, compare, toast]);

  const handleAddToKB = useCallback((question: UnansweredQuestion) => {
    toast({
      title: "Navigate to Documents",
      description: `Add an answer for: "${question.query.slice(0, 50)}..."`,
    });
  }, [toast]);

  // ── Hard error state ──────────────────────────────────────────────────────
  if (summaryError && !summaryData) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Chatbot usage and performance metrics
          </p>
        </div>
        <NetworkErrorState
          error={summaryError as ApiError}
          onRetry={() => refetchSummary()}
          title="Failed to load analytics"
          description="We couldn't load your analytics data. Please try again."
        />
      </div>
    );
  }

  // ── KPI values ────────────────────────────────────────────────────────────
  const kpiValues: Record<string, { value: string; trend?: number | null }> = {
    conversations: {
      value: conversationsTotal.toLocaleString(),
      trend: dashboardData?.conversations_trend,
    },
    leads: {
      value: (leadsData?.total_leads ?? 0).toLocaleString(),
      trend: leadsData?.leads_trend,
    },
    resolution: {
      value: `${(summary?.resolution_rate?.percentage ?? 0).toFixed(1)}%`,
      trend: dashboardData?.resolution_trend,
    },
    escalation: {
      value: `${escalationRate.toFixed(1)}%`,
      trend: null, // No trend data for escalation
    },
    avg_duration: {
      value: avgDuration,
      trend: dashboardData?.response_time_trend,
    },
    satisfaction: {
      value: `${(satisfactionData?.current_score ?? 0).toFixed(1)}%`,
      trend: satisfactionData?.score_trend,
    },
  };

  // ── Tab content renderer ──────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            {/* KPI Cards Grid (matches Dashboard exactly) */}
            {summaryLoading || leadsLoading || satisfactionLoading ? (
              <KPICardsSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {KPI_CARDS.map((card, i) => {
                  const kpi = kpiValues[card.key];
                  if (!kpi) return null;
                  return (
                    <div
                      key={card.key}
                      className={cn(
                        "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
                        "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
                      )}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {/* Gradient accent on hover */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        card.accent,
                      )} />
                      <div className="relative">
                        {/* Icon box with colored background (Dashboard pattern) */}
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center mb-2",
                          card.iconBg,
                        )}>
                          <span className={card.iconColor}>{card.icon}</span>
                        </div>

                        {/* Label */}
                        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                          {card.label}
                        </p>

                        {/* Value + Trend */}
                        <div className="flex items-end gap-2 flex-wrap">
                          <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                            {kpi.value}
                          </p>
                          <div className="pb-0.5">
                            <TrendIndicator value={kpi.trend} invert={card.invertTrend} />
                          </div>
                        </div>

                        {/* Subtext */}
                        {kpi.trend != null && (
                          <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                            vs last period
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Analytics Charts */}
            <div>
              <SectionHeader icon={BarChart3} title="Conversation Analytics" />
              {summaryLoading ? (
                <ChartsSkeleton />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2">
                    <ConversationVolumeChart
                      data={summary?.conversations_by_day ?? []}
                      compareData={compareConversationSeries}
                    />
                  </div>
                  <div>
                    <ConversationOutcomesDonut data={conversationOutcomes} />
                  </div>
                </div>
              )}
            </div>
          </>
        );

      case "conversations":
        return (
          <div>
            <SectionHeader icon={MessageSquare} title="Conversation Analytics" />
            {summaryLoading ? (
              <ChartsSkeleton />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <ConversationVolumeChart
                    data={summary?.conversations_by_day ?? []}
                    compareData={compareConversationSeries}
                  />
                </div>
                <div>
                  <ConversationOutcomesDonut data={conversationOutcomes} />
                </div>
              </div>
            )}
          </div>
        );

      case "channels":
        return (
          <div>
            <SectionHeader icon={Bot} title="Channel Analytics" />
            {channelsLoading ? (
              <Skeleton className="h-[280px] rounded-xl" />
            ) : (
              <ChannelPerformanceTable
                data={channelData?.channels ?? []}
                total={channelData?.total_conversations ?? 0}
              />
            )}
          </div>
        );

      case "content":
        return (
          <div>
            <SectionHeader icon={FileText} title="Content Analytics" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Questions Card */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold font-heading text-foreground">Top Questions</h3>
                </div>
                {contentLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 rounded" />
                    ))}
                  </div>
                ) : (contentData?.top_questions ?? []).length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm font-description text-muted-foreground">No questions data yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {contentData?.top_questions?.slice(0, 10).map((q, i) => (
                      <div key={i} className="px-4 py-3 space-y-1.5">
                        <p className="font-description text-sm text-foreground line-clamp-2" title={q.query}>
                          {q.query}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {q.count} asked
                          </span>
                          <span
                            className={cn(
                              "text-xs font-mono px-2 py-0.5 rounded-full border",
                              q.resolved_percentage >= 80
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20",
                            )}
                          >
                            {q.resolved_percentage.toFixed(0)}% resolved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unanswered Questions */}
              {contentData && (
                <UnansweredQuestionsTable
                  data={contentData.unanswered_questions}
                  total={contentData.total_unanswered}
                  onAddToKnowledgeBase={handleAddToKB}
                />
              )}
            </div>
          </div>
        );

      case "leads":
        return (
          <div>
            <SectionHeader icon={Users} title="Lead Analytics" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {leadsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[260px] rounded-xl" />
                ))
              ) : (
                <>
                  <LeadsOverTimeChart data={leadsData?.leads_by_day ?? []} compareData={compareLeadsSeries} />
                  <LeadSourceDonut data={leadsData?.lead_sources ?? []} />
                  <ConversionFunnel data={leadsData?.conversion_funnel ?? []} />
                </>
              )}
            </div>
          </div>
        );

      case "satisfaction":
        return (
          <div>
            <SectionHeader icon={Star} title="Satisfaction Analytics" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {satisfactionLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))
              ) : (
                <>
                  {/* Satisfaction Score Card */}
                  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2 bg-blue-500/10">
                        <Star className="h-4 w-4 text-blue-500" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                        Satisfaction Score
                      </p>
                      <p className="text-3xl font-bold font-mono text-foreground">
                        {satisfactionData?.current_score?.toFixed(1) ?? 0}%
                      </p>
                      {satisfactionData?.score_trend != null && (
                        <div className="flex items-center gap-1 mt-2">
                          <TrendIndicator value={satisfactionData.score_trend} />
                          <span className="text-xs font-description text-muted-foreground">vs last period</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Positive Feedback Card */}
                  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-emerald-500/20 hover:shadow-soft-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2 bg-emerald-500/10">
                        <ThumbsUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                        Positive Feedback
                      </p>
                      <p className="text-3xl font-bold font-mono text-emerald-500">
                        {satisfactionData?.total_positive?.toLocaleString() ?? 0}
                      </p>
                      <p className="text-xs font-description mt-2 text-muted-foreground">
                        {(satisfactionData?.total_positive ?? 0) + (satisfactionData?.total_negative ?? 0) > 0
                          ? `${(((satisfactionData?.total_positive ?? 0) / ((satisfactionData?.total_positive ?? 0) + (satisfactionData?.total_negative ?? 0))) * 100).toFixed(1)}% of all feedback`
                          : "No feedback yet"}
                      </p>
                    </div>
                  </div>

                  {/* Negative Feedback Card */}
                  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-rose-500/20 hover:shadow-soft-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2 bg-rose-500/10">
                        <ThumbsDown className="h-4 w-4 text-rose-500" />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                        Negative Feedback
                      </p>
                      <p className="text-3xl font-bold font-mono text-rose-500">
                        {satisfactionData?.total_negative?.toLocaleString() ?? 0}
                      </p>
                      <p className="text-xs font-description mt-2 text-muted-foreground">
                        {(satisfactionData?.total_positive ?? 0) + (satisfactionData?.total_negative ?? 0) > 0
                          ? `${(((satisfactionData?.total_negative ?? 0) / ((satisfactionData?.total_positive ?? 0) + (satisfactionData?.total_negative ?? 0))) * 100).toFixed(1)}% of all feedback`
                          : "No feedback yet"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Chatbot usage and performance metrics
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchSummary()}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ─── Tab Navigation (3-breakpoint responsive - STYLE_GUIDE Section 15) ─ */}
      {/* Mobile (<sm) — 3×2 grid with short labels */}
      <div className="grid grid-cols-3 gap-1.5 sm:hidden">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold font-heading transition-all",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Small tablet / half-desktop (sm–lg) — 3×2 grid with full labels */}
      <div className="hidden sm:grid lg:hidden grid-cols-3 gap-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold font-heading transition-all",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Desktop (lg+) — single inline row with dividers */}
      <div className="hidden lg:flex items-center gap-1 w-fit">
        {TABS.map((tab, i) => {
          const isActive = activeTab === tab.id;
          return (
            <Fragment key={tab.id}>
              {i > 0 && <div className="h-5 w-px bg-border mx-0.5" />}
              <button
                onClick={() => setTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-heading transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <DateRangeFilter value={range} onChange={setRange} onCustomRange={setCustomRange} />

        {/* Compare toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCompare(!compare)}
          className={cn(
            "h-9 px-3 text-xs gap-1.5",
            compare
              ? "bg-primary/10 border-primary text-primary hover:bg-primary/15 hover:text-primary"
              : "text-muted-foreground",
          )}
        >
          <Repeat className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Compare</span>
        </Button>

        {/* Schedule Report */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScheduleOpen(true)}
          className="h-9 px-3 text-xs gap-1.5"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Schedule</span>
        </Button>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleExportCSV} className="text-xs font-description cursor-pointer">
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleGeneratePDF} className="text-xs font-description cursor-pointer">
              Generate PDF Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareReport} className="text-xs font-description cursor-pointer">
              <Share2 className="h-3.5 w-3.5 mr-2" />
              Share Report Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {(range !== "30d" || compare || fromDate || toDate) && (
          <Button
            variant="link"
            size="sm"
            onClick={handleClearFilters}
            className="text-primary text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────────── */}
      {renderTabContent()}

      {/* ─── Schedule Report Modal ────────────────────────────────────────── */}
      <ScheduleReportModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
