/**
 * Dashboard — Overview Page
 *
 * Redesigned with:
 * - Proper Tailwind design tokens (no hardcoded hex colors)
 * - Inline KPI stat cards with gradient accents on hover
 * - Responsive grid layout for all device sizes
 * - Consistent aesthetic with Leads and Conversations pages
 * - Area chart with gradient fill for conversation volume
 * - Refined editorial SaaS aesthetic
 */

import { useState } from "react";
import {
  MessageSquare, Users, Percent, Clock,
  TrendingUp, TrendingDown, Minus, RefreshCw,
} from "lucide-react";
import { SetupChecklistBanner } from "@/components/onboarding/SetupChecklistBanner";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ConversationVolumeChart } from "@/components/dashboard/ConversationVolumeChart";
import { ConversationOutcomesDonut } from "@/components/dashboard/ConversationOutcomesDonut";
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { RecentLeads } from "@/components/dashboard/RecentLeads";
import { UnansweredAlert } from "@/components/dashboard/UnansweredAlert";
import { ChatbotStatusCard } from "@/components/dashboard/ChatbotStatusCard";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const MOCK_DATA = {
  total_conversations: 247,
  leads_captured: 38,
  resolution_rate: 82.5,
  avg_response_time: "1.2s",
  conversations_trend: 12.5,
  leads_trend: 8.3,
  resolution_trend: 5.2,
  response_time_trend: -15.0,
  conversation_volume: [
    { date: "2026-02-24", count: 32 },
    { date: "2026-02-25", count: 45 },
    { date: "2026-02-26", count: 28 },
    { date: "2026-02-27", count: 51 },
    { date: "2026-02-28", count: 39 },
    { date: "2026-03-01", count: 29 },
    { date: "2026-03-02", count: 23 },
  ],
  conversation_outcomes: [
    { outcome: "resolved", count: 203, percentage: 82.2 },
    { outcome: "escalated", count: 29, percentage: 11.7 },
    { outcome: "abandoned", count: 15, percentage: 6.1 },
  ],
  channel_breakdown: [
    { channel: "web", count: 189, icon: "🌐" },
    { channel: "whatsapp", count: 34, icon: "💬" },
    { channel: "instagram", count: 15, icon: "📸" },
    { channel: "facebook", count: 6, icon: "📘" },
    { channel: "email", count: 3, icon: "📧" },
    { channel: "sms", count: 0, icon: "📱" },
  ],
  recent_conversations: [
    { id: "1", channel: "web", contact_name: "John Smith", first_message: "What's your return policy?", status: "resolved", time_ago: "5m" },
    { id: "2", channel: "whatsapp", contact_name: "Sarah Johnson", first_message: "Do you have this in blue?", status: "active", time_ago: "12m" },
    { id: "3", channel: "web", contact_name: "Mike Davis", first_message: "How much is shipping?", status: "escalated", time_ago: "28m" },
    { id: "4", channel: "instagram", contact_name: "Emily Brown", first_message: "Love your products!", status: "resolved", time_ago: "1h" },
    { id: "5", channel: "web", contact_name: "Anonymous", first_message: "Where are you located?", status: "abandoned", time_ago: "2h" },
  ],
  recent_leads: [
    { id: "1", name: "Alex Thompson", email: "alex@example.com", channel: "web", status: "new", time_ago: "3m" },
    { id: "2", name: "Maria Garcia", email: "maria@example.com", channel: "whatsapp", status: "contacted", time_ago: "15m" },
    { id: "3", name: "James Wilson", email: "james@example.com", channel: "web", status: "qualified", time_ago: "1h" },
    { id: "4", name: "Lisa Anderson", email: "lisa@example.com", channel: "instagram", status: "converted", time_ago: "3h" },
    { id: "5", name: "David Martinez", email: "david@example.com", channel: "web", status: "new", time_ago: "5h" },
  ],
  unanswered_count: 3,
  chatbot_status: {
    status: "live" as const,
    last_active: new Date().toISOString(),
    chatbot_name: "Aria Assistant",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const KPI_CARDS = [
  {
    key: "conversations" as const,
    label: "Total Conversations",
    icon: <MessageSquare size={18} />,
    accent: "from-blue-500/20 to-blue-500/0",
    invertTrend: false,
  },
  {
    key: "leads" as const,
    label: "Leads Captured",
    icon: <Users size={18} />,
    accent: "from-emerald-500/20 to-emerald-500/0",
    invertTrend: false,
  },
  {
    key: "resolution" as const,
    label: "Resolution Rate",
    icon: <Percent size={18} />,
    accent: "from-violet-500/20 to-violet-500/0",
    invertTrend: false,
  },
  {
    key: "response_time" as const,
    label: "Avg Response Time",
    icon: <Clock size={18} />,
    accent: "from-amber-500/20 to-amber-500/0",
    invertTrend: true, // lower is better
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function TrendIndicator({ value, invert }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined) return null;

  // For inverted metrics (response time), negative is good
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;

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
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("7days");

  const { data, isLoading, error, refetch } = useDashboardSummary(dateRange);

  const summary = data || MOCK_DATA;

  /* ─── Error State ──────────────────────────────────────────────────────── */
  if (error && !data) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-heading">
            Dashboard
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground font-description max-w-xl">
            Overview of your chatbot performance
          </p>
        </header>
        <NetworkErrorState
          error={error as ApiError}
          onRetry={() => refetch()}
          title="Failed to load dashboard"
          description="We couldn't load your dashboard data. Please try again."
        />
      </div>
    );
  }

  /* ─── KPI values ───────────────────────────────────────────────────────── */
  const kpiValues: Record<string, { value: string; trend: number | null | undefined }> = {
    conversations: {
      value: summary.total_conversations.toLocaleString(),
      trend: summary.conversations_trend,
    },
    leads: {
      value: summary.leads_captured.toString(),
      trend: summary.leads_trend,
    },
    resolution: {
      value: `${summary.resolution_rate}%`,
      trend: summary.resolution_trend,
    },
    response_time: {
      value: summary.avg_response_time,
      trend: summary.response_time_trend,
    },
  };

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col w-full min-w-0 gap-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-heading">
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground font-description">
              Overview of your chatbot performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </header>

      {/* ─── Setup Checklist Banner ─────────────────────────────────────── */}
      <SetupChecklistBanner />

      {/* ─── KPI Stats Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </>
        ) : (
          KPI_CARDS.map((card, i) => {
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
                    <TrendIndicator value={kpi.trend} invert={card.invertTrend} />
                  </div>
                  <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                    vs last period{card.invertTrend ? " (lower is better)" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Charts Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <ConversationVolumeChart data={summary.conversation_volume} />
          )}
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <ConversationOutcomesDonut data={summary.conversation_outcomes} />
          )}
        </div>
      </div>

      {/* ─── Channel Breakdown ──────────────────────────────────────────── */}
      {isLoading ? (
        <Skeleton className="h-[180px] rounded-xl" />
      ) : (
        <ChannelBreakdown data={summary.channel_breakdown} />
      )}

      {/* ─── Unanswered Alert ───────────────────────────────────────────── */}
      <UnansweredAlert count={summary.unanswered_count} />

      {/* ─── Chatbot Status ─────────────────────────────────────────────── */}
      {isLoading ? (
        <Skeleton className="h-[140px] rounded-xl" />
      ) : (
        <ChatbotStatusCard
          status={summary.chatbot_status.status}
          lastActive={summary.chatbot_status.last_active}
          chatbotName={summary.chatbot_status.chatbot_name}
        />
      )}

      {/* ─── Recent Items Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {isLoading ? (
            <Skeleton className="h-[280px] rounded-xl" />
          ) : (
            <RecentConversations data={summary.recent_conversations} />
          )}
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[280px] rounded-xl" />
          ) : (
            <RecentLeads data={summary.recent_leads} />
          )}
        </div>
      </div>
    </div>
  );
}
