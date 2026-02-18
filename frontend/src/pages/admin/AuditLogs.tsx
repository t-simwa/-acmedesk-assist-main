import { useState, useEffect } from "react";
import { adminApi, AuditLog, AuditLogFilters, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
import { AlertCircle, Loader2, Search, Download, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AuditLogs() {
  const { toast } = useToast();
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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            View system activity and changes
          </p>
        </div>
        <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-foreground font-medium mb-2">Access Denied</p>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            View system activity and changes
          </p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Audit Logs</h1>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">
            View system activity and changes
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-background rounded-xl border border-border p-4 shadow-soft-sm">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-4 sm:flex-wrap">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <Label htmlFor="action-filter" className="text-xs sm:text-sm">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="action-filter" className="mt-1.5 min-h-[44px]">
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
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <Label htmlFor="resource-type-filter" className="text-xs sm:text-sm">Resource Type</Label>
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger id="resource-type-filter" className="mt-1.5 min-h-[44px]">
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
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <Label htmlFor="status-filter" className="text-xs sm:text-sm">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="mt-1.5 min-h-[44px]">
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
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Button onClick={handleFilter} size="sm" className="flex-1 sm:flex-initial min-h-[44px]">
              <Search size={16} className="mr-2" />
              Filter
            </Button>
            <Button onClick={handleClearFilters} variant="outline" size="sm" className="flex-1 sm:flex-initial min-h-[44px]">
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="bg-background rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground">No audit logs found.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-background rounded-xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                        {log.action}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(log.status)} className="text-xs">
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground break-words">
                      {log.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span>User:</span>
                    <span className="text-foreground">{log.user_email || log.user_id || "System"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Resource:</span>
                    <span className="text-foreground">{log.resource_type}</span>
                  </div>
                  {log.resource_name && (
                    <div className="flex items-center justify-between">
                      <span>Name:</span>
                      <span className="text-foreground truncate ml-2">{log.resource_name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Time:</span>
                    <span className="text-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="bg-background rounded-xl border border-border shadow-soft-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {log.user_email || log.user_id || "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{log.resource_type}</div>
                        {log.resource_name && (
                          <div className="text-xs text-muted-foreground">{log.resource_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={log.description}>
                        {log.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="flex-1 sm:flex-initial min-h-[44px]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="flex-1 sm:flex-initial min-h-[44px]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
