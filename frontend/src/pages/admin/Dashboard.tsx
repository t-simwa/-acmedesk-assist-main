import { useState } from "react";
import { MessageSquare, Users, Percent, Clock, TrendingUp } from "lucide-react";
import { SetupChecklistBanner } from "@/components/onboarding/SetupChecklistBanner";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { KPICard } from "@/components/dashboard/KPICard";
import { ConversationVolumeChart } from "@/components/dashboard/ConversationVolumeChart";
import { ConversationOutcomesDonut } from "@/components/dashboard/ConversationOutcomesDonut";
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { RecentLeads } from "@/components/dashboard/RecentLeads";
import { UnansweredAlert } from "@/components/dashboard/UnansweredAlert";
import { ChatbotStatusCard } from "@/components/dashboard/ChatbotStatusCard";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { ApiError } from "@/lib/api";

// Mock data for when API is unavailable
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

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("7days");
  
  const { data, isLoading, error, refetch } = useDashboardSummary(dateRange);

  const summary = data || MOCK_DATA;

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

  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" />
          <DateRangeFilter value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
        </div>
      </header>

      {/* Setup Checklist Banner */}
      <SetupChecklistBanner className="mb-6" />

      {/* 7.2.1 - Setup Checklist Card (handled by SetupChecklistBanner above) */}

      {/* 7.2.3 - KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : (
          <>
            <KPICard
              label="Total Conversations"
              value={summary.total_conversations.toLocaleString()}
              trend={summary.conversations_trend}
              trendLabel="vs last period"
              icon={<MessageSquare className="w-5 h-5" />}
            />
            <KPICard
              label="Leads Captured"
              value={summary.leads_captured.toString()}
              trend={summary.leads_trend}
              trendLabel="vs last period"
              icon={<Users className="w-5 h-5" />}
            />
            <KPICard
              label="Resolution Rate"
              value={`${summary.resolution_rate}%`}
              trend={summary.resolution_trend}
              trendLabel="vs last period"
              icon={<Percent className="w-5 h-5" />}
            />
            <KPICard
              label="Avg Response Time"
              value={summary.avg_response_time}
              trend={summary.response_time_trend}
              trendLabel="vs last period (lower is better)"
              icon={<Clock className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* Charts Row - 7.2.4 & 7.2.5 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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

      {/* 7.2.6 - Channel Breakdown */}
      <div className="mb-6">
        {isLoading ? (
          <Skeleton className="h-[180px] rounded-xl" />
        ) : (
          <ChannelBreakdown data={summary.channel_breakdown} />
        )}
      </div>

      {/* 7.2.10 - Unanswered Questions Alert */}
      <div className="mb-6">
        <UnansweredAlert count={summary.unanswered_count} />
      </div>

      {/* 7.2.11 - Chatbot Status Card */}
      <div className="mb-6">
        {isLoading ? (
          <Skeleton className="h-[140px] rounded-xl" />
        ) : (
          <ChatbotStatusCard
            status={summary.chatbot_status.status}
            lastActive={summary.chatbot_status.last_active}
            chatbotName={summary.chatbot_status.chatbot_name}
          />
        )}
      </div>

      {/* Recent Items Row - 7.2.7 & 7.2.8 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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
