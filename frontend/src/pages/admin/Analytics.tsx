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

import { useState, useCallback } from "react";
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

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA — used when API is unavailable
   ═══════════════════════════════════════════════════════════════════════════════ */

const TODAY = new Date();
const MOCK_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() - (6 - i));
  return { date: d.toISOString().split("T")[0], count: Math.floor(Math.random() * 60) + 20 };
});

const MOCK_SUMMARY = {
  total_conversations: 1247,
  total_messages: 8934,
  conversations_by_day: MOCK_DAYS,
  resolution_rate: { resolved_via_bot: 1027, escalated: 148, total: 1247, percentage: 82.4 },
  response_accuracy: { average_query_time_ms: 420, average_sources_count: 3.2 },
  top_categories: [],
  api_usage: { total_requests: 1247, last_updated: new Date().toISOString() },
  user_satisfaction: { thumbs_up: 892, thumbs_down: 156, total_feedback: 1048, satisfaction_rate: 85.1 },
};

const MOCK_LEADS = {
  total_leads: 312,
  leads_by_day: MOCK_DAYS.map((d) => ({ date: d.date, count: Math.floor(d.count * 0.25) })),
  lead_sources: [
    { channel: "web", count: 180, percentage: 57.7 },
    { channel: "whatsapp", count: 89, percentage: 28.5 },
    { channel: "instagram", count: 43, percentage: 13.8 },
  ],
  conversion_funnel: [
    { stage: "Conversations", count: 1247, percentage: 100 },
    { stage: "Leads", count: 312, percentage: 25.0 },
    { stage: "Contacted", count: 187, percentage: 59.9 },
    { stage: "Qualified", count: 89, percentage: 47.6 },
    { stage: "Converted", count: 34, percentage: 38.2 },
  ],
  leads_trend: 12.5,
};

const MOCK_CHANNELS = {
  channels: [
    { channel: "web", icon: "🌐", conversations: 892, resolution_rate: 85.2, avg_duration_minutes: 4.2 },
    { channel: "whatsapp", icon: "💬", conversations: 234, resolution_rate: 79.1, avg_duration_minutes: 6.8 },
    { channel: "instagram", icon: "📸", conversations: 121, resolution_rate: 71.3, avg_duration_minutes: 5.1 },
  ],
  total_conversations: 1247,
};

const MOCK_CONTENT = {
  top_questions: [
    { query: "What are your business hours?", count: 89, resolved_by_bot: 85, resolved_percentage: 95.5 },
    { query: "How do I track my order?", count: 74, resolved_by_bot: 68, resolved_percentage: 91.9 },
    { query: "What is your return policy?", count: 61, resolved_by_bot: 54, resolved_percentage: 88.5 },
    { query: "Do you offer free shipping?", count: 55, resolved_by_bot: 49, resolved_percentage: 89.1 },
    { query: "How can I contact support?", count: 48, resolved_by_bot: 41, resolved_percentage: 85.4 },
  ],
  unanswered_questions: [
    { query: "Do you ship internationally?", count: 23, last_asked: new Date().toISOString() },
    { query: "What is your cancellation policy?", count: 18, last_asked: new Date().toISOString() },
    { query: "Can I change my order after placing?", count: 11, last_asked: new Date().toISOString() },
  ],
  most_referenced_docs: [
    { document_id: "1", filename: "Product Guide.pdf", reference_count: 234, last_referenced: new Date().toISOString() },
    { document_id: "2", filename: "FAQ.pdf", reference_count: 189, last_referenced: new Date().toISOString() },
    { document_id: "3", filename: "Return Policy.pdf", reference_count: 142, last_referenced: new Date().toISOString() },
    { document_id: "4", filename: "Shipping Info.pdf", reference_count: 98, last_referenced: new Date().toISOString() },
  ],
  underutilized_docs: [],
  total_unanswered: 3,
};

const MOCK_SATISFACTION = {
  current_score: 85.1,
  satisfaction_by_day: [],
  total_positive: 892,
  total_negative: 156,
  score_trend: 3.2,
};

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
  const [dateRange, setDateRange] = useState("7days");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  const days = presetToDays(dateRange);

  // ── API hooks ─────────────────────────────────────────────────────────────
  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAnalyticsSummary(days);
  const { data: leadsRaw, isLoading: leadsLoading } = useLeadsAnalytics(days);
  const { data: channelRaw, isLoading: channelsLoading } = useChannelAnalytics();
  const { data: contentRaw, isLoading: contentLoading } = useContentAnalytics(days);
  const { data: satisfactionRaw, isLoading: satisfactionLoading } = useSatisfactionAnalytics(days);

  // Use real data or mock fallback
  const summary = summaryData ?? MOCK_SUMMARY;
  const leadsData = leadsRaw ?? MOCK_LEADS;
  const channelData = channelRaw ?? MOCK_CHANNELS;
  const contentData = contentRaw ?? MOCK_CONTENT;
  const satisfactionData = satisfactionRaw ?? MOCK_SATISFACTION;

  // ── Derived KPI values ────────────────────────────────────────────────────
  const escalationRate =
    summary.resolution_rate.total > 0
      ? ((summary.resolution_rate.escalated || 0) / summary.resolution_rate.total) * 100
      : 0;

  const avgMessages =
    summary.total_conversations > 0
      ? (summary.total_messages / summary.total_conversations).toFixed(1)
      : "0";

  // Outcomes for conversation donut
  const conversationOutcomes = [
    {
      outcome: "resolved",
      count: summary.resolution_rate.resolved_via_bot || 0,
      percentage: summary.resolution_rate.percentage || 0,
    },
    {
      outcome: "escalated",
      count: summary.resolution_rate.escalated || 0,
      percentage: parseFloat(escalationRate.toFixed(1)),
    },
    { outcome: "abandoned", count: 0, percentage: 0 },
  ];

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    try {
      const exportData = [
        { metric: "Total Conversations", value: summary.total_conversations },
        { metric: "Total Leads", value: leadsData.total_leads },
        { metric: "Resolution Rate", value: `${summary.resolution_rate.percentage || 0}%` },
        { metric: "Escalation Rate", value: `${escalationRate.toFixed(1)}%` },
        { metric: "Avg Messages", value: avgMessages },
        { metric: "Satisfaction Score", value: `${satisfactionData.current_score}%` },
      ];
      exportDataAsCSV(exportData, `analytics-${dateRange}.csv`);
      toast({ title: "Exported", description: "CSV downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not export CSV.", variant: "destructive" });
    }
  }, [summary, leadsData, satisfactionData, escalationRate, avgMessages, dateRange, toast]);

  const handleExportExcel = useCallback(() => {
    try {
      const exportData = summary.conversations_by_day.map((d) => ({
        date: d.date,
        conversations: d.count,
      }));
      exportDataAsExcel(exportData, `analytics-${dateRange}.xlsx`, "Conversations");
      toast({ title: "Exported", description: "Excel file downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not export Excel.", variant: "destructive" });
    }
  }, [summary, dateRange, toast]);

  const handleGeneratePDF = useCallback(async () => {
    try {
      await generatePDFReport([], [], `analytics-report-${dateRange}.pdf`);
      toast({ title: "PDF generated", description: "PDF report downloaded successfully." });
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF.", variant: "destructive" });
    }
  }, [dateRange, toast]);

  const handleAddToKB = useCallback((question: UnansweredQuestion) => {
    toast({
      title: "Navigate to Documents",
      description: `Add an answer for: "${question.query.slice(0, 50)}..."`,
    });
  }, [toast]);

  const handleClearFilters = useCallback(() => {
    setDateRange("7days");
  }, []);

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
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <DateRangeFilter value={dateRange} onChange={setDateRange} />

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
        {dateRange !== "7days" && (
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

      {/* ═══════════════════════════════════════════════════════════════════════
          Overview KPI Row (6 cards)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryLoading || leadsLoading || satisfactionLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          (() => {
            const kpiValues: Record<string, { value: string; trend?: number | null }> = {
              conversations: { value: summary.total_conversations.toLocaleString() },
              leads:         { value: leadsData.total_leads.toLocaleString(), trend: leadsData.leads_trend },
              resolution:    { value: `${(summary.resolution_rate.percentage || 0).toFixed(1)}%` },
              escalation:    { value: `${escalationRate.toFixed(1)}%` },
              avg_messages:  { value: avgMessages },
              satisfaction:  { value: `${satisfactionData.current_score.toFixed(1)}%`, trend: satisfactionData.score_trend },
            };

            return STAT_CARDS.map((card, i) => {
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
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    card.accent,
                  )} />
                  <div className="relative">
                    <div className="text-muted-foreground mb-2">
                      {card.icon}
                    </div>
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
                      <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                        vs last period
                      </p>
                    )}
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Conversation Analytics Section
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={MessageSquare} title="Conversation Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {summaryLoading ? (
              <Skeleton className="h-[300px] rounded-xl" />
            ) : (
              <ConversationVolumeChart data={summary.conversations_by_day} />
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

      {/* ═══════════════════════════════════════════════════════════════════════
          Channel Analytics Section
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={BarChart3} title="Channel Analytics" />
        {channelsLoading ? (
          <Skeleton className="h-[220px] rounded-xl" />
        ) : (
          <ChannelPerformanceTable
            data={channelData.channels}
            total={channelData.total_conversations}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Content Analytics Section
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={FileText} title="Content Analytics" />

        {/* Top Questions + Unanswered */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* ─── Top Questions ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold font-heading text-foreground">
                Top Questions
              </h3>
            </div>
            {contentLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : contentData.top_questions.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-description text-muted-foreground">
                  No questions data yet
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table (sm+) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Question", "Count", "Resolved"].map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {contentData.top_questions.slice(0, 10).map((q, i) => (
                        <tr
                          key={i}
                          className="transition-colors duration-150 hover:bg-muted/50"
                        >
                          <td className="px-4 py-2.5 max-w-[200px]">
                            <p
                              className="font-description text-xs truncate text-foreground"
                              title={q.query}
                            >
                              {q.query}
                            </p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {q.count}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "text-xs font-mono px-2 py-0.5 rounded-full",
                                q.resolved_percentage >= 80
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-rose-500/15 text-rose-500",
                              )}
                            >
                              {q.resolved_percentage.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card layout (<sm) */}
                <div className="sm:hidden divide-y divide-border/50">
                  {contentData.top_questions.slice(0, 10).map((q, i) => (
                    <div key={i} className="px-4 py-3 space-y-1.5">
                      <p
                        className="font-description text-sm text-foreground line-clamp-2"
                        title={q.query}
                      >
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
              </>
            )}
          </div>

          {/* ─── Unanswered Questions ──────────────────────────────────── */}
          {contentLoading ? (
            <Skeleton className="h-[280px] rounded-xl" />
          ) : (
            <UnansweredQuestionsTable
              data={contentData.unanswered_questions}
              total={contentData.total_unanswered}
              onAddToKnowledgeBase={handleAddToKB}
            />
          )}
        </div>

        {/* ─── Most Referenced Documents ─────────────────────────────────── */}
        {contentData.most_referenced_docs.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
              Most Referenced Documents
            </h3>
            {contentLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {contentData.most_referenced_docs.map((doc, i) => {
                  const maxRef = contentData.most_referenced_docs[0]?.reference_count || 1;
                  const pct = (doc.reference_count / maxRef) * 100;
                  return (
                    <div key={doc.document_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-description truncate max-w-[60%] text-foreground">
                          {doc.filename}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {doc.reference_count} refs
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            DOC_BAR_COLORS[i] || DOC_BAR_COLORS[DOC_BAR_COLORS.length - 1],
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Lead Analytics Section
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={Users} title="Lead Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {leadsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[260px] rounded-xl" />
            ))
          ) : (
            <>
              <LeadsOverTimeChart data={leadsData.leads_by_day} />
              <LeadSourceDonut data={leadsData.lead_sources} />
              <ConversionFunnel data={leadsData.conversion_funnel} />
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Satisfaction Analytics Section
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader icon={Star} title="Satisfaction Analytics" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {satisfactionLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              {/* ─── Current Satisfaction Score ──────────────────────── */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm">
                {/* Gradient accent */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                    Satisfaction Score
                  </p>
                  <p className="text-4xl font-bold font-mono text-foreground">
                    {satisfactionData.current_score.toFixed(1)}%
                  </p>
                  {satisfactionData.score_trend != null && (
                    <div className="flex items-center gap-1 mt-2">
                      <span
                        className={cn(
                          "text-xs font-mono px-2 py-0.5 rounded-full",
                          satisfactionData.score_trend >= 0
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-rose-500/15 text-rose-500",
                        )}
                      >
                        {satisfactionData.score_trend >= 0 ? "+" : ""}{satisfactionData.score_trend.toFixed(1)}%
                      </span>
                      <span className="text-xs font-description text-muted-foreground">vs last period</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Positive Feedback ──────────────────────────────── */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-emerald-500/20 hover:shadow-soft-sm">
                {/* Gradient accent */}
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

              {/* ─── Negative Feedback ─────────────────────────────── */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group transition-all duration-200 hover:border-rose-500/20 hover:shadow-soft-sm">
                {/* Gradient accent */}
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

      {/* ─── Schedule Report Modal ────────────────────────────────────────── */}
      <ScheduleReportModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
