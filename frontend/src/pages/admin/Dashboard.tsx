import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraggableDashboard } from "@/components/admin/DraggableDashboard";
import { ApiError } from "@/lib/api";
import { useAnalyticsSummary, useTopQueries } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { NetworkErrorState } from "@/components/error/NetworkErrorState";
import { HelpIcon } from "@/components/help/HelpIcon";
import { OnboardingTour, TourStep } from "@/components/help/OnboardingTour";
import { cn } from "@/lib/utils";

interface DashboardStat {
  label: string;
  value: string | number;
  id: string;
}

interface TopQuery {
  question: string;
  count: number;
  answered: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStat[]>([
    { label: "Conversations Today", value: "0", id: "stats" },
    { label: "Documents Indexed", value: "0", id: "documents" },
    { label: "Resolution Rate", value: "0%", id: "resolution" },
    { label: "Active Users", value: "0", id: "users" },
  ]);
  const [recentQueries, setRecentQueries] = useState<TopQuery[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(["stats", "queries"]);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useAnalyticsSummary(1);

  const {
    data: topQueriesResponse,
    isLoading: queriesLoading,
    error: queriesError,
    refetch: refetchQueries,
  } = useTopQueries(5);

  const loading = summaryLoading || queriesLoading;
  const hasError = summaryError || queriesError;

  const conversationsValue = summary?.conversations_by_day[summary.conversations_by_day.length - 1]?.count || 0;
  const documentsValue = summary?.total_conversations || 0;
  const resolutionValue = summary?.resolution_rate?.percentage || 0;
  const usersValue = summary?.total_messages || 0;

  const conversationsCount = useCountUp(conversationsValue, 1000, 0, "");
  const documentsCount = useCountUp(documentsValue, 1000, 0, "");
  const resolutionCount = useCountUp(resolutionValue, 1000, 1, "%");
  const usersCount = useCountUp(usersValue, 1000, 0, "");

  useEffect(() => {
    if (summary) {
      setStats([
        { label: "Conversations Today", value: conversationsCount, id: "stats" },
        { label: "Documents Indexed", value: documentsCount, id: "documents" },
        { label: "Resolution Rate", value: resolutionCount, id: "resolution" },
        { label: "Active Users", value: usersCount, id: "users" },
      ]);
    }
  }, [summary, conversationsCount, documentsCount, resolutionCount, usersCount]);

  useEffect(() => {
    if (topQueriesResponse) {
      setRecentQueries(
        (topQueriesResponse.queries || []).map((q) => ({
          question: q.query,
          count: q.count,
          answered: q.resolved_percentage > 50,
        }))
      );
    }
  }, [topQueriesResponse]);

  const handleReorder = useCallback((newOrder: string[]) => {
    setWidgetOrder(newOrder);
    localStorage.setItem("dashboard-widget-order", JSON.stringify(newOrder));
  }, []);

  useEffect(() => {
    const savedOrder = localStorage.getItem("dashboard-widget-order");
    if (savedOrder) {
      try {
        setWidgetOrder(JSON.parse(savedOrder));
      } catch {
        // ignore
      }
    }
  }, []);

  const statsWidget = (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        "min-w-0"
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.id}
          className={cn(
            "rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5",
            "transition-colors hover:border-border/70 hover:bg-muted/30",
            "min-w-0"
          )}
          role="region"
          aria-label={stat.label}
        >
          {loading ? (
            <Skeleton className="h-8 w-16 sm:h-9 sm:w-20 mb-2" />
          ) : (
            <p
              className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground leading-none mb-1.5"
              aria-live="polite"
              aria-atomic="true"
            >
              {stat.value}
            </p>
          )}
          <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );

  const queriesWidget = (
    <section
      className={cn(
        "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
        "min-w-0"
      )}
      aria-labelledby="top-questions-heading"
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <h2
            id="top-questions-heading"
            className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            Top questions today
          </h2>
          <HelpIcon
            content="Most frequently asked questions from today. 'Resolved' = answered by the bot; 'Escalated' = needed human help."
            side="right"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 sm:h-8 sm:w-8"
          onClick={() => {
            refetchSummary();
            refetchQueries();
          }}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="p-4 sm:p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 sm:h-12 rounded-lg" />
            ))}
          </div>
        ) : recentQueries.length === 0 ? (
          <div className="px-4 sm:px-5 py-8 sm:py-10 text-center">
            <p className="text-[13px] text-muted-foreground">No queries yet</p>
            <p className="text-[12px] text-muted-foreground/80 mt-1">Activity will appear here</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {recentQueries.map((q, i) => (
              <li key={i} className="px-4 sm:px-5 py-3.5 sm:py-4 min-h-[56px] sm:min-h-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex gap-3 min-w-0 flex-1">
                  <span className="text-[12px] text-muted-foreground shrink-0 w-5 tabular-nums">
                    {i + 1}
                  </span>
                  <p className="text-[13px] sm:text-sm text-foreground break-words line-clamp-2 sm:line-clamp-1">
                    {q.question}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 pl-8 sm:pl-0 shrink-0">
                  <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                    {q.count} ask{q.count === 1 ? "" : "s"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap",
                      q.answered
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {q.answered ? "Resolved" : "Escalated"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  const widgetMap: Record<string, { id: string; component: JSX.Element }> = {
    stats: { id: "stats", component: statsWidget },
    queries: { id: "queries", component: queriesWidget },
  };

  const orderedWidgets = widgetOrder
    .map((id) => widgetMap[id])
    .filter((w): w is { id: string; component: JSX.Element } => w !== undefined);

  if (hasError && !loading && !summary && !topQueriesResponse) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground max-w-xl">
            Overview of your support chatbot performance
          </p>
        </header>
        <NetworkErrorState
          error={(summaryError || queriesError) as ApiError}
          onRetry={() => {
            refetchSummary();
            refetchQueries();
          }}
          title="Failed to load dashboard data"
          description="We couldn't load your dashboard data. Please try again."
        />
      </div>
    );
  }

  const tourSteps: TourStep[] = [
    {
      id: "dashboard-overview",
      target: "h1",
      title: "Welcome to AcmeDesk Assist!",
      content: "This is your dashboard where you can monitor your chatbot's performance. Let's take a quick tour of the key features.",
      position: "bottom",
    },
    {
      id: "stats-widget",
      target: '[role="region"][aria-label*="Conversations"]',
      title: "Key Metrics",
      content: "These cards show important metrics: conversations today, documents indexed, resolution rate, and active users. They update in real-time.",
      position: "bottom",
    },
    {
      id: "top-questions",
      target: "#top-questions-heading",
      title: "Top Questions",
      content: "See the most frequently asked questions. 'Resolved' = answered by the bot; 'Escalated' = needed human help.",
      position: "bottom",
    },
  ];

  return (
    <div className="flex flex-col w-full min-w-0">
      <OnboardingTour
        steps={tourSteps}
        onComplete={() => {}}
        onSkip={() => {}}
      />
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground max-w-xl">
              Support chatbot performance at a glance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpIcon
              content="Key metrics and top questions. Drag widgets to reorder. Toggle auto-refresh below."
              side="left"
              className="shrink-0"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
              className={cn(
                "gap-2 shrink-0",
                "min-h-[44px] sm:min-h-9",
                "w-full sm:w-auto"
              )}
            >
              <RefreshCw className={cn("h-4 w-4 shrink-0", isPolling && "animate-spin")} />
              <span className="text-[13px] sm:text-sm truncate">
                {isPolling ? "Auto-refresh on" : "Auto-refresh off"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <DraggableDashboard items={orderedWidgets} onReorder={handleReorder} />
    </div>
  );
}
