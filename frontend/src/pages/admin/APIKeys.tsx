import { useState, useEffect } from "react";
import { adminApi, APIKey, APIKeyCreateRequest, ApiError } from "@/lib/api";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Key, Plus, Trash2, Copy, Check, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function APIKeys() {
  const { toast } = useToast();
  const { hasPermission } = useRole();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const [keyName, setKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);

  const canRead = hasPermission("api_keys:read");
  const canCreate = hasPermission("api_keys:write");
  const canRevoke = hasPermission("api_keys:revoke");

  useEffect(() => {
    if (canRead) fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.listAPIKeys();
      setKeys(response.keys);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!keyName.trim()) {
      toast({ title: "Name required", description: "Please enter a name for the API key", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      const payload: APIKeyCreateRequest = { name: keyName.trim(), expires_in_days: expiresInDays };
      const response = await adminApi.createAPIKey(payload);
      setNewKey(response.key);
      toast({ title: "API key created", description: "Store it securely — it won't be shown again", variant: "success" });
      setKeyName("");
      setExpiresInDays(undefined);
      await fetchKeys();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Failed to create API key", description: apiError?.message || "An error occurred", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;
    try {
      setRevoking(true);
      await adminApi.revokeAPIKey(selectedKey.id);
      toast({ title: "API key revoked", description: `${selectedKey.name} has been revoked`, variant: "success" });
      setRevokeDialogOpen(false);
      setSelectedKey(null);
      await fetchKeys();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Failed to revoke", description: apiError?.message || "An error occurred", variant: "destructive" });
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(key);
    toast({ title: "Copied", description: "API key copied to clipboard", variant: "success" });
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const isExpired = (key: APIKey) => key.expires_at ? new Date(key.expires_at) < new Date() : false;

  if (!canRead) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">API keys</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">Manage API access keys</p>
        </header>
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60",
            "bg-muted/20 py-12 px-6 text-center min-h-[200px]"
          )}
        >
          <AlertCircle className="h-10 w-10 text-muted-foreground/70 mb-4" />
          <p className="text-sm font-medium text-foreground/90">Access denied</p>
          <p className="text-[13px] text-muted-foreground mt-1">You don&apos;t have permission to view API keys.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">API keys</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">Manage API access keys</p>
        </header>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">API keys</h1>
            <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground max-w-xl">
              Manage API access keys for programmatic access
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] rounded-xl gap-2"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Create API key
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isMobile ? (
        <div className="space-y-3 min-w-0">
          {keys.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60",
                "bg-muted/20 py-12 px-6 text-center min-h-[200px]"
              )}
            >
              <KeyRound className="h-10 w-10 text-muted-foreground/70 mb-4" />
              <p className="text-sm font-medium text-foreground/90">No API keys yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">Create one to get started</p>
              {canCreate && (
                <Button onClick={() => setCreateDialogOpen(true)} className="mt-4 rounded-xl" size="sm">
                  Create API key
                </Button>
              )}
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className={cn(
                  "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
                  "p-4 sm:p-5 transition-colors hover:border-border/70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{key.name}</p>
                    <code className="mt-1.5 inline-block text-[12px] bg-muted/80 px-2 py-1 rounded-lg break-all font-mono">
                      {key.key_prefix}…
                    </code>
                  </div>
                  {canRevoke && key.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedKey(key); setRevokeDialogOpen(true); }}
                      disabled={revoking}
                      className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                      aria-label={`Revoke ${key.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                  {isExpired(key) ? (
                    <Badge variant="destructive" className="rounded-full text-[11px]">Expired</Badge>
                  ) : key.is_active ? (
                    <Badge variant="default" className="rounded-full text-[11px]">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full text-[11px]">Revoked</Badge>
                  )}
                </div>
                <div className="space-y-1.5 text-[12px] text-muted-foreground mt-3">
                  <div className="flex justify-between gap-2">
                    <span>Last used</span>
                    <span className="text-foreground">
                      {key.last_used_at ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true }) : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Expires</span>
                    <span className="text-foreground">{key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never"}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Created</span>
                    <span className="text-foreground">{new Date(key.created_at).toLocaleDateString()}</span>
                  </div>
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
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Key prefix</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last used</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Expires</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created</TableHead>
                  <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <KeyRound className="h-10 w-10 mb-3 opacity-60" />
                        <p className="text-sm font-medium text-foreground/80">No API keys yet</p>
                        <p className="text-[13px] mt-1">Create one to get started</p>
                        {canCreate && (
                          <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="mt-4 rounded-xl" size="sm">
                            Create API key
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((key) => (
                    <TableRow key={key.id} className="border-border/50">
                      <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-[12px] bg-muted/80 px-2 py-1 rounded-lg font-mono">{key.key_prefix}…</code>
                      </TableCell>
                      <TableCell>
                        {isExpired(key) ? (
                          <Badge variant="destructive" className="rounded-full text-[11px]">Expired</Badge>
                        ) : key.is_active ? (
                          <Badge variant="default" className="rounded-full text-[11px]">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full text-[11px]">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {key.last_used_at ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true }) : "Never"}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRevoke && key.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedKey(key); setRevokeDialogOpen(true); }}
                            disabled={revoking}
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                            aria-label={`Revoke ${key.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Create API key</DialogTitle>
            <DialogDescription className="text-[13px]">
              Store it securely — you won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4 py-4">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                <Label className="text-[13px] font-medium">Your API key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background px-3 py-2 rounded-xl text-[13px] font-mono break-all border border-border/50">
                    {newKey}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => handleCopyKey(newKey)} className="shrink-0 rounded-xl h-9 w-9">
                    {copiedKeyId === newKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[12px] text-muted-foreground">Store this key securely. It won&apos;t be shown again.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateDialogOpen(false); setNewKey(null); }} className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px]">
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name" className="text-[13px] font-medium">Name *</Label>
                  <Input
                    id="key-name"
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Production API Key"
                    className="rounded-xl"
                  />
                  <p className="text-[12px] text-muted-foreground">A descriptive name to identify this key</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires-days" className="text-[13px] font-medium">Expires in (days, optional)</Label>
                  <Input
                    id="expires-days"
                    type="number"
                    value={expiresInDays ?? ""}
                    onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="30"
                    min={1}
                    max={365}
                    className="rounded-xl"
                  />
                  <p className="text-[12px] text-muted-foreground">Leave empty for no expiration</p>
                </div>
              </div>
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px]">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || !keyName.trim()} className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px] gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {creating ? "Creating…" : "Create key"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke &quot;{selectedKey?.name}&quot;? This cannot be undone and any apps using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px] m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px] m-0 gap-2"
            >
              {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {revoking ? "Revoking…" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
