import { useState, useEffect } from "react";
import { adminApi, TeamMember, TeamMemberInviteRequest, ApiError } from "@/lib/api";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Mail, UserPlus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "owner") return "default";
  if (role === "admin") return "secondary";
  return "outline";
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "accepted") return "default";
  if (status === "pending") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function TeamManagement() {
  const { toast } = useToast();
  const { hasPermission } = useRole();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "agent">("agent");

  const canInvite = hasPermission("team:invite");
  const canRemove = hasPermission("team:remove");
  const canUpdateRole = hasPermission("team:write");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.listTeamMembers();
      setMembers(response.members);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Please enter an email address", variant: "destructive" });
      return;
    }
    try {
      setInviting(true);
      await adminApi.inviteTeamMember({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
      } as TeamMemberInviteRequest);
      toast({ title: "Invitation sent", description: `Sent to ${inviteEmail}`, variant: "success" });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("agent");
      await fetchMembers();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Failed to send invitation", description: apiError?.message || "An error occurred", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;
    try {
      setRemoving(true);
      await adminApi.removeTeamMember(selectedMember.id);
      toast({ title: "Member removed", description: `${selectedMember.email} has been removed`, variant: "success" });
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Failed to remove", description: apiError?.message || "An error occurred", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: "owner" | "admin" | "agent") => {
    try {
      setUpdatingRole(memberId);
      await adminApi.updateTeamMemberRole(memberId, { role: newRole });
      toast({ title: "Role updated", variant: "success" });
      await fetchMembers();
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Failed to update role", description: apiError?.message, variant: "destructive" });
    } finally {
      setUpdatingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full min-w-0">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Team</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">Manage members and roles</p>
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Team</h1>
            <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground max-w-xl">
              Manage team members and their roles
            </p>
          </div>
          {canInvite && (
            <Button
              onClick={() => setInviteDialogOpen(true)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] rounded-xl gap-2"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              Invite member
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
          {members.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60",
                "bg-muted/20 py-12 px-6 text-center min-h-[200px]"
              )}
            >
              <UserPlus className="h-10 w-10 text-muted-foreground/70 mb-4" />
              <p className="text-sm font-medium text-foreground/90">No team members yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">Invite someone to get started</p>
              {canInvite && (
                <Button onClick={() => setInviteDialogOpen(true)} className="mt-4 rounded-xl" size="sm">
                  Invite member
                </Button>
              )}
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className={cn(
                  "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
                  "p-4 sm:p-5 transition-colors hover:border-border/70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{member.name || "—"}</p>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">{member.email}</p>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedMember(member);
                        setRemoveDialogOpen(true);
                      }}
                      disabled={removing}
                      className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${member.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Role</span>
                    {canUpdateRole ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleUpdateRole(member.id, v as "owner" | "admin" | "agent")}
                        disabled={updatingRole === member.id}
                      >
                        <SelectTrigger className="w-[120px] h-9 rounded-xl text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={roleBadgeVariant(member.role)} className="rounded-full text-[11px] capitalize">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</span>
                    <Badge variant={statusBadgeVariant(member.status)} className="rounded-full text-[11px] capitalize">
                      {member.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mt-3">
                  Invited {new Date(member.invited_at).toLocaleDateString()}
                </p>
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
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Invited</TableHead>
                  <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <UserPlus className="h-10 w-10 mb-3 opacity-60" />
                        <p className="text-sm font-medium text-foreground/80">No team members yet</p>
                        <p className="text-[13px] mt-1">Invite someone to get started</p>
                        {canInvite && (
                          <Button onClick={() => setInviteDialogOpen(true)} variant="outline" className="mt-4 rounded-xl" size="sm">
                            Invite member
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} className="border-border/50">
                      <TableCell className="font-medium text-foreground">{member.name || "—"}</TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        {canUpdateRole ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleUpdateRole(member.id, v as "owner" | "admin" | "agent")}
                            disabled={updatingRole === member.id}
                          >
                            <SelectTrigger className="w-[110px] h-9 rounded-xl text-[13px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={roleBadgeVariant(member.role)} className="rounded-full text-[11px] capitalize">
                            {member.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(member.status)} className="rounded-full text-[11px] capitalize">
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {new Date(member.invited_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedMember(member);
                              setRemoveDialogOpen(true);
                            }}
                            disabled={removing}
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${member.email}`}
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

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Invite team member</DialogTitle>
            <DialogDescription className="text-[13px]">
              They will receive an email with instructions to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-[13px] font-medium">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name" className="text-[13px] font-medium">Name (optional)</Label>
              <Input
                id="invite-name"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-[13px] font-medium">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "owner" | "admin" | "agent")}>
                <SelectTrigger id="invite-role" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner — Full access (cannot be removed)</SelectItem>
                  <SelectItem value="admin">Admin — Manage team & settings</SelectItem>
                  <SelectItem value="agent">Agent — Inbox & conversations only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px]">
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px] gap-2"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {selectedMember?.email} from the team? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px] m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl w-full sm:w-auto min-h-[44px] sm:min-h-[40px] m-0 gap-2"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
