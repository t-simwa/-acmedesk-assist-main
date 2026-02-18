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
import { AlertCircle, Loader2, Mail, UserPlus, Trash2, Shield } from "lucide-react";
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

export default function TeamManagement() {
  const { toast } = useToast();
  const { hasPermission, isAdmin } = useRole();
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

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "analyst" | "viewer">("viewer");

  // Check permissions
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
      console.error("Error fetching team members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setInviting(true);
      const payload: TeamMemberInviteRequest = {
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
      };
      await adminApi.inviteTeamMember(payload);
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail}`,
        variant: "success",
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");
      await fetchMembers();
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: "Failed to send invitation",
        description: apiError?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;

    try {
      setRemoving(true);
      await adminApi.removeTeamMember(selectedMember.id);
      toast({
        title: "Member removed",
        description: `${selectedMember.email} has been removed from the team`,
        variant: "success",
      });
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: "Failed to remove member",
        description: apiError?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: "admin" | "analyst" | "viewer") => {
    try {
      setUpdatingRole(memberId);
      await adminApi.updateTeamMemberRole(memberId, { role: newRole });
      toast({
        title: "Role updated",
        description: "Team member role has been updated",
        variant: "success",
      });
      await fetchMembers();
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: "Failed to update role",
        description: apiError?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "analyst":
        return "secondary";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      case "expired":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team Management</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage team members and their roles
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
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Team Management</h1>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">
            Manage team members and their roles
          </p>
        </div>
        {canInvite && (
          <Button 
            onClick={() => setInviteDialogOpen(true)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            <UserPlus size={16} className="mr-2" />
            Invite Member
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
          {members.length === 0 ? (
            <div className="bg-background rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground">No team members yet. Invite someone to get started.</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="bg-background rounded-xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {member.name || "—"}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {member.email}
                    </p>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setRemoveDialogOpen(true);
                      }}
                      disabled={removing}
                      className="min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[120px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
                    {canUpdateRole ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleUpdateRole(member.id, value as "admin" | "analyst" | "viewer")
                        }
                        disabled={updatingRole === member.id}
                      >
                        <SelectTrigger className="w-full min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                    <Badge variant={getStatusBadgeVariant(member.status)}>
                      {member.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Invited: {new Date(member.invited_at).toLocaleDateString()}
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
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No team members yet. Invite someone to get started.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || "—"}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {canUpdateRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleUpdateRole(member.id, value as "admin" | "analyst" | "viewer")
                          }
                          disabled={updatingRole === member.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(member.status)}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.invited_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            setRemoveDialogOpen(true);
                          }}
                          disabled={removing}
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

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to a new team member. They will receive an email with instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-name">Name (Optional)</Label>
              <Input
                id="invite-name"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "admin" | "analyst" | "viewer")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="analyst">Analyst - Can read and write documents</SelectItem>
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setInviteDialogOpen(false)}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleInvite} 
              disabled={inviting || !inviteEmail.trim()}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {inviting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} className="mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.email} from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px] m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto min-h-[44px] m-0"
            >
              {removing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
