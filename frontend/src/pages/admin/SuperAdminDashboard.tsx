import { useQuery } from "@tanstack/react-query";
import { superAdminApi, SuperAdminDashboard } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminDashboard() {
  const { data, isLoading, error } = useQuery<SuperAdminDashboard>({
    queryKey: ["super-admin", "dashboard"],
    queryFn: superAdminApi.getDashboard,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load platform overview. Please try again or check your permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Platform Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            High-level metrics across all client tenants: MRR, activity, and system health.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data?.cards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                {card.label}
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                {card.value.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
                {card.suffix ? <span className="ml-1 text-xs font-normal">{card.suffix}</span> : null}
              </p>
              {typeof card.trend === "number" && (
                <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                  {card.trend >= 0 ? "+" : ""}
                  {card.trend.toFixed(1)}% vs last period
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MRR chart + status layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR chart placeholder */}
        <Card className="lg:col-span-2 rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              MRR — Last 12 Months
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              New MRR, churned MRR, and net MRR across all active clients.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
            <div className="h-[220px] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              MRR chart placeholder — connect to analytics chart library in a later milestone.
            </div>
          </CardContent>
        </Card>

        {/* System status */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              System Status
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              API latency, vector DB health, email delivery, and OpenAI API status.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-3">
            {data?.system_status.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    aria-hidden="true"
                    style={{
                      backgroundColor:
                        item.status === "operational"
                          ? "#22c55e"
                          : item.status === "degraded"
                          ? "#eab308"
                          : "#ef4444",
                    }}
                  />
                  <span className="text-xs font-medium text-foreground">{item.name}</span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {item.value ?? item.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent signups & failed jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Recent Signups
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Last 10 new client accounts created on the platform.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                      Business
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                      Plan
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                      Joined
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.recent_signups.map((row) => (
                    <tr key={row.tenant_id} className="cursor-pointer transition-colors hover:bg-muted/50">
                      <td className="px-3 py-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium truncate">{row.business_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {row.plan ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(row.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading tracking-wide bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile list */}
              <div className="sm:hidden divide-y">
                {data?.recent_signups.map((row) => (
                  <div key={row.tenant_id} className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{row.business_name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {row.plan ?? "—"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Joined {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Failed jobs (placeholder list) */}
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Recent Failed Jobs
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Failed document processing jobs across all tenants. Data is stubbed until the job
              queue is wired.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
            {data?.recent_failed_jobs.length ? (
              <div className="space-y-2">
                {data.recent_failed_jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {job.tenant_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(job.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-400 line-clamp-2">{job.error}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No failed jobs have been recorded yet. This section will populate once the
                background job queue is connected.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

