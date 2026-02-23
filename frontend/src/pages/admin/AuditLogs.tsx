import { useState, useEffect } from "react";
import { adminApi, AuditLog, AuditLogFilters, ApiError } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, FileText, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AuditLogs() {
  const { hasPermission } = useRole();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
  });
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canRead = hasPermission("audit_logs:read");

  useEffect(() => {
    if (canRead) {
      fetchLogs();
    }
  }, [offset, actionFilter, resourceTypeFilter, statusFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryFilters: AuditLogFilters = {
        ...filters,
        limit,
        offset,
      };
      if (actionFilter && actionFilter !== "all") queryFilters.action = actionFilter;
      if (resourceTypeFilter && resourceTypeFilter !== "all") queryFilters.resource_type = resourceTypeFilter;
      if (statusFilter && statusFilter !== "all") queryFilters.status = statusFilter;

      const response = await adminApi.listAuditLogs(queryFilters);
      setLogs(response.logs);
      setTotal(response.total);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to load audit logs");
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setOffset(0);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setActionFilter("all");
    setResourceTypeFilter("all");
    setStatusFilter("all");
    setOffset(0);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create") || action.includes("invite")) return "default";
    if (action.includes("update") || action.includes("change")) return "secondary";
    if (action.includes("delete") || action.includes("remove") || action.includes("revoke"))
      return "destructive";
    return "outline";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (!canRead) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Audit logs</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">View system activity and changes</p>
        </header>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12 px-6 text-center min-h-[200px]">
          <AlertCircle className="h-10 w-10 text-muted-foreground/70 mb-4" />
          <p className="text-sm font-medium text-foreground/90">Access denied</p>
          <p className="text-[13px] text-muted-foreground mt-1">You don&apos;t have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Audit logs</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">View system activity and changes</p>
        </header>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Audit logs</h1>
            <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground max-w-xl">View system activity and changes</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] rounded-xl gap-2" disabled>
            <Download className="h-4 w-4 shrink-0" />
            Export
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 sm:p-5 space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="action-filter" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="action-filter" className="rounded-xl min-h-[44px] sm:min-h-[40px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="invite">Invite</SelectItem>
                <SelectItem value="remove">Remove</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="api_key_create">API Key Create</SelectItem>
                <SelectItem value="api_key_revoke">API Key Revoke</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-type-filter" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Resource</Label>
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger id="resource-type-filter" className="rounded-xl min-h-[44px] sm:min-h-[40px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="conversation">Conversation</SelectItem>
                <SelectItem value="setting">Setting</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="rounded-xl min-h-[44px] sm:min-h-[40px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleFilter} size="sm" className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] rounded-xl gap-2">
              <Search className="h-4 w-4" />
              Filter
            </Button>
            <Button onClick={handleClearFilters} variant="outline" size="sm" className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] rounded-xl">
              Clear
            </Button>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3 min-w-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12 px-6 text-center min-h-[200px]">
              <FileText className="h-10 w-10 text-muted-foreground/70 mb-4" />
              <p className="text-sm font-medium text-foreground/90">No audit logs found</p>
              <p className="text-[13px] text-muted-foreground mt-1">Try adjusting filters or check back later</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border/50 bg-muted/10 overflow-hidden p-4 sm:p-5 transition-colors hover:border-border/70">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant={getActionBadgeVariant(log.action)} className="rounded-full text-[11px] capitalize">{log.action}</Badge>
                  <Badge variant={getStatusBadgeVariant(log.status)} className="rounded-full text-[11px] capitalize">{log.status}</Badge>
                </div>
                <p className="text-sm font-medium text-foreground break-words">{log.description}</p>
                <div className="space-y-1.5 text-[12px] text-muted-foreground pt-4 mt-4 border-t border-border/50">
                  <div className="flex justify-between gap-2"><span>User</span><span className="text-foreground truncate">{log.user_email || log.user_id || "System"}</span></div>
                  <div className="flex justify-between gap-2"><span>Resource</span><span className="text-foreground">{log.resource_type}</span></div>
                  {log.resource_name && <div className="flex justify-between gap-2"><span>Name</span><span className="text-foreground truncate">{log.resource_name}</span></div>}
                  <div className="flex justify-between gap-2"><span>Time</span><span className="text-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-muted/10 overflow-hidden min-w-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">User</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Resource</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-10 w-10 mb-3 opacity-60" />
                        <p className="text-sm font-medium text-foreground/80">No audit logs found</p>
                        <p className="text-[13px] mt-1">Try adjusting filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-border/50">
                      <TableCell className="text-[13px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</TableCell>
                      <TableCell>{log.user_email || log.user_id || "System"}</TableCell>
                      <TableCell><Badge variant={getActionBadgeVariant(log.action)} className="rounded-full text-[11px] capitalize">{log.action}</Badge></TableCell>
                      <TableCell><div><span className="font-medium text-[13px]">{log.resource_type}</span>{log.resource_name && <div className="text-[12px] text-muted-foreground">{log.resource_name}</div>}</div></TableCell>
                      <TableCell className="max-w-md"><span className="truncate block" title={log.description}>{log.description}</span></TableCell>
                      <TableCell><Badge variant={getStatusBadgeVariant(log.status)} className="rounded-full text-[11px] capitalize">{log.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border/50">
          <p className="text-[12px] sm:text-[13px] text-muted-foreground text-center sm:text-left">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] rounded-xl">Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[40px] rounded-xl">Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
