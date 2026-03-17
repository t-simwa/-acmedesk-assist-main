/**
 * Analytics Page
 *
 * Redesigned with:
 * - Proper Tailwind design tokens (no hardcoded hex colors)
 * - Inline KPI stat cards with gradient accents on hover
 * - Responsive grid layout for all device sizes
 * - Mobile card layouts for tables, progressive column disclosure
 * - Consistent aesthetic with Dashboard, Leads, and Conversations pages
 * - Refined editorial SaaS aesthetic
 */

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  MessageSquare,
  Users,
  Percent,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Star,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ConversationVolumeChart } from "@/components/dashboard/ConversationVolumeChart";
import { ConversationOutcomesDonut } from "@/components/dashboard/ConversationOutcomesDonut";
import {
  ScheduleReportModal,
  LeadsOverTimeChart,
  LeadSourceDonut,
  ConversionFunnel,
  ChannelPerformanceTable,
  UnansweredQuestionsTable,
} from "@/components/analytics";
import {
  useAnalyticsSummary,
  useLeadsAnalytics,
  useChannelAnalytics,
  useContentAnalytics,
  useSatisfactionAnalytics,
} from "@/hooks/useAnalytics";
import { exportDataAsCSV, exportDataAsExcel, generatePDFReport } from "@/utils/chartExport";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { useToast } from "@/hooks/use-toast";
import type { ApiError, UnansweredQuestion } from "@/lib/api";
import { cn } from "@/lib/utils";

// NOTE: We intentionally avoid mock fallback data in production paths.
// This analytics page relies on real API responses and shows empty states when no data is available.

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Section divider with icon and title */
function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <h2 className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/** Date range preset to days */
function presetToDays(preset: string): number {
  if (preset === "today") return 1;
  if (preset === "30days") return 30;
  return 7;
}

/** Document bar color classes by index */
const DOC_BAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
];

/** Inline stat card definitions matching Leads/Conversations pages */
const STAT_CARDS: { key: string; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "conversations", label: "Total Conversations", icon: <MessageSquare size={18} />, accent: "from-blue-500/20 to-blue-500/0" },
  { key: "leads",         label: "Total Leads",         icon: <Users size={18} />,          accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "resolution",    label: "Resolution Rate",     icon: <Percent size={18} />,        accent: "from-violet-500/20 to-violet-500/0" },
  { key: "escalation",    label: "Escalation Rate",     icon: <TrendingUp size={18} />,     accent: "from-amber-500/20 to-amber-500/0" },
  { key: "avg_messages",  label: "Avg Messages",        icon: <MessageSquare size={18} />,  accent: "from-pink-500/20 to-pink-500/0" },
  { key: "satisfaction",  label: "Satisfaction",         icon: <Star size={18} />,           accent: "from-blue-500/20 to-blue-500/0" },
];

/** Trend direction indicator */
function TrendIndicator({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-mono font-medium",
      isPositive && "text-emerald-500",
      isNegative && "text-rose-500",
      !isPositive && !isNegative && "text-muted-foreground",
    )}>
      {value > 0 && <TrendingUp className="h-3.5 w-3.5" />}
      {value < 0 && <TrendingDown className="h-3.5 w-3.5" />}
      {value === 0 && <Minus className="h-3.5 w-3.5" />}
      {value > 0 ? "+" : ""}{value}%
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  const activeTab = searchParams.get("tab") ?? "overview";
  const range = searchParams.get("range") ?? "30d";
  const compare = searchParams.get("compare") === "true";
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;

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

  const setTab = useCallback(
    (tab: string) => setParam("tab", tab),
    [setParam],
  );

  const setRange = useCallback(
    (value: string) => {
      setParam("range", value);
      // Remove custom range params when switching presets
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

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "conversations", label: "Conversations" },
      { key: "channels", label: "Channels" },
      { key: "content", label: "Content" },
      { key: "leads", label: "Leads" },
      { key: "satisfaction", label: "Satisfaction" },
    ],
    [],
  );

  const days = useMemo(() => presetToDays(range), [range]);

  // ── API hooks ─────────────────────────────────────────────────────────────
  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAnalyticsSummary({
    range,
    from: fromDate,
    to: toDate,
    compare,
  });
  const { data: leadsRaw, isLoading: leadsLoading } = useLeadsAnalytics({
    range,
    from: fromDate,
    to: toDate,
    compare,
  });
  const { data: channelRaw, isLoading: channelsLoading } = useChannelAnalytics({
    range,
    from: fromDate,
    to: toDate,
  });
  const { data: contentRaw, isLoading: contentLoading } = useContentAnalytics({
    range,
    from: fromDate,
    to: toDate,
  });
  const { data: satisfactionRaw, isLoading: satisfactionLoading } = useSatisfactionAnalytics({
    range,
    from: fromDate,
    to: toDate,
  });

  // Use real data or mock fallback
  const summary = summaryData;
  const leadsData = leadsRaw;
  const channelData = channelRaw;
  const contentData = contentRaw;
  const satisfactionData = satisfactionRaw;

  // Infer compare period series if available
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
  const escalationRate =
    summary?.resolution_rate?.total > 0
      ? ((summary.resolution_rate.escalated || 0) / summary.resolution_rate.total) * 100
      : 0;

  const avgMessages =
    summary?.total_conversations > 0
      ? (summary.total_messages / summary.total_conversations).toFixed(1)
      : "0";

  // Outcomes for conversation donut
  const conversationOutcomes = [
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
  ];

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    try {
      const exportData = [
        { metric: "Total Conversations", value: summary?.total_conversations ?? 0 },
        { metric: "Total Leads", value: leadsData?.total_leads ?? 0 },
        { metric: "Resolution Rate", value: `${summary?.resolution_rate?.percentage ?? 0}%` },
        { metric: "Escalation Rate", value: `${escalationRate.toFixed(1)}%` },
        { metric: "Avg Messages", value: avgMessages },
        { metric: "Satisfaction Score", value: `${satisfactionData?.current_score ?? 0}%` },
      ];
      exportDataAsCSV(exportData, `analytics-${range}.csv`);
      toast({ title: "Exported", description: "CSV downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not export CSV.", variant: "destructive" });
    }
  }, [summary, leadsData, satisfactionData, escalationRate, avgMessages, range, toast]);

  const handleExportExcel = useCallback(() => {
    try {
      const exportData = (summary?.conversations_by_day ?? []).map((d) => ({
        date: d.date,
        conversations: d.count,
      }));
      exportDataAsExcel(exportData, `analytics-${range}.xlsx`, "Conversations");
      toast({ title: "Exported", description: "Excel file downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not export Excel.", variant: "destructive" });
    }
  }, [summary, range, toast]);

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

  const handleClearFilters = useCallback(() => {
    setRange("30d");
    setCompare(false);
    setParam("from", undefined);
    setParam("to", undefined);
  }, [setRange, setCompare, setParam]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    const kpiValues: Record<string, { value: string; trend?: number | null }> = {
      conversations: { value: (summary?.total_conversations ?? 0).toLocaleString() },
      leads: { value: (leadsData?.total_leads ?? 0).toLocaleString(), trend: leadsData?.leads_trend },
      resolution: { value: `${(summary?.resolution_rate?.percentage ?? 0).toFixed(1)}%` },
      escalation: { value: `${escalationRate.toFixed(1)}%` },
      avg_messages: { value: avgMessages },
      satisfaction: { value: `${satisfactionData?.current_score?.toFixed(1) ?? 0}%`, trend: satisfactionData?.score_trend },
    };

    const renderStatCards = () =>
      STAT_CARDS.map((card, i) => {
        const kpi = kpiValues[card.key];
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
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                card.accent,
              )}
            />
            <div className="relative">
              <div className="text-muted-foreground mb-2">{card.icon}</div>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                {card.label}
              </p>
              <div className="flex items-end gap-2">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                  {kpi.value}
                </p>
                <TrendIndicator value={kpi.trend} />
              </div>
              {kpi.trend != null && (
                <p className="text-[10px] mt-1.5 font-description text-muted-foreground">vs last period</p>
              )}
            </div>
          </div>
        );
      });

    switch (activeTab) {
      case "overview":
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {summaryLoading || leadsLoading || satisfactionLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))
              ) : (
                renderStatCards()
              )}
            </div>

            <div>
              <SectionHeader icon={MessageSquare} title="Conversation Analytics" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  {summaryLoading ? (
                    <Skeleton className="h-[300px] rounded-xl" />
                  ) : (
                    <ConversationVolumeChart
                      data={summary?.conversations_by_day ?? []}
                      compareData={compareConversationSeries}
                    />
                  )}
                </div>
                <div>
                  {summaryLoading ? (
                    <Skeleton className="h-[300px] rounded-xl" />
                  ) : (
                    <ConversationOutcomesDonut data={conversationOutcomes} />
                  )}
                </div>
              </div>
            </div>
          </>
        );

      case "conversations":
        return (
          <div>
            <SectionHeader icon={MessageSquare} title="Conversation Analytics" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                {summaryLoading ? (
                  <Skeleton className="h-[300px] rounded-xl" />
                ) : (
                  <ConversationVolumeChart
                    data={summary?.conversations_by_day ?? []}
                    compareData={compareConversationSeries}
                  />
                )}
              </div>
              <div>
                {summaryLoading ? (
                  <Skeleton className="h-[300px] rounded-xl" />
                ) : (
                  <ConversationOutcomesDonut data={conversationOutcomes} />
                )}
              </div>
            </div>
          </div>
        );

      case "channels":
        return (
          <div>
            <SectionHeader icon={BarChart3} title="Channel Analytics" />
            {channelsLoading ? (
              <Skeleton className="h-[220px] rounded-xl" />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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
                  <div className="space-y-2.5">
                    {contentData.top_questions.slice(0, 10).map((q, i) => (
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
                              "text-xs font-mono px-2 py-0.5 rounded-full",
                              q.resolved_percentage >= 80
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-rose-500/15 text-rose-500",
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

              <UnansweredQuestionsTable
                data={contentData.unanswered_questions}
                total={contentData.total_unanswered}
                onAddToKnowledgeBase={handleAddToKB}
              />
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
                  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <p className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                        Satisfaction Score
                      </p>
                      <p className="text-4xl font-bold font-mono text-foreground">
                        {satisfactionData?.current_score.toFixed(1) ?? 0}%
                      </p>
                      {satisfactionData?.score_trend != null && (
                        <div className="flex items-center gap-1 mt-2">
                          <span
                            className={cn(
                              "text-xs font-mono px-2 py-0.5 rounded-full",
                              (satisfactionData?.score_trend ?? 0) >= 0
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-rose-500/15 text-rose-500",
                            )}
                          >
                            {(satisfactionData?.score_trend ?? 0) >= 0 ? "+" : ""}{(satisfactionData?.score_trend ?? 0).toFixed(1)}%
                          </span>
                          <span className="text-xs font-description text-muted-foreground">vs last period</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-emerald-500/20 hover:shadow-soft-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                          Positive Feedback
                        </p>
                      </div>
                      <p className="text-4xl font-bold font-mono text-emerald-500">
                        {satisfactionData.total_positive.toLocaleString()}
                      </p>
                      <p className="text-xs font-description mt-2 text-muted-foreground">
                        {satisfactionData.total_positive + satisfactionData.total_negative > 0
                          ? `${((satisfactionData.total_positive / (satisfactionData.total_positive + satisfactionData.total_negative)) * 100).toFixed(1)}% of all feedback`
                          : "No feedback yet"}
                      </p>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-rose-500/20 hover:shadow-soft-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsDown className="h-4 w-4 text-rose-500" />
                        <p className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                          Negative Feedback
                        </p>
                      </div>
                      <p className="text-4xl font-bold font-mono text-rose-500">
                        {satisfactionData.total_negative.toLocaleString()}
                      </p>
                      <p className="text-xs font-description mt-2 text-muted-foreground">
                        {satisfactionData.total_positive + satisfactionData.total_negative > 0
                          ? `${((satisfactionData.total_negative / (satisfactionData.total_positive + satisfactionData.total_negative)) * 100).toFixed(1)}% of all feedback`
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ═══════════════════════════════════════════════════════════════════════
          Page Header
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Chatbot usage and performance metrics
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={cn(
                "rounded-full px-3 py-2 text-xs font-semibold tracking-wide transition",
                activeTab === tab.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
              ? "bg-primary/15 border-primary text-primary hover:bg-primary/20 hover:text-primary"
              : "text-muted-foreground",
          )}
        >
          <Repeat className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Compare</span>
          <span className="sm:hidden">Cmp</span>
        </Button>

        {/* Schedule Report */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScheduleOpen(true)}
          className="h-9 px-3 text-xs gap-1.5"
        >
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Schedule Report</span>
          <span className="sm:hidden">Schedule</span>
        </Button>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={handleExportCSV}
              className="text-xs font-description cursor-pointer"
            >
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportExcel}
              className="text-xs font-description cursor-pointer"
            >
              Export Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleGeneratePDF}
              className="text-xs font-description cursor-pointer"
            >
              Generate PDF Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleShareReport}
              className="text-xs font-description cursor-pointer"
            >
              Share Report Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Auto-refresh toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAutoRefresh((v) => !v)}
          className={cn(
            "h-9 px-3 text-xs gap-1.5 transition-colors",
            autoRefresh
              ? "bg-primary/15 border-primary text-primary hover:bg-primary/20 hover:text-primary"
              : "text-muted-foreground",
          )}
          title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", autoRefresh && "animate-spin")} />
          {autoRefresh ? "Live" : "Refresh"}
        </Button>

        {/* Clear Filters */}
        {(range !== "30d" || compare || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {renderTabContent()}

      {/* ─── Schedule Report Modal ────────────────────────────────────────── */}
      <ScheduleReportModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
