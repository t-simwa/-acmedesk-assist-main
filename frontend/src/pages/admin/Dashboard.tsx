import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraggableDashboard } from "@/components/admin/DraggableDashboard";
import { ApiError } from "@/lib/api";
import { useAnalyticsSummary, useTopQueries } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";

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

  // Use React Query for dashboard data with automatic caching and refetching
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useAnalyticsSummary(1); // Today's data

  const {
    data: topQueriesResponse,
    isLoading: queriesLoading,
    refetch: refetchQueries,
  } = useTopQueries(5);

  const loading = summaryLoading || queriesLoading;

  // Extract raw numeric values for counting animations
  const conversationsValue = summary?.conversations_by_day[summary.conversations_by_day.length - 1]?.count || 0;
  const documentsValue = summary?.total_conversations || 0;
  const resolutionValue = summary?.resolution_rate?.percentage || 0;
  const usersValue = summary?.total_messages || 0;

  // Animated counting values
  const conversationsCount = useCountUp(conversationsValue, 1000, 0, "");
  const documentsCount = useCountUp(documentsValue, 1000, 0, "");
  const resolutionCount = useCountUp(resolutionValue, 1000, 1, "%");
  const usersCount = useCountUp(usersValue, 1000, 0, "");

  // Update stats when data changes
  useEffect(() => {
    if (summary) {
      setStats([
        {
          label: "Conversations Today",
          value: conversationsCount,
          id: "stats",
        },
        {
          label: "Documents Indexed",
          value: documentsCount,
          id: "documents",
        },
        {
          label: "Resolution Rate",
          value: resolutionCount,
          id: "resolution",
        },
        {
          label: "Active Users",
          value: usersCount,
          id: "users",
        },
      ]);
    }
  }, [summary, conversationsCount, documentsCount, resolutionCount, usersCount]);

  // Update queries when data changes
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

  const handleReorder = (newOrder: string[]) => {
    setWidgetOrder(newOrder);
    // In a real app, you'd save this to localStorage or backend
    localStorage.setItem("dashboard-widget-order", JSON.stringify(newOrder));
  };

  // Load saved widget order on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem("dashboard-widget-order");
    if (savedOrder) {
      try {
        setWidgetOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error("Error loading widget order:", e);
      }
    }
  }, []);

  const statsWidget = (
    <div className="grid grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-background rounded-xl border border-border/40 p-8 hover:border-border/60 transition-all duration-200"
          role="region"
          aria-label={stat.label}
        >
          {loading ? (
            <Skeleton className="h-8 w-20 mb-3" />
          ) : (
            <div
              className="text-3xl font-semibold text-foreground tracking-tight mb-3 leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {stat.value}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-[0.05em]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );

  const queriesWidget = (
    <section
      className="bg-background rounded-xl border border-border shadow-soft-sm"
      aria-labelledby="top-questions-heading"
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 id="top-questions-heading" className="text-[15px] font-semibold text-foreground">
          Top Questions Today
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            refetchSummary();
            refetchQueries();
          }}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recentQueries.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No queries available</div>
        ) : (
          recentQueries.map((q, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground w-5">{i + 1}</span>
                <span className="text-[14px] text-foreground">{q.question}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] text-muted-foreground">{q.count} asks</span>
                <span
                  className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${
                    q.answered
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {q.answered ? "Resolved" : "Escalated"}
                </span>
              </div>
            </div>
          ))
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
    .filter((widget) => widget !== undefined);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Overview of your support chatbot performance
          </p>
        </div>
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

      <DraggableDashboard items={orderedWidgets} onReorder={handleReorder} />
    </div>
  );
}
