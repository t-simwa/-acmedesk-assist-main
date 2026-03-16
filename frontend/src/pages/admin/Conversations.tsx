/**
 * Conversations Page — World-Class SaaS Implementation
 * 
 * Matches Dashboard (KPI cards) and Inbox (message bubbles) exactly.
 * Elite mobile-first responsive design with world-class filters.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  MessageSquare, Search, X, ChevronDown, Download,
  Trash2, Tag, Clock, Bot,
  ThumbsUp, ThumbsDown, CheckCircle2,
  RefreshCw, ChevronLeft, ChevronRight,
  Flag, User, MoreHorizontal, Send,
  Mail, Phone, ExternalLink,
  AlertTriangle, Eye, Sparkles,
  LogOut, Calendar, TrendingUp, TrendingDown, Minus,
  Filter,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  useConversationsList, useConversationDetail,
  useUpdateConversationStatus, useAddConversationNote,
  useToggleConversationFlag, useBulkConversationAction,
  useCreateExportJob, useExportJobStatus,
} from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ConversationListFilters,
  conversationsApi,
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
  escalated:    { dot: "bg-rose-400",    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",       label: "Escalated" },
  abandoned:    { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",    label: "Abandoned" },
  needs_review: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Needs Review" },
};

const STATUSES = ["active", "resolved", "escalated", "abandoned", "needs_review"] as const;
const ALL_CHANNELS = ["all", "web", "whatsapp", "instagram", "facebook", "email", "sms"] as const;

// KPI cards matching Dashboard exactly
const KPI_CARDS = [
  {
    key: "total" as const,
    label: "Total Conversations",
    icon: <MessageSquare className="h-4 w-4" />,
    accent: "from-primary/5 to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "resolved" as const,
    label: "AI Resolved",
    icon: <Bot className="h-4 w-4" />,
    accent: "from-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    filterStatus: "resolved",
  },
  {
    key: "escalated" as const,
    label: "Escalated",
    icon: <AlertTriangle className="h-4 w-4" />,
    accent: "from-rose-500/5 to-transparent",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    filterStatus: "escalated",
  },
  {
    key: "abandoned" as const,
    label: "Abandoned",
    icon: <LogOut className="h-4 w-4" />,
    accent: "from-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    filterStatus: "abandoned",
  },
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
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(mins: number | null): string {
  if (!mins) return "--";
  if (mins < 1) return `${Math.round(mins * 60)}s`;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = Math.floor(mins / 60);
  const remainder = Math.round(mins % 60);
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatTimestamp(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = isoDate(now);
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - n);
    return isoDate(d);
  };
  switch (preset) {
    case "today": return { from: today, to: today };
    case "7d": return { from: daysAgo(6), to: today };
    case "30d": return { from: daysAgo(29), to: today };
    case "90d": return { from: daysAgo(89), to: today };
    default: return { from: "", to: "" };
  }
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value == null ? "" : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map(row => headers.map(h => escape(row[h])).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCitations(content: string): string {
  return content.replace(
    /\s*\[(\d+(?:,\s*\d+)*)\]/g,
    (_, nums) => `<sup class="citation">[${nums}]</sup>`
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TREND INDICATOR (matching Dashboard exactly)
   ═══════════════════════════════════════════════════════════════════════════════ */

function TrendIndicator({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-mono font-medium",
      isPositive && "text-emerald-500",
      isNegative && "text-rose-500",
      !isPositive && !isNegative && "text-muted-foreground",
    )}>
      {value > 0 && <TrendingUp className="h-3 w-3" />}
      {value < 0 && <TrendingDown className="h-3 w-3" />}
      {value === 0 && <Minus className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
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
      <ChannelIcon channel={channel} size={12} />
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
      <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium">
        <ThumbsDown size={12} />
        <span className="hidden xl:inline">Negative</span>
      </span>
    );
  }
  return <span className="text-muted-foreground/40 text-xs">--</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MOBILE FILTER BAR (World-class, matches Inbox mobile filters)
   ═══════════════════════════════════════════════════════════════════════════════ */

function MobileFilterBar({
  channelFilter,
  statusFilter,
  ratingFilter,
  onChannelChange,
  onStatusChange,
  onRatingChange,
  onClearAll,
  activeCount,
}: {
  channelFilter: string | undefined;
  statusFilter: string | undefined;
  ratingFilter: string | undefined;
  onChannelChange: (channel: string | undefined) => void;
  onStatusChange: (status: string | undefined) => void;
  onRatingChange: (rating: string | undefined) => void;
  onClearAll: () => void;
  activeCount: number;
}) {
  return (
    <div className="lg:hidden space-y-2.5">
      {/* Channel pills — horizontally scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ALL_CHANNELS.map(ch => {
          const isAll = ch === "all";
          const meta = isAll ? null : CHANNEL_META[ch];
          const isActive = isAll ? !channelFilter : channelFilter === ch;
          return (
            <button
              key={ch}
              onClick={() => onChannelChange(isAll ? undefined : ch)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 shrink-0",
                "text-[11px] font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {isAll ? "All" : (
                <>
                  <ChannelIcon channel={ch} size={11} />
                  {meta?.label}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Status toggle - horizontal scroll */}
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => onStatusChange(undefined)}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold font-heading transition-all",
            !statusFilter
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          All
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold font-heading transition-all flex items-center gap-1.5",
              statusFilter === s
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
            {STATUS_META[s]?.label}
          </button>
        ))}
      </div>

      {/* Rating pills */}
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { value: undefined, label: "All Ratings" },
          { value: "positive", label: "Positive", icon: <ThumbsUp size={10} /> },
          { value: "negative", label: "Negative", icon: <ThumbsDown size={10} /> },
        ].map(opt => (
          <button
            key={opt.value ?? "all"}
            onClick={() => onRatingChange(opt.value)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold font-heading transition-all flex items-center gap-1.5",
              ratingFilter === opt.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          className="text-xs text-primary font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DETAIL DIALOG (matching Inbox message bubbles exactly)
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
  const referencedDocs = detail?.referenced_documents ?? [];

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 z-10">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : !detail ? (
            <>
              <DialogTitle className="font-heading text-base font-semibold text-foreground">
                Conversation Not Found
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                This conversation may have been deleted.
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={onClose}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <ConversationAvatar name={contact?.full_name ?? null} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <DialogTitle className="font-heading text-base font-semibold text-foreground leading-none">
                      {contact?.full_name ?? "Anonymous"}
                    </DialogTitle>
                    <StatusBadge status={detail.status} />
                    <ChannelPill channel={detail.channel} />
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {contact?.email ?? contact?.phone ?? "No contact info"} · Started {relativeTime(detail.started_at)}
                  </DialogDescription>
                </div>
                <button
                  onClick={handleFlag}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all border shrink-0",
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

              {/* Quick stats */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70 font-mono mt-3 pl-[52px]">
                <span>{detail.message_count} messages</span>
                <span className="h-3 w-px bg-border" />
                <span>{detail.rating === "positive" ? "Positive rating" : detail.rating === "negative" ? "Negative rating" : "No rating"}</span>
                {detail.duration_minutes && (
                  <>
                    <span className="h-3 w-px bg-border" />
                    <span>{formatDuration(detail.duration_minutes)}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Body - hidden scrollbar */}
        {!isLoading && detail && (
          <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[calc(85vh-180px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Transcript - matching Inbox exactly */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-4">
                Full Transcript
              </h3>

              {detail.messages.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare size={20} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No messages in this conversation</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {detail.messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const isAssistant = msg.role === "assistant";
                    const isSystem = msg.role === "system";
                    const prevMsg = detail.messages[idx - 1];
                    const isFirstInSequence = !prevMsg || prevMsg.role !== msg.role;

                    // User message - matches Inbox exactly
                    if (isUser) {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[85%] sm:max-w-[75%]">
                            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2">
                              <div className="text-[13px] leading-[1.6] [&_p]:m-0 [&_p]:leading-[1.6]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ""}</ReactMarkdown>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 font-mono mt-0.5 justify-end">
                              <span>{formatTimestamp(msg.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // AI Assistant message - matches Inbox exactly
                    if (isAssistant) {
                      const showLowConfidence = msg.confidence_score != null && msg.confidence_score < 0.8;

                      return (
                        <div key={msg.id} className="flex justify-start group/ai">
                          <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[78%]">
                            {/* AI Avatar - only show for first in sequence */}
                            {isFirstInSequence ? (
                              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm mt-0.5">
                                <Sparkles className="h-2.5 w-2.5 text-white" />
                              </div>
                            ) : (
                              <div className="w-5 flex-shrink-0" />
                            )}
                            
                            <div className="flex-1 min-w-0">
                              {/* AI Header - only show for first in sequence */}
                              {isFirstInSequence && (
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-[10px] font-medium text-muted-foreground/70 font-heading">
                                    NexaChat AI
                                  </span>
                                  {showLowConfidence && (
                                    <span className="text-[9px] text-amber-400 flex items-center gap-0.5" title="Lower confidence">
                                      <span className="inline-block">⚠</span> Lower confidence
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* AI Bubble - matches Inbox exactly */}
                              <div className={cn(
                                "px-3 py-2 rounded-[3px_14px_14px_14px]",
                                "bg-primary/[0.05] border border-primary/[0.10]",
                                "transition-all duration-150",
                                "group-hover/ai:border-primary/15 group-hover/ai:bg-primary/[0.07]",
                              )}>
                                <div className="text-[13px] text-foreground/90 leading-[1.6] space-y-1.5 [&_p]:m-0 [&_p]:leading-[1.6] [&_pre]:my-1.5 [&_pre]:rounded-md [&_pre]:bg-background/60 [&_pre]:border [&_pre]:border-border/40 [&_pre]:text-[11px] [&_pre]:p-2 [&_code]:text-primary/80 [&_code]:font-mono [&_code]:text-[11px] [&_code]:before:content-none [&_code]:after:content-none [&_ul]:my-1 [&_ul]:pl-3.5 [&_ul]:space-y-0.5 [&_ol]:my-1 [&_ol]:pl-3.5 [&_ol]:space-y-0.5 [&_li]:text-[13px] [&_li]:leading-[1.5] [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:mt-1.5 [&_h2]:mb-0.5 [&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:mt-1 [&_h3]:mb-0.5 [&_h4]:text-[11px] [&_h4]:font-medium [&_h4]:mt-1 [&_h4]:mb-0.5 [&_strong]:text-foreground [&_strong]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-2 [&_blockquote]:text-[12px] [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_.citation]:text-[9px] [&_.citation]:text-primary/70 [&_.citation]:font-mono [&_.citation]:ml-px">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                    {formatCitations(msg.content || "")}
                                  </ReactMarkdown>
                                </div>
                              </div>

                              {/* Source chips */}
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {msg.citations.slice(0, 3).map((c, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-medium text-primary/80 bg-primary/[0.06] border border-primary/[0.12]"
                                    >
                                      <span className="text-[8px]">📄</span>
                                      <span className="truncate max-w-[100px]">{c.source ?? "Source"}</span>
                                    </span>
                                  ))}
                                  {msg.citations.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground/60 self-center">
                                      +{msg.citations.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Timestamp */}
                              <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">
                                {formatTimestamp(msg.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // System message
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="max-w-[60%] px-4 py-2 rounded-full text-center bg-muted/30 border border-dashed border-muted/40">
                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                              {msg.content}
                            </p>
                            <span className="text-[10px] text-muted-foreground/50 font-mono mt-1 block">
                              {formatTimestamp(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>

            {/* Timeline */}
            {detail.timeline.length > 0 && (
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
            )}

            {/* Contact Info */}
            <div className="rounded-lg border bg-muted/30 p-4">
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
              </div>
            </div>

            {/* Documents Referenced */}
            {referencedDocs.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                  Documents Referenced
                </h4>
                <div className="flex flex-col gap-2">
                  {referencedDocs.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.source_url ?? undefined}
                      target={doc.source_url ? "_blank" : undefined}
                      rel={doc.source_url ? "noreferrer" : undefined}
                      className="text-[12px] text-primary/80 break-words hover:underline flex items-center gap-1.5"
                    >
                      <ExternalLink size={11} />
                      {doc.title || doc.filename || doc.id}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Notes */}
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
                className="text-sm bg-card resize-none mt-1"
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
        )}

        {/* Footer Actions */}
        {!isLoading && detail && (
          <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t px-6 py-4">
            <div className="flex gap-2.5 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9">
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
                      {STATUS_META[s]?.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={() => handleStatusChange("resolved")}
                className="gap-1.5 h-9 text-xs"
              >
                <CheckCircle2 size={13} /> Mark Resolved
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Conversations() {
  const [filters, setFilters] = useState<ConversationListFilters>(() => {
    const now = new Date();
    const to = isoDate(now);
    const fromDate = new Date(now);
    fromDate.setUTCDate(fromDate.getUTCDate() - 29);
    const from = isoDate(fromDate);
    return { page: 1, per_page: 30, date_from: from, date_to: to };
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; type: "single" | "bulk"; id?: string }>({ open: false, type: "bulk" });
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: listData, isLoading: listLoading, refetch } = useConversationsList(filters);
  const updateStatus = useUpdateConversationStatus();
  const bulkAction = useBulkConversationAction();
  const createExportJob = useCreateExportJob();
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const exportJobStatus = useExportJobStatus(exportJobId);

  useEffect(() => {
    if (!exportJobStatus.data) return;

    if (exportJobStatus.data.status === "ready" && exportJobStatus.data.download_url) {
      toast({ title: "Export ready", description: "Your export is ready. Click to download." });
      window.open(exportJobStatus.data.download_url, "_blank");
      setExportJobId(null);
    }

    if (exportJobStatus.data.status === "failed") {
      toast({ title: "Export failed", description: exportJobStatus.data.message ?? "Please try again.", variant: "destructive" });
      setExportJobId(null);
    }
  }, [exportJobStatus.data, toast]);

  const conversations = listData?.conversations ?? [];
  const stats = listData?.stats ?? { total: 0, active: 0, resolved: 0, escalated: 0, abandoned: 0, needs_review: 0 };
  const total = listData?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.per_page ?? 30)) || 1;

  /* ── Filter helpers ──────────────────────────────────────────────────────── */

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.channel && filters.channel !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.rating && filters.rating !== "all") count++;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => {
    const now = new Date();
    const to = isoDate(now);
    const fromDate = new Date(now);
    fromDate.setUTCDate(fromDate.getUTCDate() - 29);
    const from = isoDate(fromDate);
    setFilters({ page: 1, per_page: 30, date_from: from, date_to: to });
  }, []);

  const updateFilter = useCallback(<K extends keyof ConversationListFilters>(key: K, value: ConversationListFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleStatCardClick = useCallback((key: typeof KPI_CARDS[number]["key"]) => {
    const card = KPI_CARDS.find(c => c.key === key);
    if (card?.filterStatus) {
      updateFilter("status", card.filterStatus);
    } else if (key === "total") {
      updateFilter("status", undefined);
    }
  }, [updateFilter]);

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
        const csv = formatCsv(result.export_data);
        downloadCsv("conversations-export.csv", csv);
      }
      toast({ title: `${selectedIds.size} conversations exported` });
    } catch {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  }, [bulkAction, selectedIds, toast]);

  const handleCreateExportJob = useCallback(async (kind: "csv" | "zip" | "pdf") => {
    try {
      const result = await createExportJob.mutateAsync({
        kind,
        search: filters.search,
        channel: filters.channel,
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
        rating: filters.rating,
        email: user?.email,
      });
      setExportJobId(result.job_id);
      toast({ title: "Export job created", description: "We will notify you when it is ready." });
    } catch {
      toast({ title: "Error", description: "Failed to create export job", variant: "destructive" });
    }
  }, [createExportJob, filters, toast, user?.email]);

  /* ── Pagination ──────────────────────────────────────────────────────────── */

  const currentPage = filters.page ?? 1;
  const perPage = filters.per_page ?? 30;
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
            Full conversation history across all channels
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Date Range */}
          <Select
            value={
              filters.date_from === getPresetRange("30d").from && filters.date_to === getPresetRange("30d").to ? "30d" :
              filters.date_from === getPresetRange("7d").from && filters.date_to === getPresetRange("7d").to ? "7d" :
              filters.date_from === getPresetRange("today").from && filters.date_to === getPresetRange("today").to ? "today" :
              filters.date_from === getPresetRange("90d").from && filters.date_to === getPresetRange("90d").to ? "90d" : "custom"
            }
            onValueChange={v => {
              if (v === "custom") return;
              const range = getPresetRange(v);
              setFilters(prev => ({ ...prev, date_from: range.from, date_to: range.to, page: 1 }));
            }}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={async () => {
                  if (total > 1000) {
                    await handleCreateExportJob("csv");
                    return;
                  }
                  try {
                    const result = await conversationsApi.exportConversations({
                      search: filters.search,
                      channel: filters.channel,
                      status: filters.status,
                      date_from: filters.date_from,
                      date_to: filters.date_to,
                      rating: filters.rating,
                      limit: 1000,
                    });
                    if (result.export_data && result.export_data.length) {
                      downloadCsv(`conversations-${new Date().toISOString().slice(0, 10)}.csv`, formatCsv(result.export_data));
                      toast({ title: "Export downloaded" });
                    } else {
                      toast({ title: "No data to export" });
                    }
                  } catch {
                    toast({ title: "Error", description: "Export failed", variant: "destructive" });
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </DropdownMenuItem>
              {selectedIds.size > 0 && (
                <DropdownMenuItem className="text-xs gap-2" onClick={() => void handleBulkExport()}>
                  <Download className="h-3.5 w-3.5" /> Export Selected
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── KPI Stats Grid (matching Dashboard exactly) ────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map((card) => {
          const value = stats[card.key as keyof typeof stats] ?? 0;
          const trend = stats.trend?.[card.key as keyof typeof stats.trend];
          const isActive = filters.status === card.filterStatus;
          const isClickable = card.key !== "avg_duration";
          
          return (
            <div
              key={card.key}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => isClickable && handleStatCardClick(card.key)}
              onKeyDown={e => { if (isClickable && (e.key === "Enter" || e.key === " ")) handleStatCardClick(card.key); }}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
                "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
                isClickable && "cursor-pointer",
                isActive && "border-primary/40 bg-primary/5",
              )}
            >
              {/* Gradient accent on hover */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                card.accent,
              )} />
              <div className="relative">
                {/* Icon - matching Dashboard */}
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center mb-3",
                  card.iconBg,
                )}>
                  <div className={card.iconColor}>
                    {card.icon}
                  </div>
                </div>

                {/* Label */}
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                  {card.label}
                </p>

                {/* Value + Trend */}
                <div className="flex items-end gap-2 flex-wrap">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </p>
                  <div className="pb-0.5">
                    <TrendIndicator value={trend} />
                  </div>
                </div>

                {/* Subtext */}
                <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                  vs last period
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Desktop Filter Bar ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={filters.search ?? ""}
            onChange={e => updateFilter("search", e.target.value || undefined)}
            className="h-9 w-full sm:w-[220px] pl-8 text-xs"
          />
        </div>

        {/* Channel */}
        <Select value={filters.channel ?? "all"} onValueChange={v => updateFilter("channel", v === "all" ? undefined : v)}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
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

        {/* Status */}
        <Select value={filters.status ?? "all"} onValueChange={v => updateFilter("status", v === "all" ? undefined : v)}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                  {STATUS_META[s]?.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rating */}
        <Select value={filters.rating ?? "all"} onValueChange={v => updateFilter("rating", v === "all" ? undefined : v)}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="none">Unrated</SelectItem>
          </SelectContent>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear */}
        {activeFilterCount > 0 && (
          <Button variant="link" size="sm" className="text-primary text-xs" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ─── Mobile Filter Button + Sheet ───────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2">
          {/* Search - always visible on mobile */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.search ?? ""}
              onChange={e => updateFilter("search", e.target.value || undefined)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          {/* Filter button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen(true)}
            className="h-9 text-xs gap-1.5 shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="font-heading text-base">Filters</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <MobileFilterBar
                channelFilter={filters.channel}
                statusFilter={filters.status}
                ratingFilter={filters.rating}
                onChannelChange={v => updateFilter("channel", v)}
                onStatusChange={v => updateFilter("status", v)}
                onRatingChange={v => updateFilter("rating", v)}
                onClearAll={clearFilters}
                activeCount={activeFilterCount}
              />
            </div>
            <div className="p-4 border-t">
              <Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ─── Data Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        
        {/* Desktop Table (sm+) */}
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-3 py-3">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Contact
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                Preview
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                Channel
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">
                Rating
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden 2xl:table-cell">
                Duration
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Date
              </th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {listLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-9 w-full" /></td>
                  <td className="px-3 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-full" /></td>
                  <td className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-3 py-3 hidden md:table-cell"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-3 py-3 hidden 2xl:table-cell"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                </tr>
              ))
            ) : conversations.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No conversations found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters or search terms.</p>
                    {activeFilterCount > 0 && (
                      <Button variant="link" size="sm" className="text-primary text-xs mt-2" onClick={clearFilters}>
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
                  "cursor-pointer transition-colors",
                  selectedIds.has(conv.id) ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/50",
                )}
              >
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selectedIds.has(conv.id)} onCheckedChange={() => toggleSelect(conv.id)} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <ConversationAvatar name={conv.contact_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold text-sm text-foreground truncate">
                          {conv.contact_name ?? conv.contact_phone ?? "Anonymous"}
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                          {conv.message_count}
                        </span>
                      </div>
                      {conv.contact_email && (
                        <p className="text-xs text-muted-foreground truncate">{conv.contact_email}</p>
                      )}
                      <div className="lg:hidden mt-1">
                        <ChannelPill channel={conv.channel} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden xl:table-cell max-w-[240px]">
                  <p className="text-xs text-muted-foreground truncate">{conv.first_message ?? "--"}</p>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap">
                  <ChannelPill channel={conv.channel} />
                </td>
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
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
                          className="text-xs gap-2"
                          onClick={async () => {
                            try {
                              await updateStatus.mutateAsync({ id: conv.id, status: s });
                              toast({ title: `Conversation marked as ${STATUS_META[s]?.label}` });
                            } catch {
                              toast({ title: "Error", variant: "destructive" });
                            }
                          }}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                          {STATUS_META[s]?.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <RatingIndicator rating={conv.rating} />
                </td>
                <td className="px-3 py-3 hidden 2xl:table-cell whitespace-nowrap">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDuration(conv.duration_minutes)}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs text-foreground">{relativeTime(conv.started_at)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(conv.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => setActiveConversationId(conv.id)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs gap-2"
                        onClick={async () => {
                          try {
                            await updateStatus.mutateAsync({ id: conv.id, status: "resolved" });
                            toast({ title: "Conversation resolved" });
                          } catch {
                            toast({ title: "Error", variant: "destructive" });
                          }
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete({ open: true, type: "single", id: conv.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card List (<sm) */}
        <div className="sm:hidden divide-y">
          {listLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No conversations found</p>
              {activeFilterCount > 0 && (
                <Button variant="link" size="sm" className="text-primary text-xs mt-2" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted"
              onClick={() => setActiveConversationId(conv.id)}
            >
              <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                <Checkbox checked={selectedIds.has(conv.id)} onCheckedChange={() => toggleSelect(conv.id)} />
              </div>
              <ConversationAvatar name={conv.contact_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {conv.contact_name ?? conv.contact_phone ?? "Anonymous"}
                  </span>
                  <StatusBadge status={conv.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {conv.first_message ?? "No message preview"}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <ChannelPill channel={conv.channel} />
                  <RatingIndicator rating={conv.rating} />
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                    {relativeTime(conv.started_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!listLoading && conversations.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-[11px] text-muted-foreground font-mono">
              Showing {fromIdx}-{toIdx} of {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 1}
                onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) - 1 }))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === totalPages}
                onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Dialog ──────────────────────────────────────────────────── */}
      <DetailDialog
        conversationId={activeConversationId}
        open={!!activeConversationId}
        onClose={() => setActiveConversationId(null)}
      />

      {/* ─── Bulk Actions Bar ───────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className={cn(
          "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50",
          "bg-primary/8 border border-primary/20 rounded-xl shadow-lg",
          "px-4 py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap justify-center",
          "max-w-[95vw] animate-fade-in",
        )}>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs font-semibold text-primary font-heading">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            size="sm"
            variant="ghost"
            disabled={bulkAction.isPending}
            onClick={handleBulkResolve}
            className="gap-1.5 text-xs h-8 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={bulkAction.isPending}
            onClick={() => setTagDialogOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Tag className="h-3.5 w-3.5" /> Tag
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={bulkAction.isPending}
            onClick={() => void handleBulkExport()}
            className="gap-1.5 text-xs h-8"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={bulkAction.isPending}
            onClick={() => setConfirmDelete({ open: true, type: "bulk" })}
            className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog open={confirmDelete.open} onOpenChange={open => { if (!open) setConfirmDelete({ open: false, type: "bulk" }); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Delete Conversation{confirmDelete.type === "bulk" && selectedIds.size > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {confirmDelete.type === "bulk"
                ? `This permanently removes ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""} and all their messages. This cannot be undone.`
                : "This permanently removes this conversation and all its messages. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete({ open: false, type: "bulk" })}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkAction.isPending}
              onClick={handleBulkDelete}
            >
              {bulkAction.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Tag Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={tagDialogOpen} onOpenChange={open => { if (!open) { setTagDialogOpen(false); setTagInput(""); } }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Tag Conversations</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter a tag to apply to {selectedIds.size} selected conversation{selectedIds.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="e.g. billing, urgent, follow-up"
            className="text-sm"
            onKeyDown={e => { if (e.key === "Enter") void handleBulkTag(); }}
          />
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
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
