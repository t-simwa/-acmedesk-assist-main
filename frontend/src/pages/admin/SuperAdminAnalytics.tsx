import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuperAdminAnalytics() {
  // For now this page is UI-only and uses placeholder content.
  // It can be wired to real /api/super-admin analytics endpoints in a later milestone.

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Platform Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Revenue, growth, usage, and client health metrics aggregated across all tenants.
          </p>
        </div>
      </div>

      {/* Top-level metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {["MRR", "ARR", "Churn Rate", "Net Revenue Retention"].map((label) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                {label}
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                <Skeleton className="h-7 w-24" />
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Revenue Overview
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              MRR, ARR, and revenue by plan over the last 12 months.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
            <div className="h-[220px] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Revenue chart placeholder — connect to super admin analytics data later.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Growth & Activation
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              New signups, activation rate, and trial-to-paid conversion.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
            <div className="h-[220px] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Growth charts placeholder — signups and activation funnel.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage & Client health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Usage Analytics
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Conversations per day, average per client, and API cost per day.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6">
            <div className="h-[220px] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Usage timeline + cost per conversation placeholder.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <CardTitle className="text-sm sm:text-base font-semibold font-heading text-foreground">
              Client Health Segments
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              High / normal / low usage segments and churn-risk clients.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-5 sm:py-6 space-y-3">
            <div className="space-y-2">
              {["High usage", "Normal", "Low usage", "Churn risk"].map((segment) => (
                <div key={segment} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{segment}</span>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

