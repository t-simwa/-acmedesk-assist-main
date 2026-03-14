/**
 * Dashboard — Overview Page
 *
 * Redesigned to match STYLE_GUIDE.md specifications:
 * - Consistent with Leads page patterns
 * - Proper Tailwind design tokens (no hardcoded hex colors)
 * - Elite responsive design across all devices
 * - Section headers with horizontal dividers
 * - World-class SaaS dashboard aesthetic
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageSquare, Users, Percent, Clock,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  BarChart3, Activity, Zap, Target,
  ArrowRight, Settings,
} from "lucide-react";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { DashboardAnnouncement } from "../../components/dashboard/DashboardAnnouncement";
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
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const KPI_CARDS = [
  {
    key: "conversations" as const,
    label: "Total Conversations",
    icon: <MessageSquare className="h-4 w-4" />,
    accent: "from-primary/5 to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    invertTrend: false,
  },
  {
    key: "leads" as const,
    label: "Leads Captured",
    icon: <Users className="h-4 w-4" />,
    accent: "from-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    invertTrend: false,
  },
  {
    key: "resolution" as const,
    label: "Resolution Rate",
    icon: <Percent className="h-4 w-4" />,
    accent: "from-violet-500/5 to-transparent",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    invertTrend: false,
  },
  {
    key: "response_time" as const,
    label: "Avg Response Time",
    icon: <Clock className="h-4 w-4" />,
    accent: "from-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    invertTrend: true, // lower is better
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION HEADER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ 
  icon: Icon, 
  title, 
  action,
  className,
}: { 
  icon: React.ElementType; 
  title: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mb-4", className)}>
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
      {action && (
        <button 
          onClick={action.onClick}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TREND INDICATOR
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
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

function RecentItemsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Skeleton className="h-[320px] rounded-xl" />
      <Skeleton className="h-[320px] rounded-xl" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = searchParams.get("range") || "7days";
  const initialFrom = searchParams.get("from") || undefined;
  const initialTo = searchParams.get("to") || undefined;

  const [dateRange, setDateRange] = useState(initialRange);
  const [customStart, setCustomStart] = useState<string | undefined>(initialFrom);
  const [customEnd, setCustomEnd] = useState<string | undefined>(initialTo);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("range", dateRange);
    if (dateRange === "custom" && customStart && customEnd) {
      params.set("from", customStart);
      params.set("to", customEnd);
    }
    setSearchParams(params, { replace: true });
  }, [dateRange, customStart, customEnd, setSearchParams]);

  const { data, isLoading, error, refetch } = useDashboardSummary(
    dateRange,
    dateRange === "custom" ? customStart : undefined,
    dateRange === "custom" ? customEnd : undefined,
  );

  const summary = data ?? {
    total_conversations: 0,
    leads_captured: 0,
    resolution_rate: 0,
    avg_response_time: "0s",
    conversations_trend: 0,
    leads_trend: 0,
    resolution_trend: 0,
    response_time_trend: 0,
    document_count: 0,
    conversation_volume: [],
    conversation_outcomes: [],
    channel_breakdown: [],
    recent_conversations: [],
    recent_leads: [],
    unanswered_count: 0,
    unanswered_questions: [],
    chatbot_status: { status: "not_installed", last_active: null, chatbot_name: null },
    announcement: null,
  };

  /* ─── Error State ──────────────────────────────────────────────────────── */
  if (error && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Overview of your chatbot performance
          </p>
        </div>
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
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Overview of your chatbot performance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <DateRangeFilter
            value={dateRange}
            onChange={(val) => {
              setDateRange(val);
              if (val !== "custom") {
                setCustomStart(undefined);
                setCustomEnd(undefined);
              }
            }}
            onCustomRange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
        </div>
      </div>

      {/* ─── Announcement Banner (conditional) ───────────────────────────── */}
      {summary.announcement && (
        <DashboardAnnouncement
          announcement={summary.announcement}
        />
      )}

      {/* ─── Setup Checklist (conditional) ───────────────────────────────── */}
      <SetupChecklist summary={data} isLoading={isLoading} />

      {/* ─── KPI Stats Grid ─────────────────────────────────────────────── */}
      {isLoading ? (
        <KPICardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_CARDS.map((card) => {
            const kpi = kpiValues[card.key];
            if (!kpi) return null;
            return (
              <div
                key={card.key}
                className={cn(
                  "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
                  "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
                )}
              >
                {/* Gradient accent on hover */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  card.accent,
                )} />
                <div className="relative">
                  {/* Icon */}
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center mb-3",
                    card.iconBg,
                  )}>
                    <div className={card.iconColor}>
                      {card.icon}
                    </div>
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
                  <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                    vs last period{card.invertTrend ? " (lower is better)" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Analytics Section ───────────────────────────────────────────── */}
      <div>
        <SectionHeader 
          icon={BarChart3} 
          title="Analytics Overview"
          action={{ 
            label: "Full Analytics", 
            onClick: () => navigate("/dashboard/analytics") 
          }}
        />
        {isLoading ? (
          <ChartsSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <ConversationVolumeChart data={summary.conversation_volume} />
            </div>
            <div>
              <ConversationOutcomesDonut data={summary.conversation_outcomes} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Channel Breakdown Section ───────────────────────────────────── */}
      <div>
        <SectionHeader 
          icon={Activity} 
          title="Channel Performance"
          action={{ 
            label: "Manage Channels", 
            onClick: () => navigate("/dashboard/channels") 
          }}
        />
        {isLoading ? (
          <Skeleton className="h-[180px] rounded-xl" />
        ) : (
          <ChannelBreakdown data={summary.channel_breakdown} />
        )}
      </div>

      {/* ─── Intelligence Section ────────────────────────────────────────── */}
      <div>
        <SectionHeader 
          icon={Zap} 
          title="AI Intelligence"
          action={{ 
            label: "View Reports", 
            onClick: () => navigate("/dashboard/analytics?tab=questions") 
          }}
        />
        <UnansweredAlert
          count={summary.unanswered_count}
          questions={summary.unanswered_questions ?? []}
        />
      </div>

      {/* ─── Recent Activity Section ─────────────────────────────────────── */}
      <div>
        <SectionHeader 
          icon={Target} 
          title="Recent Activity"
        />
        {isLoading ? (
          <RecentItemsSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <RecentConversations data={summary.recent_conversations} />
            <RecentLeads data={summary.recent_leads} />
          </div>
        )}
      </div>

      {/* ─── Chatbot Status Section ──────────────────────────────────────── */}
      <div>
        <SectionHeader 
          icon={Settings} 
          title="Chatbot Status"
          action={{ 
            label: "Configure", 
            onClick: () => navigate("/dashboard/chatbot") 
          }}
        />
        {isLoading ? (
          <Skeleton className="h-[140px] rounded-xl" />
        ) : (
          <ChatbotStatusCard
            status={summary.chatbot_status.status}
            lastActive={summary.chatbot_status.last_active ?? null}
            chatbotName={summary.chatbot_status.chatbot_name ?? null}
          />
        )}
      </div>
    </div>
  );
}
