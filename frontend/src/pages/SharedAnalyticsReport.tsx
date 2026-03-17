import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { analyticsApi, type AnalyticsSummary } from "@/lib/api";

export default function SharedAnalyticsReport() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    analyticsApi
      .getSharedReport(token)
      .then((res) => setData(res))
      .catch((err) => {
        setError(err?.message ?? "Failed to load report.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Shared Analytics Report</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View this report without signing in. Share this link with your team.
            </p>
          </div>
          <Link to="/admin/analytics">
            <Button variant="outline" size="sm">
              Back to Analytics
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Unable to load report</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Conversations
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {data.total_conversations.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Messages
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {data.total_messages.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Satisfaction
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {data.user_satisfaction?.satisfaction_rate?.toFixed(1) ?? 0}%
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resolution Rate
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {data.resolution_rate?.percentage?.toFixed(1) ?? 0}%
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground">Conversation Volume</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This view is simplified. Full analytics are available only to signed-in users.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
