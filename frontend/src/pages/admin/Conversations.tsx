/**
 * Conversations — 7.4 (All 5 specs)
 * Filters, Stats Bar, Table, Detail Panel, Bulk Actions
 *
 * Redesigned with:
 * - Proper Tailwind design tokens (no hardcoded hex colors)
 * - Progressive column disclosure (no horizontal scrollbar)
 * - Mobile card list for <sm screens
 * - Collapsible advanced filters
 * - Responsive detail panel using Dialog
 * - Consistent aesthetic with the Leads page
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  MessageSquare, Search, X, ChevronDown, Download,
  Trash2, Tag, Clock,
  ThumbsUp, ThumbsDown, CheckCircle2,
  RefreshCw, ChevronLeft, ChevronRight,
  Flag, User, MoreHorizontal, Send,
  Mail, Phone, ExternalLink, FileText,
  SlidersHorizontal, AlertCircle, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useConversationsList, useConversationDetail,
  useUpdateConversationStatus, useAddConversationNote,
  useToggleConversationFlag, useBulkConversationAction,
} from "@/hooks/useConversations";
import {
  type ConversationListItem,
  type ConversationListFilters,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  active:       { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",       label: "Active" },
  resolved:     { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Resolved" },
  escalated:    { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   label: "Escalated" },
  abandoned:    { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",       label: "Abandoned" },
  needs_review: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Needs Review" },
};

const STATUSES = ["active", "resolved", "escalated", "abandoned", "needs_review"] as const;

const STAT_CARD_KEYS = ["total", "active", "resolved", "escalated", "abandoned", "needs_review"] as const;
const STAT_CARDS: { key: typeof STAT_CARD_KEYS[number]; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "total",        label: "Total",        icon: <MessageSquare size={18} />, accent: "from-blue-500/20 to-blue-500/0" },
  { key: "active",       label: "Active",       icon: <Clock size={18} />,         accent: "from-blue-500/20 to-blue-500/0" },
  { key: "resolved",     label: "Resolved",     icon: <CheckCircle2 size={18} />,  accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "escalated",    label: "Escalated",    icon: <AlertCircle size={18} />,   accent: "from-amber-500/20 to-amber-500/0" },
  { key: "abandoned",    label: "Abandoned",    icon: <X size={18} />,             accent: "from-gray-500/20 to-gray-500/0" },
  { key: "needs_review", label: "Needs Review", icon: <Flag size={18} />,          accent: "from-violet-500/20 to-violet-500/0" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDuration(mins: number | null): string {
  if (!mins) return "--";
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

function formatTimestamp(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function ConversationAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <div className={cn(
      sizes[size],
      "rounded-full bg-gradient-to-br from-primary/80 to-violet-600/80",
      "flex items-center justify-center font-bold text-white",
      "ring-2 ring-background shrink-0 select-none tracking-wide",
    )}>
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status, interactive }: { status: string; interactive?: boolean }) {
  const meta = STATUS_META[status] ?? STATUS_META.active;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold font-heading tracking-wide transition-colors",
      meta.badge,
      interactive && "cursor-pointer hover:brightness-125",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function ChannelPill({ channel }: { channel: string | null }) {
  if (!channel) return <span className="text-muted-foreground text-xs">--</span>;
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
      "text-[11px] font-medium",
      meta.className,
    )}>
      <ChannelIcon channel={channel} size={10} />
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}

function RatingIndicator({ rating }: { rating: string | null }) {
  if (rating === "positive") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
        <ThumbsUp size={12} />
        <span className="hidden xl:inline">Positive</span>
      </span>
    );
  }
  if (rating === "negative") {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-[11px] font-medium">
        <ThumbsDown size={12} />
        <span className="hidden xl:inline">Negative</span>
      </span>
    );
  }
  return <span className="text-muted-foreground/40 text-xs">--</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DETAIL PANEL (Dialog-based)
   ═══════════════════════════════════════════════════════════════════════════════ */

function DetailDialog({
  conversationId,
  open,
  onClose,
}: {
  conversationId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: rawDetail, isLoading } = useConversationDetail(conversationId);
  const detail = rawDetail ?? null;

  const updateStatus = useUpdateConversationStatus();
  const addNote = useAddConversationNote();
  const toggleFlag = useToggleConversationFlag();
  const { toast } = useToast();

  const [noteText, setNoteText] = useState("");
  const [isFlagged, setIsFlagged] = useState(detail?.is_flagged ?? false);
  const [localNotes, setLocalNotes] = useState<Array<{ text: string; time: string }>>([]);

  useEffect(() => {
    if (detail) setIsFlagged(detail.is_flagged);
  }, [detail]);

  // Reset state when opening a new conversation
  useEffect(() => {
    if (open) {
      setNoteText("");
      setLocalNotes([]);
    }
  }, [open, conversationId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!conversationId) return;
    try {
      await updateStatus.mutateAsync({ id: conversationId, status: newStatus });
      toast({ title: "Status updated", description: `Conversation marked as ${newStatus}` });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleFlag = async () => {
    if (!conversationId) return;
    const next = !isFlagged;
    setIsFlagged(next);
    try {
      await toggleFlag.mutateAsync(conversationId);
      toast({
        title: next ? "Flagged for training" : "Flag removed",
        description: next ? "Conversation added to training queue" : "Removed from training queue",
      });
    } catch {
      setIsFlagged(!next);
      toast({ title: "Error", description: "Failed to toggle flag", variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !conversationId) return;
    try {
      await addNote.mutateAsync({ id: conversationId, note: noteText.trim() });
      setLocalNotes(prev => [...prev, {
        text: noteText.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      setNoteText("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    }
  };

  const contact = detail?.contact;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent
        className={cn(
          "p-0 overflow-hidden flex flex-col gap-0",
          "max-w-[860px] w-[95vw] max-h-[92vh] sm:max-h-[88vh]",
          "bg-card border rounded-2xl",
        )}
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !detail ? (
          <div className="p-6 text-center">
            <MessageSquare size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Conversation not found</p>
          </div>
        ) : (
          <>
            {/* ── Contact Header ── */}
            <div className="shrink-0 p-5 sm:p-6 border-b space-y-4">
              <div className="flex items-start gap-3.5">
                <ConversationAvatar name={contact?.full_name ?? null} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <h2 className="font-heading text-base sm:text-lg font-bold text-foreground leading-none">
                      {contact?.full_name ?? "Anonymous"}
                    </h2>
                    <StatusBadge status={detail.status} />
                    <ChannelPill channel={detail.channel} />
                  </div>

                  {contact?.company && (
                    <p className="text-[13px] text-muted-foreground mb-2 flex items-center gap-1.5">
                      {contact.company}
                    </p>
                  )}

                  <div className="flex gap-4 flex-wrap text-[12px] text-muted-foreground">
                    {contact?.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail size={12} className="text-muted-foreground/60" />{contact.email}
                      </span>
                    )}
                    {contact?.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} className="text-muted-foreground/60" />{contact.phone}
                      </span>
                    )}
                    {detail.duration_minutes && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <Clock size={12} className="text-muted-foreground/60" />{formatDuration(detail.duration_minutes)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleFlag}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all border",
                      isFlagged
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
                    )}
                    title={isFlagged ? "Remove from training" : "Flag for training"}
                  >
                    <Flag size={12} fill={isFlagged ? "currentColor" : "none"} />
                    <span className="hidden sm:inline">{isFlagged ? "Flagged" : "Flag"}</span>
                  </button>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70 font-mono px-1">
                <span>{detail.message_count} messages</span>
                <span className="h-3 w-px bg-border" />
                <span>{detail.rating === "positive" ? "Positive rating" : detail.rating === "negative" ? "Negative rating" : "No rating"}</span>
                <span className="h-3 w-px bg-border" />
                <span>Started {relativeTime(detail.started_at)}</span>
                {detail.page_url && (
                  <>
                    <span className="h-3 w-px bg-border" />
                    <span className="flex items-center gap-1 text-primary">
                      <ExternalLink size={10} />
                      {detail.page_url.replace(/^https?:\/\//, "")}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* ── Two-column Body ── */}
            <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
              {/* LEFT: Transcript */}
              <div className="flex-1 overflow-auto p-4 sm:p-5 sm:border-r order-2 sm:order-1">
                <h3 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-4">
                  Transcript
                </h3>

                {detail.messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare size={20} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No messages in this conversation</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {detail.messages.map(msg => {
                      if (msg.role === "system") {
                        return (
                          <p key={msg.id} className="text-center text-xs text-muted-foreground italic py-1">
                            {msg.content}
                          </p>
                        );
                      }
                      const isUser = msg.role === "user";
                      return (
                        <div key={msg.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                          <div className="max-w-[85%] sm:max-w-[78%]">
                            <div className={cn(
                              "px-3.5 py-2.5 text-[13px] leading-relaxed",
                              isUser
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                : "bg-muted border rounded-2xl rounded-bl-md text-foreground",
                            )}>
                              {msg.content}
                            </div>
                            {/* Citations */}
                            {!isUser && msg.citations && msg.citations.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1.5">
                                {msg.citations.map((c, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/8 px-1.5 py-0.5 text-[10px] text-primary"
                                  >
                                    <FileText size={9} /> {c.source ?? "Source"}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Confidence + timestamp */}
                            <div className={cn(
                              "flex items-center gap-2 mt-1",
                              isUser ? "justify-end" : "justify-start",
                            )}>
                              {!isUser && msg.confidence_score != null && (
                                <span className={cn(
                                  "text-[9px] font-mono px-1 py-0.5 rounded",
                                  msg.confidence_score >= 0.9
                                    ? "text-emerald-400/70"
                                    : msg.confidence_score >= 0.7
                                      ? "text-amber-400/70"
                                      : "text-red-400/70",
                                )}>
                                  {Math.round(msg.confidence_score * 100)}%
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {formatTimestamp(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT: Contact + Timeline + Notes */}
              <div className="w-full sm:w-[40%] sm:max-w-[340px] overflow-auto p-4 sm:p-5 space-y-5 order-1 sm:order-2 border-b sm:border-b-0">

                {/* Contact info card */}
                <div className="rounded-lg border bg-muted/30 p-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                    Contact Info
                  </h4>
                  <div className="space-y-2.5">
                    {contact?.email && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Mail size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact?.phone && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Phone size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">{contact.phone}</span>
                      </div>
                    )}
                    {contact?.company && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <User size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">{contact.company}</span>
                      </div>
                    )}
                    {contact?.lead_status && (
                      <div className="flex items-center gap-2 text-[12px] pt-1.5 border-t border-dashed">
                        <span className="text-muted-foreground/70">Lead Status:</span>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase font-heading",
                          "bg-primary/10 text-primary border border-primary/20",
                        )}>
                          {contact.lead_status}
                        </span>
                      </div>
                    )}
                    {contact?.channels_used && contact.channels_used.length > 0 && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <ExternalLink size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">{contact.channels_used.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                    Timeline
                  </h4>
                  <div className="flex flex-col">
                    {detail.timeline.map((event, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center w-4">
                          <div className={cn(
                            "h-2 w-2 rounded-full border-2 border-background shrink-0 mt-1",
                            i === detail.timeline.length - 1 ? "bg-emerald-400" : "bg-primary",
                          )} />
                          {i < detail.timeline.length - 1 && (
                            <div className="w-px flex-1 bg-border min-h-[16px] mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-[12px] font-semibold text-foreground leading-tight">{event.event}</p>
                          {event.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{event.detail}</p>}
                          <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{relativeTime(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Internal Notes (from API + locally added this session) */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                    Internal Notes
                  </h4>
                  {[
                    ...(detail.internal_notes ?? []).map((n) => ({
                      text: n.note,
                      time: n.created_at ? formatTimestamp(n.created_at) : "—",
                    })),
                    ...localNotes,
                  ].map((note, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3 mb-2">
                      <p className="text-[12px] text-foreground leading-relaxed">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono mt-1.5">{note.time}</p>
                    </div>
                  ))}
                  <Textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add an internal note..."
                    rows={3}
                    className="text-[13px] bg-card resize-none mt-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || addNote.isPending}
                    className="mt-2 w-full gap-1.5 text-xs h-8"
                  >
                    <Send size={12} />
                    {addNote.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Footer Actions ── */}
            <div className="shrink-0 border-t p-4 sm:px-6 flex gap-2.5 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <ChevronDown size={12} /> Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[140px]">
                  {STATUSES.map(s => (
                    <DropdownMenuItem
                      key={s}
                      className="capitalize text-xs gap-2"
                      onClick={() => handleStatusChange(s)}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={() => handleStatusChange("resolved")}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                <CheckCircle2 size={13} /> Mark Resolved
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Conversations() {
  const [filters, setFilters] = useState<ConversationListFilters>({ page: 1, per_page: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; type: "single" | "bulk"; id?: string }>({ open: false, type: "bulk" });
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();

  const { data: listData, isLoading: listLoading, refetch } = useConversationsList(filters);
  const bulkAction = useBulkConversationAction();

  const conversations = listData?.conversations ?? [];
  const stats = listData?.stats ?? { total: 0, active: 0, resolved: 0, escalated: 0, abandoned: 0, needs_review: 0 };
  const total = listData?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.per_page ?? 20)) || 1;

  /* ── Filter helpers ──────────────────────────────────────────────────────── */

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.channel && filters.channel !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.rating && filters.rating !== "all") count++;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 20 });
  }, []);

  const updateFilter = useCallback(<K extends keyof ConversationListFilters>(key: K, value: ConversationListFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  /* ── Selection helpers ───────────────────────────────────────────────────── */

  const allSelected = conversations.length > 0 && conversations.every(c => selectedIds.has(c.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  }, [allSelected, conversations]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ── Bulk actions ────────────────────────────────────────────────────────── */

  const handleBulkResolve = useCallback(async () => {
    try {
      await bulkAction.mutateAsync({ action: "resolve", conversation_ids: Array.from(selectedIds) });
      toast({ title: `${selectedIds.size} conversations resolved` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Bulk resolve failed", variant: "destructive" });
    }
  }, [bulkAction, selectedIds, toast]);

  const handleBulkDelete = useCallback(async () => {
    try {
      const ids = confirmDelete.id ? [confirmDelete.id] : Array.from(selectedIds);
      await bulkAction.mutateAsync({ action: "delete", conversation_ids: ids });
      toast({ title: `${ids.length} conversation${ids.length > 1 ? "s" : ""} deleted` });
      setSelectedIds(new Set());
      if (activeConversationId && ids.includes(activeConversationId)) setActiveConversationId(null);
    } catch {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
    setConfirmDelete({ open: false, type: "bulk" });
  }, [bulkAction, confirmDelete, selectedIds, toast, activeConversationId]);

  const handleBulkTag = useCallback(async () => {
    if (!tagInput.trim()) return;
    try {
      await bulkAction.mutateAsync({ action: "tag", conversation_ids: Array.from(selectedIds), tag: tagInput.trim() });
      toast({ title: `Tag "${tagInput}" applied to ${selectedIds.size} conversations` });
      setSelectedIds(new Set());
      setTagInput("");
      setTagDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Tagging failed", variant: "destructive" });
    }
  }, [bulkAction, selectedIds, tagInput, toast]);

  const handleBulkExport = useCallback(async () => {
    try {
      const result = await bulkAction.mutateAsync({ action: "export", conversation_ids: Array.from(selectedIds) });
      if (result.export_data) {
        const csv = [
          Object.keys(result.export_data[0]).join(","),
          ...result.export_data.map(row => Object.values(row).map(v => `"${v}"`).join(",")),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "conversations-export.csv"; a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: `${selectedIds.size} conversations exported` });
    } catch {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  }, [bulkAction, selectedIds, toast]);

  /* ── Pagination ──────────────────────────────────────────────────────────── */

  const currentPage = filters.page ?? 1;
  const perPage = filters.per_page ?? 20;
  const fromIdx = (currentPage - 1) * perPage + 1;
  const toIdx = Math.min(currentPage * perPage, total);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Conversations
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Full conversation history and management
          </p>
        </div>

        <Button
          variant="outline" size="sm"
          onClick={() => void refetch()}
          className="gap-1.5 text-xs"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* ─── Stats Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map((card, i) => (
          <div
            key={card.key}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
              "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Gradient accent */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              card.accent,
            )} />
            <div className="relative">
              <div className="text-muted-foreground mb-2">
                {card.icon}
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                {card.label}
              </p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                {(stats[card.key] ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Primary filter row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search conversations..."
              value={filters.search ?? ""}
              onChange={e => updateFilter("search", e.target.value || undefined)}
              className="pl-9 h-9 text-sm bg-card"
            />
          </div>

          {/* Quick status filter */}
          <Select value={filters.status ?? "_all"} onValueChange={v => updateFilter("status", v === "_all" ? undefined : v)}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-card">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Status</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2 capitalize">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                    {s}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Channel filter */}
          <Select value={filters.channel ?? "_all"} onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-card hidden sm:flex">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Channels</SelectItem>
              {Object.entries(CHANNEL_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  <span className="inline-flex items-center gap-2">
                    <ChannelIcon channel={key} size={12} />
                    {meta.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced filters toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              "gap-1.5 h-9 text-xs",
              filtersOpen && "bg-primary/10 border-primary/30 text-primary",
            )}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 h-4 min-w-[16px] rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center px-1">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Expandable advanced filters */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card/50 animate-fade-in">
            {/* Channel (mobile duplicate — only visible on <sm) */}
            <Select value={filters.channel ?? "_all"} onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-card sm:hidden">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Channels</SelectItem>
                {Object.entries(CHANNEL_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    <span className="inline-flex items-center gap-2">
                      <ChannelIcon channel={key} size={12} />
                      {meta.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Rating */}
            <Select value={filters.rating ?? "_all"} onValueChange={v => updateFilter("rating", v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[130px] h-9 text-xs bg-card">
                <SelectValue placeholder="All Ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Ratings</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="none">No Rating</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground shrink-0">From</label>
              <input
                type="date"
                value={filters.date_from ?? ""}
                onChange={e => updateFilter("date_from", e.target.value || undefined)}
                className="h-9 px-2.5 text-xs rounded-md border bg-card text-foreground"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground shrink-0">To</label>
              <input
                type="date"
                value={filters.date_to ?? ""}
                onChange={e => updateFilter("date_to", e.target.value || undefined)}
                className="h-9 px-2.5 text-xs rounded-md border bg-card text-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         CONVERSATIONS TABLE
         ─────────────────────────────────────────────────────────────────────
         Progressive column disclosure: lower-priority columns hide at
         smaller breakpoints so the table NEVER needs horizontal scroll.
         Priority: Contact > Status > Channel > Msgs > Rating > Duration > Date > Actions
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* ── DESKTOP / TABLET TABLE (sm+) ─────────────────────────────────── */}
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 p-3 pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Contact</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">First Message</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">Channel</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">Rating</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden 2xl:table-cell">Duration</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date</th>
              <th className="w-10 p-3 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {listLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-3 pl-4"><Skeleton className="h-4 w-4" /></td>
                  <td className="p-3"><Skeleton className="h-9 w-full" /></td>
                  <td className="p-3 hidden xl:table-cell"><Skeleton className="h-4 w-full" /></td>
                  <td className="p-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-12" /></td>
                  <td className="p-3 hidden 2xl:table-cell"><Skeleton className="h-4 w-12" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="p-3 pr-4"><Skeleton className="h-4 w-4" /></td>
                </tr>
              ))
            ) : conversations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No conversations found</p>
                    {activeFilterCount > 0 && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : conversations.map(conv => (
              <tr
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={cn(
                  "cursor-pointer transition-colors group",
                  selectedIds.has(conv.id)
                    ? "bg-primary/5 hover:bg-primary/8"
                    : "hover:bg-muted/50",
                )}
              >
                {/* Checkbox */}
                <td className="p-3 pl-4" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(conv.id)}
                    onCheckedChange={() => toggleSelect(conv.id)}
                  />
                </td>

                {/* Contact — always visible. On smaller screens, absorbs
                    hidden columns inline (channel, message preview) */}
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <ConversationAvatar name={conv.contact_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                          {conv.contact_name ?? conv.contact_phone ?? "Anonymous"}
                        </p>
                        {/* Inline msg count */}
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                          {conv.message_count}
                        </span>
                      </div>

                      {conv.contact_email && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Mail size={10} className="shrink-0" />
                          {conv.contact_email}
                        </p>
                      )}

                      {/* Channel — inline when the Channel column is hidden (<lg) */}
                      <div className="lg:hidden mt-1">
                        <ChannelPill channel={conv.channel} />
                      </div>

                      {/* First message preview — inline when column is hidden (<xl) */}
                      {conv.first_message && (
                        <p className="xl:hidden text-[11px] text-muted-foreground/70 truncate mt-1 max-w-[280px]">
                          {conv.first_message}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* First message — visible on xl+ */}
                <td className="p-3 hidden xl:table-cell max-w-[240px]">
                  <p className="text-[12px] text-muted-foreground truncate">
                    {conv.first_message ?? "--"}
                  </p>
                </td>

                {/* Channel — visible on lg+ */}
                <td className="p-3 hidden lg:table-cell whitespace-nowrap">
                  <ChannelPill channel={conv.channel} />
                </td>

                {/* Status — always visible */}
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        <StatusBadge status={conv.status} interactive />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[140px]">
                      {STATUSES.map(s => (
                        <DropdownMenuItem
                          key={s}
                          className="capitalize text-xs gap-2"
                          onClick={async () => {
                            try {
                              await bulkAction.mutateAsync({ action: "resolve", conversation_ids: [conv.id] });
                              toast({ title: `Conversation marked as ${s}` });
                            } catch {
                              toast({ title: "Error", variant: "destructive" });
                            }
                          }}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                          {s}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>

                {/* Rating — visible on md+ */}
                <td className="p-3 hidden md:table-cell">
                  <RatingIndicator rating={conv.rating} />
                </td>

                {/* Duration — visible on 2xl+ */}
                <td className="p-3 hidden 2xl:table-cell whitespace-nowrap">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatDuration(conv.duration_minutes)}
                  </span>
                </td>

                {/* Date — always visible */}
                <td className="p-3 whitespace-nowrap">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {relativeTime(conv.started_at)}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-3 pr-4" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => setActiveConversationId(conv.id)}>
                        <Eye size={13} /> View Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs gap-2"
                        onClick={async () => {
                          try {
                            await bulkAction.mutateAsync({ action: "resolve", conversation_ids: [conv.id] });
                            toast({ title: "Conversation resolved" });
                          } catch {
                            toast({ title: "Error", variant: "destructive" });
                          }
                        }}
                      >
                        <CheckCircle2 size={13} /> Mark Resolved
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete({ open: true, type: "single", id: conv.id })}
                      >
                        <Trash2 size={13} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── MOBILE CARD LIST (<sm) ───────────────────────────────────────── */}
        <div className="sm:hidden divide-y">
          {listLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No conversations found</p>
                {activeFilterCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(conv.id)}
                    onCheckedChange={() => toggleSelect(conv.id)}
                  />
                </div>
                <ConversationAvatar name={conv.contact_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                      {conv.contact_name ?? conv.contact_phone ?? "Anonymous"}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {relativeTime(conv.started_at)}
                    </span>
                  </div>
                  {conv.contact_email && (
                    <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail size={10} /> {conv.contact_email}
                    </p>
                  )}
                  {conv.first_message && (
                    <p className="text-[12px] text-muted-foreground/80 line-clamp-2 mb-2 leading-relaxed">
                      {conv.first_message}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={conv.status} />
                    <ChannelPill channel={conv.channel} />
                    <RatingIndicator rating={conv.rating} />
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {conv.message_count} msgs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!listLoading && conversations.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-[11px] text-muted-foreground font-mono hidden sm:block">
              {fromIdx}--{toIdx} of {total}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono sm:hidden">
              {currentPage}/{totalPages || 1}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline" size="sm"
                onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) - 1 }))}
                disabled={currentPage <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[11px] text-muted-foreground px-2 font-mono hidden sm:block">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
                disabled={currentPage >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         DETAIL DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <DetailDialog
        conversationId={activeConversationId}
        open={!!activeConversationId}
        onClose={() => setActiveConversationId(null)}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
         BULK ACTIONS BAR
         ═══════════════════════════════════════════════════════════════════════ */}
      {selectedIds.size > 0 && (
        <div className={cn(
          "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50",
          "bg-card border rounded-2xl shadow-strong",
          "px-4 sm:px-5 py-3 flex items-center gap-2 sm:gap-3 flex-wrap justify-center",
          "max-w-[95vw] animate-fade-in",
        )}>
          <span className="text-xs font-bold text-foreground font-heading mr-1">
            {selectedIds.size} selected
          </span>

          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={handleBulkResolve}
            className="gap-1.5 text-[11px] h-7 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25"
          >
            <CheckCircle2 size={12} /> Resolve
          </Button>

          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => setConfirmDelete({ open: true, type: "bulk" })}
            className="gap-1.5 text-[11px] h-7 bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25"
          >
            <Trash2 size={12} /> Delete
          </Button>

          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => void handleBulkExport()}
            variant="outline"
            className="gap-1.5 text-[11px] h-7"
          >
            <Download size={12} /> CSV
          </Button>

          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => setTagDialogOpen(true)}
            className="gap-1.5 text-[11px] h-7 bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25"
          >
            <Tag size={12} /> Tag
          </Button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 ml-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         DELETE CONFIRMATION DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={confirmDelete.open} onOpenChange={open => { if (!open) setConfirmDelete({ open: false, type: "bulk" }); }}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {confirmDelete.type === "bulk"
              ? `Are you sure you want to delete ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`
              : "Are you sure you want to delete this conversation? This action cannot be undone."}
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete({ open: false, type: "bulk" })}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={bulkAction.isPending}
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkAction.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         TAG DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={tagDialogOpen} onOpenChange={open => { if (!open) { setTagDialogOpen(false); setTagInput(""); } }}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Tag Conversations</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Enter a tag to apply to {selectedIds.size} selected conversation{selectedIds.size > 1 ? "s" : ""}:
          </p>
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="e.g. billing, urgent, follow-up"
            className="text-sm bg-card"
            onKeyDown={e => { if (e.key === "Enter") void handleBulkTag(); }}
          />
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" size="sm" onClick={() => { setTagDialogOpen(false); setTagInput(""); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!tagInput.trim() || bulkAction.isPending}
              onClick={() => void handleBulkTag()}
            >
              {bulkAction.isPending ? "Applying..." : "Apply Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
