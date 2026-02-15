import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { analyticsApi, ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface ChartDataPoint {
  day: string;
  conversations?: number;
  rate?: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<ChartDataPoint[]>([]);
  const [resolutionData, setResolutionData] = useState<ChartDataPoint[]>([]);
  const [topCategories, setTopCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [resolutionRate, setResolutionRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const summary = await analyticsApi.getSummary(7);

        // Transform conversations_by_day to chart format
        // Convert ISO dates to day names (Mon, Tue, etc.)
        const transformedConversations = summary.conversations_by_day.map((item) => {
          const date = new Date(item.date);
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return {
            day: dayNames[date.getDay()],
            conversations: item.count,
          };
        });

        // For resolution rate, the backend returns an overall percentage
        // We'll use the same percentage for all days in the chart
        const overallResolutionRate = summary.resolution_rate?.percentage || 0;
        const transformedResolution = summary.conversations_by_day.map((item) => {
          const date = new Date(item.date);
          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return {
            day: dayNames[date.getDay()],
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
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Chatbot usage and performance metrics
        </p>
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
          <h3 id="conversations-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">Conversations</h3>
          <p className="text-[13px] text-muted-foreground mb-6">Last 7 days</p>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <div role="img" aria-label="Bar chart showing conversations over the last 7 days">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={conversationData}>
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
                  <Bar dataKey="conversations" fill="hsl(228, 66%, 47%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Resolution rate chart */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-labelledby="resolution-chart-heading">
          <h3 id="resolution-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">Resolution Rate</h3>
          <p className="text-[13px] text-muted-foreground mb-6">Last 7 days</p>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
          ) : (
            <div role="img" aria-label="Line chart showing resolution rate over the last 7 days">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={resolutionData}>
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
    </div>
  );
}
