import { useQuery } from "@tanstack/react-query";
import { superAdminApi, SuperAdminClients } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SuperAdminClients() {
  const { data, isLoading, error } = useQuery<SuperAdminClients>({
    queryKey: ["super-admin", "clients"],
    queryFn: superAdminApi.getClients,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load clients. Ensure you are logged in as a super admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const rows = data?.clients ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Client Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            View all client tenants, inspect usage, and (in future) impersonate or suspend
            accounts.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Business
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                Owner Email
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Plan
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                Status
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                Conversations (Month)
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden 2xl:table-cell">
                MRR
              </th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                <td className="px-3 py-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{row.business_name}</span>
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(row.join_date).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground truncate">
                    {row.owner_email ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm">
                  <span className="text-xs text-muted-foreground">{row.plan ?? "—"}</span>
                </td>
                <td className="px-3 py-3 text-sm hidden xl:table-cell">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading tracking-wide bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm hidden xl:table-cell">
                  <span className="text-xs text-muted-foreground font-mono">
                    {row.conversations_this_month.toLocaleString()}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm hidden 2xl:table-cell">
                  <span className="text-xs text-muted-foreground font-mono">
                    ${row.mrr_contribution.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-sm">
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      aria-label={`View ${row.business_name}`}
                    >
                      View
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline text-amber-500"
                      aria-label={`Impersonate ${row.business_name}`}
                    >
                      Impersonate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile list */}
        <div className="sm:hidden divide-y">
          {rows.map((row) => (
            <div key={row.id} className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{row.business_name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ${row.mrr_contribution.toFixed(0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {row.owner_email ?? "No owner email"} ·{" "}
                  {row.plan ? `${row.plan} plan` : "No plan"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

