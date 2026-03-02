import { useState, useCallback } from "react";
import {
  BarChart3,
  MessageSquare,
  Users,
  Percent,
  TrendingUp,
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
import { KPICard } from "@/components/dashboard/KPICard";
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

// ============================================================================
// Mock data — used when API is unavailable
// ============================================================================

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

// ============================================================================
// Helper — section header component
// ============================================================================

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 shrink-0" style={{ color: "#4F8EF7" }} />
      <h2
        className="text-xs font-semibold uppercase tracking-wider font-heading whitespace-nowrap"
        style={{ color: "#9CA3AF" }}
      >
        {title}
      </h2>
      <div className="flex-1 h-px" style={{ backgroundColor: "#2D333B" }} />
    </div>
  );
}

// ============================================================================
// Date range preset → days mapping
// ============================================================================

function presetToDays(preset: string): number {
  if (preset === "today") return 1;
  if (preset === "30days") return 30;
  return 7;
}

// ============================================================================
// Main Analytics Page
// ============================================================================

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  const days = presetToDays(dateRange);

  // API hooks
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

  // Derived KPI values
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

  // Export handlers
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

  // Hard error state (no data at all, API failed)
  if (summaryError && !summaryData) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight font-heading" style={{ color: "#F9FAFB" }}>
            Analytics
          </h1>
          <p className="mt-1 text-sm font-description" style={{ color: "#9CA3AF" }}>
            Chatbot usage and performance metrics
          </p>
        </header>
        <NetworkErrorState
          error={summaryError as ApiError}
          onRetry={() => refetchSummary()}
          title="Failed to load analytics"
          description="We couldn't load your analytics data. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0 pb-10">

      {/* ================================================================
          7.3.1 — Page Header
      ================================================================ */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Title */}
          <div>
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-tight font-heading"
              style={{ color: "#F9FAFB" }}
            >
              Analytics
            </h1>
            <p className="mt-1 text-[13px] sm:text-sm font-description" style={{ color: "#9CA3AF" }}>
              Chatbot usage and performance metrics
            </p>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date range */}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            {/* Schedule Report */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleOpen(true)}
              className="h-9 px-3 text-xs font-description border gap-1.5"
              style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B", color: "#F9FAFB" }}
            >
              <Calendar className="h-3.5 w-3.5" style={{ color: "#4F8EF7" }} />
              Schedule Report
            </Button>

            {/* Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-description border gap-1.5"
                  style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B", color: "#F9FAFB" }}
                >
                  <Download className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 border"
                style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
              >
                <DropdownMenuItem
                  onClick={handleExportCSV}
                  className="text-xs font-description cursor-pointer"
                  style={{ color: "#F9FAFB" }}
                >
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportExcel}
                  className="text-xs font-description cursor-pointer"
                  style={{ color: "#F9FAFB" }}
                >
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleGeneratePDF}
                  className="text-xs font-description cursor-pointer"
                  style={{ color: "#F9FAFB" }}
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
              className={cn("h-9 px-3 text-xs font-description border gap-1.5 transition-colors")}
              style={{
                backgroundColor: autoRefresh ? "rgba(79,142,247,0.15)" : "#1C1F26",
                borderColor: autoRefresh ? "#4F8EF7" : "#2D333B",
                color: autoRefresh ? "#4F8EF7" : "#9CA3AF",
              }}
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
                className="h-9 px-2 text-xs font-description"
                style={{ color: "#9CA3AF" }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================
          7.3.2 — Overview KPI Row (6 cards)
      ================================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {summaryLoading || leadsLoading || satisfactionLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <KPICard
              label="Total Conversations"
              value={summary.total_conversations.toLocaleString()}
              icon={<MessageSquare className="w-4 h-4" />}
            />
            <KPICard
              label="Total Leads"
              value={leadsData.total_leads.toLocaleString()}
              trend={leadsData.leads_trend ?? null}
              trendLabel="vs last period"
              icon={<Users className="w-4 h-4" />}
            />
            <KPICard
              label="Resolution Rate"
              value={`${(summary.resolution_rate.percentage || 0).toFixed(1)}%`}
              icon={<Percent className="w-4 h-4" />}
            />
            <KPICard
              label="Escalation Rate"
              value={`${escalationRate.toFixed(1)}%`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KPICard
              label="Avg Messages"
              value={avgMessages}
              icon={<MessageSquare className="w-4 h-4" />}
            />
            <KPICard
              label="Satisfaction"
              value={`${satisfactionData.current_score.toFixed(1)}%`}
              trend={satisfactionData.score_trend ?? null}
              trendLabel="vs last period"
              icon={<Star className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* ================================================================
          7.3.3 — Conversation Analytics Section
      ================================================================ */}
      <div className="mb-8">
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

      {/* ================================================================
          7.3.4 — Channel Analytics Section
      ================================================================ */}
      <div className="mb-8">
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

      {/* ================================================================
          7.3.5 — Content Analytics Section
      ================================================================ */}
      <div className="mb-8">
        <SectionHeader icon={FileText} title="Content Analytics" />

        {/* Top questions + Unanswered */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Top Questions inline table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
          >
            <div className="px-4 sm:px-5 py-4 border-b" style={{ borderColor: "#2D333B" }}>
              <h3 className="text-sm font-semibold font-heading" style={{ color: "#F9FAFB" }}>
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
                <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>
                  No questions data yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2D333B" }}>
                      {["Question", "Count", "Resolved"].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider font-heading"
                          style={{ color: "#9CA3AF" }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contentData.top_questions.slice(0, 10).map((q, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: i < contentData.top_questions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#252A33")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        className="transition-colors duration-150"
                      >
                        <td className="px-4 py-2.5 max-w-[200px]">
                          <p
                            className="font-description text-xs truncate"
                            style={{ color: "#F9FAFB" }}
                            title={q.query}
                          >
                            {q.query}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs font-semibold" style={{ color: "#F9FAFB" }}>
                            {q.count}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="text-xs font-mono px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                q.resolved_percentage >= 80
                                  ? "rgba(16,185,129,0.15)"
                                  : "rgba(239,68,68,0.15)",
                              color: q.resolved_percentage >= 80 ? "#10B981" : "#EF4444",
                            }}
                          >
                            {q.resolved_percentage.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unanswered Questions */}
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

        {/* Most Referenced Documents — horizontal bar chart */}
        {contentData.most_referenced_docs.length > 0 && (
          <div
            className="rounded-xl border p-4 sm:p-5"
            style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
          >
            <h3 className="text-sm font-semibold font-heading mb-4" style={{ color: "#F9FAFB" }}>
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
                        <span className="text-xs font-description truncate max-w-[60%]" style={{ color: "#F9FAFB" }}>
                          {doc.filename}
                        </span>
                        <span className="text-xs font-mono" style={{ color: "#9CA3AF" }}>
                          {doc.reference_count} refs
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: i === 0 ? "#4F8EF7" : i === 1 ? "#7C3AED" : i === 2 ? "#10B981" : "#F59E0B",
                          }}
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

      {/* ================================================================
          7.3.6 — Lead Analytics Section
      ================================================================ */}
      <div className="mb-8">
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

      {/* ================================================================
          7.3.7 — Satisfaction Analytics Section
      ================================================================ */}
      <div className="mb-8">
        <SectionHeader icon={Star} title="Satisfaction Analytics" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {satisfactionLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              {/* Current Satisfaction Score */}
              <div
                className="rounded-xl border p-5 relative overflow-hidden"
                style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
              >
                <div
                  className="absolute inset-0 opacity-5"
                  style={{ background: "radial-gradient(circle at top right, #4F8EF7, transparent 70%)" }}
                />
                <p className="text-xs font-semibold uppercase tracking-wider font-heading mb-2" style={{ color: "#9CA3AF" }}>
                  Satisfaction Score
                </p>
                <p className="text-4xl font-bold font-mono" style={{ color: "#F9FAFB" }}>
                  {satisfactionData.current_score.toFixed(1)}%
                </p>
                {satisfactionData.score_trend != null && (
                  <div className="flex items-center gap-1 mt-2">
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: satisfactionData.score_trend >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: satisfactionData.score_trend >= 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      {satisfactionData.score_trend >= 0 ? "+" : ""}{satisfactionData.score_trend.toFixed(1)}%
                    </span>
                    <span className="text-xs font-description" style={{ color: "#9CA3AF" }}>vs last period</span>
                  </div>
                )}
              </div>

              {/* Positive Feedback */}
              <div
                className="rounded-xl border p-5 relative overflow-hidden"
                style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
              >
                <div
                  className="absolute inset-0 opacity-5"
                  style={{ background: "radial-gradient(circle at top right, #10B981, transparent 70%)" }}
                />
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="h-4 w-4" style={{ color: "#10B981" }} />
                  <p className="text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                    Positive Feedback
                  </p>
                </div>
                <p className="text-4xl font-bold font-mono" style={{ color: "#10B981" }}>
                  {satisfactionData.total_positive.toLocaleString()}
                </p>
                <p className="text-xs font-description mt-2" style={{ color: "#9CA3AF" }}>
                  {satisfactionData.total_positive + satisfactionData.total_negative > 0
                    ? `${((satisfactionData.total_positive / (satisfactionData.total_positive + satisfactionData.total_negative)) * 100).toFixed(1)}% of all feedback`
                    : "No feedback yet"}
                </p>
              </div>

              {/* Negative Feedback */}
              <div
                className="rounded-xl border p-5 relative overflow-hidden"
                style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
              >
                <div
                  className="absolute inset-0 opacity-5"
                  style={{ background: "radial-gradient(circle at top right, #EF4444, transparent 70%)" }}
                />
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsDown className="h-4 w-4" style={{ color: "#EF4444" }} />
                  <p className="text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                    Negative Feedback
                  </p>
                </div>
                <p className="text-4xl font-bold font-mono" style={{ color: "#EF4444" }}>
                  {satisfactionData.total_negative.toLocaleString()}
                </p>
                <p className="text-xs font-description mt-2" style={{ color: "#9CA3AF" }}>
                  {satisfactionData.total_positive + satisfactionData.total_negative > 0
                    ? `${((satisfactionData.total_negative / (satisfactionData.total_positive + satisfactionData.total_negative)) * 100).toFixed(1)}% of all feedback`
                    : "No feedback yet"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Schedule Report Modal */}
      <ScheduleReportModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
