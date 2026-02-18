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
import { AlertCircle, Loader2, Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  // Create form state
  const [keyName, setKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);

  const canRead = hasPermission("api_keys:read");
  const canCreate = hasPermission("api_keys:write");
  const canRevoke = hasPermission("api_keys:revoke");

  useEffect(() => {
    if (canRead) {
      fetchKeys();
    }
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
      console.error("Error fetching API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!keyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const payload: APIKeyCreateRequest = {
        name: keyName.trim(),
        expires_in_days: expiresInDays,
      };
      const response = await adminApi.createAPIKey(payload);
      setNewKey(response.key);
      toast({
        title: "API key created",
        description: "Store this key securely - it won't be shown again",
        variant: "success",
      });
      setKeyName("");
      setExpiresInDays(undefined);
      await fetchKeys();
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: "Failed to create API key",
        description: apiError?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;

    try {
      setRevoking(true);
      await adminApi.revokeAPIKey(selectedKey.id);
      toast({
        title: "API key revoked",
        description: `${selectedKey.name} has been revoked`,
        variant: "success",
      });
      setRevokeDialogOpen(false);
      setSelectedKey(null);
      await fetchKeys();
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: "Failed to revoke API key",
        description: apiError?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
      variant: "success",
    });
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const isExpired = (key: APIKey) => {
    if (!key.expires_at) return false;
    return new Date(key.expires_at) < new Date();
  };

  if (!canRead) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage API access keys
          </p>
        </div>
        <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-foreground font-medium mb-2">Access Denied</p>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view API keys.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage API access keys
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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">API Keys</h1>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">
            Manage API access keys
          </p>
        </div>
        {canCreate && (
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            <Plus size={16} className="mr-2" />
            Create API Key
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {isMobile ? (
        // Mobile Card View
        <div className="space-y-3">
          {keys.length === 0 ? (
            <div className="bg-background rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground">No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="bg-background rounded-xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{key.name}</h3>
                    <div className="mt-1.5">
                      <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                        {key.key_prefix}...
                      </code>
                    </div>
                  </div>
                  {canRevoke && key.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedKey(key);
                        setRevokeDialogOpen(true);
                      }}
                      disabled={revoking}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isExpired(key) ? (
                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                  ) : key.is_active ? (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Revoked</Badge>
                  )}
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span>Last Used:</span>
                    <span className="text-foreground">
                      {key.last_used_at
                        ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expires:</span>
                    <span className="text-foreground">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span className="text-foreground">
                      {new Date(key.created_at).toLocaleDateString()}
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
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No API keys yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.key_prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {isExpired(key) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : key.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.last_used_at
                        ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {canRevoke && key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedKey(key);
                            setRevokeDialogOpen(true);
                          }}
                          disabled={revoking}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access. Store it securely - you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Your API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono break-all">
                    {newKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyKey(newKey)}
                  >
                    {copiedKeyId === newKey ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Store this key securely. It won't be shown again.
                </p>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setNewKey(null);
                  }}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="key-name">Name *</Label>
                  <Input
                    id="key-name"
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="Production API Key"
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    A descriptive name to identify this key
                  </p>
                </div>
                <div>
                  <Label htmlFor="expires-days">Expires In (Days, Optional)</Label>
                  <Input
                    id="expires-days"
                    type="number"
                    value={expiresInDays || ""}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    placeholder="30"
                    min={1}
                    max={365}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Leave empty for no expiration
                  </p>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={creating || !keyName.trim()}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Key size={16} className="mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{selectedKey?.name}"? This action cannot be undone and any applications using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px] m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto min-h-[44px] m-0"
            >
              {revoking ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
