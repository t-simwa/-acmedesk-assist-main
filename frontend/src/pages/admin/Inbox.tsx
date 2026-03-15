/**
 * Inbox — Unified 3-Column Omnichannel Inbox (Milestone 9.7)
 *
 * Layout:
 * - Left panel: channel + status filters (~200px sidebar)
 * - Middle panel: scrollable thread list with search
 * - Right panel: message detail with chat view + reply composer
 *
 * Mobile (<md): single-column — thread list or detail view with back nav.
 *
 * Follows "Refined Editorial SaaS" aesthetic matching Dashboard/Conversations/Leads.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Search, Send, Mail, Phone, ArrowLeft,
  MessageSquare, Inbox as InboxIcon, Hash, User, Sparkles,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useInboxList,
  useInboxThread,
  useInboxReply,
  useInboxRealtime,
  useInboxHistory,
  useCreateInboxConversation,
} from "@/hooks/useInbox";
import {
  inboxApi,
  type InboxThreadItem,
  type InboxListFilters,
  type InboxMessageItem,
  type InboxThreadDetailResponse,
  type InboxTemplateItem,
} from "@/lib/api";

// History items come from /api/inbox/{id}/history and mirror the backend schema.
type InboxContactHistoryItem = {
  conversation_id: string;
  status: string;
  last_activity_at?: string | null;
  message_count: number;
};
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";


/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const ALL_CHANNELS = ["all", "whatsapp", "email", "sms", "facebook", "instagram", "web"] as const;
const STATUS_FILTERS = ["all", "unread", "escalated", "ai_active", "mine", "resolved"] as const;

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return "--";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1d";
  return `${days}d`;
}

function formatGroupDay(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return date.toLocaleDateString(undefined, options);
}

function formatTimestamp(isoDate: string | null): string {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function getSlaStatus(deadline: string, escalatedAt?: string | null) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const start = escalatedAt ? new Date(escalatedAt).getTime() : now;
  const totalMs = Math.max(end - start, 0);
  const remainingMs = end - now;
  const percent = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  return { totalMs, remainingMs, percent };
}

/** Strip markdown formatting from text for clean snippet previews */
function stripMarkdown(text: string): string {
  return text
    // Remove headers (## Title -> Title)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, "")
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Remove citation brackets [1] [2, 3]
    .replace(/\s*\[[0-9,\s]+\]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert citation brackets [1, 2] to superscript HTML for AI messages */
function formatCitations(content: string): string {
  // Convert [1], [2, 3], [1, 2, 3] patterns to superscript format
  return content.replace(
    /\s*\[(\d+(?:,\s*\d+)*)\]/g,
    (_, nums) => `<sup class="citation">[${nums}]</sup>`
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function ContactAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
  // Per STYLE_GUIDE: sm: h-7 w-7 text-[10px], md: h-9 w-9 text-xs, lg: h-12 w-12 text-sm
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-10 w-10 text-xs" };
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

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full shrink-0",
        status === "active" ? "bg-emerald-400" : "bg-gray-400",
      )}
      title={status}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LEFT PANEL — CHANNEL / STATUS FILTERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function FilterSidebar({
  channelFilters,
  statusFilter,
  onChannelChange,
  onStatusChange,
  channelCounts,
  statusCounts,
}: {
  channelFilters: string[];
  statusFilter: string;
  onChannelChange: (channels: string[]) => void;
  onStatusChange: (status: string) => void;
  channelCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}) {
  const channelTotal = Object.values(channelCounts).reduce((a, b) => a + b, 0);

  return (
    <aside className={cn(
      "hidden lg:flex flex-col shrink-0 w-[200px] xl:w-[220px] border-r",
      "bg-card/50 overflow-y-auto",
    )}>
      {/* Channel filters */}
      <div className="p-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground/60 px-2.5 mb-2">
          Channels
        </p>
        {ALL_CHANNELS.map(ch => {
          const isAll = ch === "all";
          const meta = isAll ? null : CHANNEL_META[ch];
          const isActive = isAll ? channelFilters.length === 0 : channelFilters.includes(ch);
          const count = isAll ? channelTotal : (channelCounts[ch] ?? 0);

          return (
              <button
              key={ch}
              onClick={() => {
                if (isAll) {
                  onChannelChange([]);
                  return;
                }
                const next = channelFilters.includes(ch)
                  ? channelFilters.filter(c => c !== ch)
                  : [...channelFilters, ch];
                onChannelChange(next);
              }}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-2.5 py-2",
                "text-xs font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {isAll ? (
                <Hash size={13} className="shrink-0" />
              ) : (
                <ChannelIcon channel={ch} size={13} />
              )}
              <span className="flex-1 text-left truncate">
                {isAll ? "All Channels" : meta?.label}
              </span>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-mono tabular-nums rounded-full bg-muted/50 px-1.5 py-0.5",
                  isActive ? "bg-primary/20 text-primary/80" : "text-muted-foreground/60",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t" />

      {/* Status filters */}
      <div className="p-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground/60 px-2.5 mb-2">
          Status
        </p>
        {STATUS_FILTERS.map(status => {
          const isActive = statusFilter === status;
          const labels: Record<string, string> = {
            all: "All",
            unread: "Unread",
            escalated: "Escalated",
            ai_active: "AI Active",
            mine: "Mine",
            resolved: "Resolved",
          };
          const count = statusCounts[status] ?? 0;
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-2.5 py-2",
                "text-xs font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="flex-1 text-left font-heading">{labels[status]}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-mono tabular-nums rounded-full bg-muted/50 px-1.5 py-0.5",
                  isActive ? "bg-primary/20 text-primary/80" : "text-muted-foreground/60",
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MOBILE FILTER BAR (visible on <md instead of sidebar)
   ═══════════════════════════════════════════════════════════════════════════════ */

function MobileFilterBar({
  channelFilters,
  statusFilter,
  onChannelChange,
  onStatusChange,
}: {
  channelFilters: string[];
  statusFilter: string;
  onChannelChange: (channels: string[]) => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="lg:hidden border-b bg-card/50 px-4 py-3 space-y-2.5">
      {/* Channel pills — horizontally scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ALL_CHANNELS.map(ch => {
          const isAll = ch === "all";
          const meta = isAll ? null : CHANNEL_META[ch];
          const isActive = isAll ? channelFilters.length === 0 : channelFilters.includes(ch);
          return (
            <button
              key={ch}
              onClick={() => {
                if (isAll) {
                  onChannelChange([]);
                  return;
                }
                const next = channelFilters.includes(ch)
                  ? channelFilters.filter(c => c !== ch)
                  : [...channelFilters, ch];
                onChannelChange(next);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 shrink-0",
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

      {/* Status toggle - horizontal scroll on very small screens */}
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_FILTERS.map(status => {
          const isActive = statusFilter === status;
          const labels: Record<string, string> = {
            all: "All",
            unread: "Unread",
            escalated: "Esc",
            ai_active: "AI",
            mine: "Mine",
            resolved: "Done",
          };
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold font-heading transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {labels[status]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MIDDLE PANEL — THREAD LIST
   ═══════════════════════════════════════════════════════════════════════════════ */

function ThreadListPanel({
  threads,
  isLoading,
  searchValue,
  onSearchChange,
  selectedThreadId,
  onSelectThread,
  onClearFilters,
}: {
  threads: InboxThreadItem[];
  isLoading: boolean;
  searchValue: string;
  onSearchChange: (q: string) => void;
  selectedThreadId: string | null;
  onSelectThread: (id: string) => void;
  onClearFilters?: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 82,
    overscan: 8,
  });

  return (
    <div className="flex flex-col w-full md:w-[320px] lg:w-[280px] xl:w-[320px] shrink-0 min-w-0 min-h-0 h-full">
      {/* Search bar */}
      <div className="shrink-0 p-3 border-b">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search conversations..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") {
                onSearchChange("");
                onClearFilters?.();
              }
            }}
            className="pl-8 h-9 text-xs bg-card"
          />
        </div>
      </div>

      {/* Thread list - hidden scrollbar */}
      <div ref={parentRef} className="flex-1 h-full min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isLoading ? (
          <div className="p-3 space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No conversations found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const thread = threads[virtualRow.index];
              if (!thread) return null;
              return (
                <div
                  key={thread.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ThreadRow
                    thread={thread}
                    isSelected={selectedThreadId === thread.id}
                    onSelect={() => onSelectThread(thread.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  isSelected,
  onSelect,
}: {
  thread: InboxThreadItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const slaInfo = thread.sla_deadline
    ? getSlaStatus(thread.sla_deadline, thread.escalated_at)
    : null;
  const isOverdue = slaInfo ? slaInfo.remainingMs <= 0 : false;
  const slaProgress = slaInfo ? Math.min(1, Math.max(0, 1 - slaInfo.percent)) : 0;
  const slaLabel = slaInfo
    ? isOverdue
      ? "Overdue"
      : `${Math.max(1, Math.ceil(slaInfo.remainingMs / 60000))}m left`
    : null;

  const autocompletePrefix = thread.last_message_role
    ? thread.last_message_role === "user"
      ? "You:"
      : thread.last_message_role === "agent"
      ? "Agent:"
      : `${thread.last_message_role}:`
    : "";

  // Channel color for the left bar indicator
  const channelColors: Record<string, string> = {
    whatsapp: "#25D366",
    instagram: "#E1306C",
    facebook: "#1877F2",
    email: "#F59E0B",
    sms: "#8B5CF6",
    web: "#4F8EF7",
  };
  const channelColor = channelColors[thread.channel] ?? "#4F8EF7";

  const quickActions = (
    <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
      {thread.status !== "resolved" && (
        <button
          className="rounded-md bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            inboxApi.resolve(thread.id).catch(() => null);
          }}
        >
          Resolve
        </button>
      )}
      {thread.status !== "escalated" ? (
        <button
          className="rounded-md bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            inboxApi.escalate(thread.id).catch(() => null);
          }}
        >
          Escalate
        </button>
      ) : (
        <button
          className="rounded-md bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            inboxApi.deescalate(thread.id).catch(() => null);
          }}
        >
          De-esc
        </button>
      )}
    </div>
  );

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex items-start gap-3 w-full text-left px-3 py-3 transition-all group",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50",
        isSelected && "bg-primary/5 hover:bg-primary/8",
        thread.is_unread && !isSelected && "bg-primary/[0.03]",
      )}
    >
      {/* Channel color indicator bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-opacity",
          isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100",
        )}
        style={{ backgroundColor: channelColor }}
      />

      {/* Avatar */}
      <div className="relative shrink-0 ml-1">
        <ContactAvatar name={thread.contact_name} size="sm" />
        {thread.is_unread && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            "text-[13px] truncate",
            thread.is_unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
          )}>
            {thread.contact_name || "Anonymous Visitor"}
          </span>
          <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums shrink-0">
            {relativeTime(thread.last_message_at)}
          </span>
        </div>

        {/* Middle row: status indicators */}
        <div className="flex items-center gap-1.5 mb-1">
          <StatusDot status={thread.status} />
          {thread.status === "escalated" && (
            <span className="text-[10px] text-amber-400 font-semibold font-heading">Escalated</span>
          )}
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {thread.message_count} msg{thread.message_count !== 1 ? "s" : ""}
          </span>
          {slaLabel && (
            <span className={cn(
              "text-[10px] font-mono font-medium",
              isOverdue ? "text-rose-400" : "text-amber-400",
            )}>
              {slaLabel}
            </span>
          )}
        </div>

        {/* Last message preview - strip markdown for clean display */}
        <p className={cn(
          "text-xs leading-relaxed line-clamp-1",
          thread.is_unread ? "text-foreground/70" : "text-muted-foreground",
        )}>
          {autocompletePrefix ? `${autocompletePrefix} ` : ""}
          {thread.last_message ? stripMarkdown(thread.last_message) : "No messages yet"}
        </p>

        {/* SLA progress bar for escalated */}
        {slaInfo && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-muted/30 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isOverdue ? "bg-rose-500" : "bg-amber-500",
              )}
              style={{ width: `${Math.round(slaProgress * 100)}%` }}
            />
          </div>
        )}
      </div>
      {quickActions}
    </button>
  );
}

function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}) {
  const [channel, setChannel] = useState("web");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const createConversation = useCreateInboxConversation();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: "Message is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const result = await createConversation.mutateAsync({
        channel,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        initial_message: message.trim(),
      });

      toast({ title: "Conversation created" });
      onCreated(result.conversation_id);
      onOpenChange(false);
      setChannel("web");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setMessage("");
    } catch {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-4 py-3 z-10">
          <DialogTitle className="font-heading text-sm font-semibold">New Conversation</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
              Channel
            </p>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_CHANNELS.filter(c => c !== "all").map(c => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2">
                      <ChannelIcon channel={c} size={12} />
                      {CHANNEL_META[c]?.label ?? c}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
              Contact Info
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Name"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="Phone"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="h-9 text-xs sm:col-span-2"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
              Message
            </p>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Write a message to start the conversation"
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-9 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="h-9 text-xs gap-1.5"
          >
            <Send size={12} />
            {submitting ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CONTACT PANEL — Right sidebar with contact info, notes, history
   ═══════════════════════════════════════════════════════════════════════════════ */

function ContactPanel({
  detail,
  onSelectThread,
}: {
  detail: InboxThreadDetailResponse | null;
  onSelectThread: (id: string) => void;
}) {
  const queryClient = useQueryClient();

  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string | null>(null);
  const [leadStatusDraft, setLeadStatusDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const contactQuery = useQuery({
    queryKey: ["inbox", "contact", detail?.conversation_id ?? ""],
    queryFn: () => inboxApi.getContact(detail!.conversation_id),
    enabled: Boolean(detail?.conversation_id),
    staleTime: 60_000,
  });

  const historyQuery = useInboxHistory(detail?.conversation_id ?? null);

  useEffect(() => {
    if (contactQuery.data) {
      setNotesDraft(contactQuery.data.notes ?? "");
      setTagsDraft(contactQuery.data.tags?.join(", ") ?? "");
      setLeadStatusDraft(contactQuery.data.lead_status ?? "");
    }
  }, [contactQuery.data]);

  const contactUpdateMutation = useMutation({
    mutationFn: (payload: { notes?: string; tags?: string[]; lead_status?: string }) =>
      inboxApi.updateContact(detail!.conversation_id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", "contact", detail?.conversation_id ?? ""] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });


  const escalationsQuery = useQuery({
    queryKey: ["inbox", "escalations", detail?.conversation_id ?? ""],
    queryFn: () => inboxApi.getEscalations(detail!.conversation_id),
    enabled: Boolean(detail?.conversation_id),
    staleTime: 60_000,
  });
  const escalations = escalationsQuery.data?.escalations ?? [];
  const history = historyQuery.data?.history ?? [];

  if (!detail) {
    return (
      <div className="hidden xl:flex flex-col items-center justify-center w-[280px] shrink-0 border-l bg-card/30">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
          <User size={16} className="text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground/60">Select a conversation</p>
      </div>
    );
  }

  return (
    <aside className="hidden xl:flex flex-col w-[280px] shrink-0 border-l bg-card/30 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Contact header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2.5">
          <ContactAvatar name={detail.contact_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold font-heading truncate">
              {detail.contact_name || "Anonymous"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {detail.contact_email && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <Mail size={10} />
                  {detail.contact_email}
                </span>
              )}
            </div>
            {detail.contact_phone && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Phone size={10} />
                {detail.contact_phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile section */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Profile</p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!detail) return;
              setSavingNotes(true);
              try {
                const payload: { notes?: string; tags?: string[]; lead_status?: string } = {};
                if (notesDraft !== null) payload.notes = notesDraft;
                if (tagsDraft !== null) payload.tags = tagsDraft.split(",").map(t => t.trim()).filter(Boolean);
                if (leadStatusDraft && leadStatusDraft !== "unset") {
                  payload.lead_status = leadStatusDraft;
                }
                await contactUpdateMutation.mutateAsync(payload);
              } finally {
                setSavingNotes(false);
              }
            }}
            disabled={savingNotes}
            className="h-6 text-[10px] px-2"
          >
            {savingNotes ? "..." : "Save"}
          </Button>
        </div>
        <div className="space-y-2">
          <Input
            value={tagsDraft ?? ""}
            onChange={(e) => setTagsDraft(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="h-8 text-[11px] bg-card"
          />
          <Select value={leadStatusDraft ?? ""} onValueChange={setLeadStatusDraft}>
            <SelectTrigger className="h-8 w-full text-[11px]">
              <SelectValue placeholder="Lead status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Unset</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes section */}
      <div className="p-3 border-b">
        <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">Notes</p>
        <Textarea
          value={notesDraft ?? ""}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={3}
          placeholder="Internal notes..."
          className="text-[11px] bg-card resize-none"
        />
      </div>

      {/* History section */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">History</p>
          {historyQuery.isLoading && <span className="text-[9px] text-muted-foreground">...</span>}
        </div>
        {history.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60">No prior conversations.</p>
        ) : (
          <div className="space-y-1">
            {history.slice(0, 5).map((h: InboxContactHistoryItem) => (
              <button
                key={h.conversation_id}
                onClick={() => onSelectThread(h.conversation_id)}
                className="w-full text-left rounded border border-border/50 p-2 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium capitalize">{h.status}</span>
                  <span className="text-[9px] text-muted-foreground/60 font-mono">{h.message_count} msgs</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Escalations section */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Escalations</p>
          {escalationsQuery.isLoading && <span className="text-[9px] text-muted-foreground">...</span>}
        </div>
        {escalations.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60">No escalations.</p>
        ) : (
          <div className="space-y-1">
            {escalations.slice(0, 5).map(e => (
              <div key={e.id} className="rounded border border-border/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium capitalize">{e.type}</span>
                  <span className="text-[9px] text-muted-foreground/60 font-mono">
                    {e.created_at ? formatTimestamp(e.created_at) : ""}
                  </span>
                </div>
                {e.reason && <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1">{e.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MESSAGE PANEL — Messages + Reply Composer (Middle-right area)
   ═══════════════════════════════════════════════════════════════════════════════ */

function MessagePanel({
  thread,
  detail,
  isLoading,
  onBack,
  showBackButton,
}: {
  thread: InboxThreadItem | null;
  detail: InboxThreadDetailResponse | null;
  isLoading: boolean;
  onBack: () => void;
  showBackButton: boolean;
}) {
  const reply = useInboxReply();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const takeoverMutation = useMutation({
    mutationFn: () => {
      if (!detail) return Promise.resolve({ success: false });
      return inboxApi.takeover(detail.conversation_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const handbackMutation = useMutation({
    mutationFn: () => {
      if (!detail) return Promise.resolve({ success: false });
      return inboxApi.handback(detail.conversation_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const [replyText, setReplyText] = useState("");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [draftConfidence, setDraftConfidence] = useState<number | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [templates, setTemplates] = useState<InboxTemplateItem[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [mobileContactOpen, setMobileContactOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const templatesQuery = useQuery({
    queryKey: ["inbox", "templates"],
    queryFn: () => inboxApi.listTemplates(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (templatesQuery.data) {
      setTemplates(templatesQuery.data.templates);
    }
  }, [templatesQuery.data]);

  const whatsappWindowExpired = useMemo(() => {
    if (detail?.channel !== "whatsapp" || !detail?.last_user_message_at) return false;
    const last = new Date(detail.last_user_message_at).getTime();
    return Date.now() - last > 24 * 60 * 60 * 1000;
  }, [detail?.channel, detail?.last_user_message_at]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!detail?.messages) return;
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [detail?.messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !detail) return;
    try {
      await reply.mutateAsync({
        conversationId: detail.conversation_id,
        body: replyText.trim(),
        internalNote: isInternalNote,
      });
      setReplyText("");
      setIsInternalNote(false);
    } catch (err) {
      const detailMsg = (err as any)?.response?.data?.detail || (err as any)?.message;
      toast({
        title: "Failed to send message",
        description: detailMsg ? String(detailMsg) : undefined,
        variant: "destructive",
      });
    }
  }, [replyText, detail, reply, isInternalNote, toast]);

  const handleDraft = useCallback(async () => {
    if (!detail) return;
    setDrafting(true);
    try {
      const result = await inboxApi.aiDraft(detail.conversation_id, detail.channel);
      setDraftText(result.draft);
      setDraftConfidence(result.confidence);
      setTimeout(() => {
        document.getElementById("inbox-reply-textarea")?.focus();
      }, 50);
    } catch {
      // swallow
    } finally {
      setDrafting(false);
    }
  }, [detail]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  // Empty state
  if (!thread) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center flex-1 bg-card/20">
        <div className="text-center px-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <InboxIcon size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-heading font-semibold text-foreground/70 mb-1">
            No conversation selected
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-[240px] leading-relaxed">
            Select a conversation from the list to view messages
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading || !detail) {
    return (
      <div className={cn("flex flex-col flex-1", showBackButton ? "" : "hidden md:flex")}>
        <div className="p-3 border-b">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-10 w-2/3 ml-auto" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      </div>
    );
  }

  const currentUserId = user?.user_id;
  const isAssignedToMe = Boolean(detail.assigned_to && currentUserId && detail.assigned_to === currentUserId);
  const isTakenByOther = Boolean(detail.handled_by === "agent" && detail.assigned_to && detail.assigned_to !== currentUserId);
  const canTakeOver = detail.handled_by === "ai" || isTakenByOther;
  const channelMeta = (CHANNEL_META[detail.channel] ?? CHANNEL_META.web) ?? { className: "", label: detail.channel };

  return (
    <div className={cn("flex flex-col flex-1 min-w-0 h-full border-l border-border", showBackButton ? "" : "hidden md:flex")}>
      {/* Compact header */}
      <div className="shrink-0 border-b px-3 py-2 flex items-center gap-2">
        {showBackButton && (
          <button onClick={onBack} className="shrink-0 rounded p-1 hover:bg-muted transition-colors">
            <ArrowLeft size={16} className="text-muted-foreground" />
          </button>
        )}
        <ContactAvatar name={detail.contact_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">{detail.contact_name || "Anonymous"}</span>
            <span className={cn("inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[9px] font-medium", channelMeta.className)}>
              <ChannelIcon channel={detail.channel} size={9} />
            </span>
            <Badge variant="outline" className={cn("text-[9px] py-0 h-4", 
              detail.status === "active" ? "border-emerald-500/30 text-emerald-400" :
              detail.status === "escalated" ? "border-amber-500/30 text-amber-400" : "border-gray-500/30 text-gray-400"
            )}>
              {detail.status === "active" ? "Active" : detail.status === "escalated" ? "Escalated" : "Resolved"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile contact info button - visible below xl */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileContactOpen(true)}
            className="h-6 w-6 p-0 xl:hidden"
            title="Contact Info"
          >
            <User size={14} className="text-muted-foreground" />
          </Button>
          {canTakeOver && (
            <Button
              variant={isAssignedToMe ? "secondary" : "outline"}
              size="sm"
              onClick={async () => {
                try {
                  if (isAssignedToMe) await handbackMutation.mutateAsync();
                  else await takeoverMutation.mutateAsync();
                } catch {}
              }}
              disabled={takeoverMutation.isPending || handbackMutation.isPending}
              className="h-6 text-[10px] px-2"
            >
              {isAssignedToMe ? "Hand back" : "Take over"}
            </Button>
          )}
          {detail.status === "escalated" ? (
            <Button variant="outline" size="sm" onClick={() => inboxApi.deescalate(detail.conversation_id).catch(() => {})} className="h-6 text-[10px] px-2">
              De-esc
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => inboxApi.escalate(detail.conversation_id).catch(() => {})} className="h-6 text-[10px] px-2">
              Escalate
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Contact Info Sheet */}
      <Sheet open={mobileContactOpen} onOpenChange={setMobileContactOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 [&>button]:hidden">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-sm font-heading">Contact Info</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100vh-60px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Contact header */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <ContactAvatar name={detail.contact_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold font-heading truncate">
                    {detail.contact_name || "Anonymous"}
                  </p>
                  {detail.contact_email && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <Mail size={11} />
                      {detail.contact_email}
                    </span>
                  )}
                  {detail.contact_phone && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <Phone size={11} />
                      {detail.contact_phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Conversation details */}
            <div className="p-4 border-b space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Conversation
              </p>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel</span>
                  <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium", channelMeta.className)}>
                    <ChannelIcon channel={detail.channel} size={10} />
                    {channelMeta.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={cn("text-[10px] py-0 h-5", 
                    detail.status === "active" ? "border-emerald-500/30 text-emerald-400" :
                    detail.status === "escalated" ? "border-amber-500/30 text-amber-400" : "border-gray-500/30 text-gray-400"
                  )}>
                    {detail.status === "active" ? "Active" : detail.status === "escalated" ? "Escalated" : "Resolved"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Handler</span>
                  <span className="font-medium">{detail.handled_by === "ai" ? "AI" : "Agent"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span className="font-mono">{detail.messages?.length ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                Actions
              </p>
              {canTakeOver && (
                <Button
                  variant={isAssignedToMe ? "secondary" : "outline"}
                  size="sm"
                  onClick={async () => {
                    try {
                      if (isAssignedToMe) await handbackMutation.mutateAsync();
                      else await takeoverMutation.mutateAsync();
                      setMobileContactOpen(false);
                    } catch {}
                  }}
                  disabled={takeoverMutation.isPending || handbackMutation.isPending}
                  className="w-full h-9 text-xs"
                >
                  {isAssignedToMe ? "Hand back to AI" : "Take over conversation"}
                </Button>
              )}
              {detail.status === "escalated" ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    inboxApi.deescalate(detail.conversation_id).catch(() => {});
                    setMobileContactOpen(false);
                  }} 
                  className="w-full h-9 text-xs"
                >
                  De-escalate
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    inboxApi.escalate(detail.conversation_id).catch(() => {});
                    setMobileContactOpen(false);
                  }} 
                  className="w-full h-9 text-xs"
                >
                  Escalate
                </Button>
              )}
              {detail.status !== "resolved" && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    inboxApi.resolve(detail.conversation_id).catch(() => {});
                    setMobileContactOpen(false);
                  }} 
                  className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  Mark as Resolved
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Messages - hidden scrollbar */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(() => {
          const messages = detail?.messages ?? [];
          // Group messages by date (today/yesterday/other)
          const groups: { label: string; messages: InboxMessageItem[] }[] = [];
          let lastLabel: string | null = null;
          messages.forEach(msg => {
            const label = msg.created_at ? formatGroupDay(msg.created_at) : "";
            if (label !== lastLabel) {
              groups.push({ label, messages: [msg] });
              lastLabel = label;
            } else {
              const lastGroup = groups[groups.length - 1];
              if (lastGroup) {
                lastGroup.messages.push(msg);
              }
            }
          });
          return groups.map(group => (
            <div key={group.label}>
              {/* Date separator */}
              <div className="flex items-center justify-center py-2">
                <div className="h-px flex-1 bg-border/30" />
                <span className="px-3 text-[10px] font-medium text-muted-foreground/60 font-heading uppercase tracking-wide">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border/30" />
              </div>

              {/* Messages */}
              <div className="space-y-2.5">
              {group.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isAssistant = msg.role === "assistant";
                const isSystem = msg.role === "system";
                const isInternalNote = (msg.metadata as any)?.internal_note;
                
                // Check if this is first AI message in a sequence (for showing avatar/header)
                const prevMsg = group.messages[idx - 1];
                const isFirstInSequence = !prevMsg || prevMsg.role !== msg.role;

                // User message bubble - compact
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
                          {(() => {
                            const deliveryStatus = (msg.metadata as any)?.delivery_status;
                            if (!deliveryStatus) return null;
                            return (
                              <>
                                <span className={cn(
                                  "rounded-full px-1 py-px text-[8px] font-medium",
                                  deliveryStatus === "failed"
                                    ? "bg-rose-500/10 text-rose-400"
                                    : "bg-emerald-500/10 text-emerald-400",
                                )}>
                                  {deliveryStatus === "failed" ? "Failed" : "Sent"}
                                </span>
                                {deliveryStatus === "failed" && (
                                  <button
                                    className="text-[9px] font-medium text-primary-foreground/80 underline"
                                    onClick={async () => {
                                      try {
                                        await inboxApi.reply(detail!.conversation_id, msg.content, false);
                                      } catch {
                                        // ignore
                                      }
                                    }}
                                  >
                                    Retry
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                }

                // AI Assistant message bubble - world-class design
                if (isAssistant) {
                  const metadata = msg.metadata as any;
                  const sources = metadata?.sources as string[] | undefined;
                  const confidence = metadata?.confidence as number | undefined;
                  const showLowConfidence = confidence !== undefined && confidence < 0.8;

                  return (
                    <div key={msg.id} className="flex justify-start group/ai">
                      <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[78%]">
                        {/* AI Avatar - only show for first in sequence */}
                        {isFirstInSequence ? (
                          <div className="flex-shrink-0 h-5 w-5 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm mt-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 flex-shrink-0" /> /* Spacer for alignment */
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {/* AI Header - only show for first in sequence */}
                          {isFirstInSequence && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-[10px] font-medium text-muted-foreground/70 font-heading">
                                NexaChat AI
                              </span>
                              {showLowConfidence && (
                                <span className="text-[9px] text-amber-400 flex items-center gap-0.5" title="This answer may not be fully accurate">
                                  <span className="inline-block">⚠</span> Lower confidence
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* AI Bubble with distinct styling - compact */}
                          <div className={cn(
                            "px-3 py-2 rounded-[3px_14px_14px_14px]",
                            "bg-primary/[0.05] border border-primary/[0.10]",
                            "transition-all duration-150",
                            "group-hover/ai:border-primary/15 group-hover/ai:bg-primary/[0.07]",
                          )}>
                            {/* Compact prose styling - smaller text, tighter spacing, smaller headings, superscript citations */}
                            <div className="text-[13px] text-foreground/90 leading-[1.6] space-y-1.5 [&_p]:m-0 [&_p]:leading-[1.6] [&_pre]:my-1.5 [&_pre]:rounded-md [&_pre]:bg-background/60 [&_pre]:border [&_pre]:border-border/40 [&_pre]:text-[11px] [&_pre]:p-2 [&_code]:text-primary/80 [&_code]:font-mono [&_code]:text-[11px] [&_code]:before:content-none [&_code]:after:content-none [&_ul]:my-1 [&_ul]:pl-3.5 [&_ul]:space-y-0.5 [&_ol]:my-1 [&_ol]:pl-3.5 [&_ol]:space-y-0.5 [&_li]:text-[13px] [&_li]:leading-[1.5] [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:mt-1.5 [&_h2]:mb-0.5 [&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:mt-1 [&_h3]:mb-0.5 [&_h4]:text-[11px] [&_h4]:font-medium [&_h4]:mt-1 [&_h4]:mb-0.5 [&_strong]:text-foreground [&_strong]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-2 [&_blockquote]:text-[12px] [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_.citation]:text-[9px] [&_.citation]:text-primary/70 [&_.citation]:font-mono [&_.citation]:ml-px">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                {formatCitations(msg.content || "")}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Source chips (if present) - smaller */}
                          {sources && sources.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {sources.slice(0, 3).map((source, i) => (
                                <button
                                  key={i}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-medium text-primary/80 bg-primary/[0.06] border border-primary/[0.12] hover:bg-primary/[0.10] transition-colors"
                                >
                                  <span className="text-[8px]">📄</span>
                                  <span className="truncate max-w-[100px]">{source}</span>
                                </button>
                              ))}
                              {sources.length > 3 && (
                                <span className="text-[9px] text-muted-foreground/60 self-center">
                                  +{sources.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Timestamp - smaller */}
                          <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">
                            {formatTimestamp(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // System message (centered, subtle)
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className={cn(
                        "max-w-[60%] px-4 py-2 rounded-full text-center",
                        "bg-muted/30 border border-dashed border-muted/40",
                        isInternalNote && "border-amber-500/30 bg-amber-500/5",
                      )}>
                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50 font-mono mt-1">
                          <span>{formatTimestamp(msg.created_at)}</span>
                          {isInternalNote && (
                            <span className="text-amber-400 font-semibold">Note</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Fallback (shouldn't happen)
                return null;
              })}
              </div>
            </div>
          ));
        })()}

        {drafting && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2 max-w-[85%]">
              {/* AI Avatar */}
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm mt-0.5">
                <Sparkles className="h-2.5 w-2.5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-medium text-muted-foreground/70 font-heading">
                    NexaChat AI
                  </span>
                </div>
                <div className="px-3 py-2 rounded-[3px_14px_14px_14px] bg-primary/[0.05] border border-primary/[0.10]">
                  <div className="flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1 w-1 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1 w-1 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                    <span className="ml-1.5 text-[12px] text-muted-foreground/70">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {reply.isPending && (
          <div className="flex justify-end">
            <div className="max-w-[85%]">
              <div className="flex items-center justify-end gap-1.5 rounded-2xl rounded-br-sm bg-primary/20 px-3 py-2 text-[12px] font-medium text-primary">
                Sending...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply composer ── */}
      <div className="shrink-0 border-t p-3 sm:p-4">
        {draftText && (
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold font-heading text-primary">AI Draft</p>
                {draftConfidence != null && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Confidence: {Math.round(draftConfidence * 100)}%
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyText(draftText);
                    setDraftText(null);
                  }}
                  className="h-7 text-[11px] px-2"
                >
                  Use draft
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftText(null)}
                  className="h-7 text-[11px] px-2"
                >
                  Discard
                </Button>
              </div>
            </div>
            <div className="mt-2 rounded-lg bg-card p-2.5 text-xs text-foreground leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftText}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Textarea
            id="inbox-reply-textarea"
            placeholder="Type your reply... (Ctrl+Enter to send)"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="text-xs bg-card resize-none min-h-[60px]"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <Switch checked={isInternalNote} onCheckedChange={setIsInternalNote} className="scale-90" />
              Internal note
            </label>
            {whatsappWindowExpired && (
              <p className="text-[11px] text-amber-400">
                WhatsApp 24h window expired
              </p>
            )}
          </div>

          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTemplateOpen(true)}
              className="h-8 text-[11px] px-2.5"
            >
              Templates
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDraft}
              disabled={!detail || drafting}
              className="h-8 text-[11px] px-2.5 gap-1"
            >
              {drafting ? "..." : "AI Draft"}
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => void handleSend()}
              disabled={!replyText.trim() || reply.isPending || whatsappWindowExpired}
              className="gap-1.5 h-8 px-3 text-[11px]"
            >
              <Send size={12} />
              <span className="hidden sm:inline">
                {reply.isPending ? "Sending..." : "Send"}
              </span>
            </Button>
          </div>

          <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0">
              <DialogHeader className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-4 py-3 z-10">
                <DialogTitle className="font-heading text-sm font-semibold">Message Templates</DialogTitle>
              </DialogHeader>
              <div className="px-4 py-4 space-y-4">
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">
                    No templates saved yet
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        className="text-left rounded-lg border border-border/50 px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors"
                        onClick={() => {
                          setReplyText(t.content);
                          setIsTemplateOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                            {t.created_at ? formatTimestamp(t.created_at) : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {t.content}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                    Save as template
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      placeholder="Template name"
                      className="flex-1 h-9 text-xs"
                    />
                    <Button
                      size="sm"
                      disabled={!templateName.trim() || !replyText.trim()}
                      onClick={async () => {
                        try {
                          await inboxApi.createTemplate({
                            name: templateName.trim(),
                            content: replyText.trim(),
                          });
                          setTemplateName("");
                          templatesQuery.refetch();
                        } catch {
                          // ignore
                        }
                      }}
                      className="h-9 text-xs px-3"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Inbox() {
  const [channelFilters, setChannelFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  // Mobile: when a thread is selected, show the detail view instead of the list
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const handleClearFilters = useCallback(() => {
    setChannelFilters([]);
    setStatusFilter("all");
  }, []);

  /* ── Build API filters ─────────────────────────────────────────────────── */

  // Debounce search input to avoid firing API requests on every keystroke.
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const apiFilters = useMemo<InboxListFilters>(() => {
    const f: InboxListFilters = { page: 1, per_page: 50 };
    if (channelFilters.length > 0) f.channel = channelFilters;
    if (statusFilter !== "all") f.status = statusFilter;
    if (debouncedSearch) f.search = debouncedSearch;
    return f;
  }, [channelFilters, statusFilter, debouncedSearch]);

  /* ── Hooks ─────────────────────────────────────────────────────────────── */

  const { data: listData, isLoading: listLoading } = useInboxList(apiFilters);
  const { data: threadDetail, isLoading: detailLoading } = useInboxThread(selectedThreadId);

  // Realtime updates (SSE) for inbox events
  useInboxRealtime();

  /* ── Derive displayed data (API-driven) ─────────────────────────────── */

  const threads = useMemo(() => listData?.threads ?? [], [listData]);

  // Channel & status counts from API (used for sidebar badge counts)
  const counts = listData?.counts ?? {
    all: 0,
    unread: 0,
    escalated: 0,
    ai_active: 0,
    mine: 0,
    resolved: 0,
  };

  const channelCounts = listData?.channel_counts ?? {};

  // Selected thread object
  const selectedThread = useMemo(
    () => threads.find(t => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const resolvedDetail = threadDetail ?? null;

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const handleSelectThread = useCallback((id: string) => {
    setSelectedThreadId(id);
    setMobileShowDetail(true);
  }, []);

  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
    if (isInputFocused) return;

    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      const currentIndex = threads.findIndex(t => t.id === selectedThreadId);
      const nextIndex = Math.min(threads.length - 1, Math.max(0, currentIndex + 1));
      if (threads[nextIndex]) {
        handleSelectThread(threads[nextIndex].id);
      }
    }

    if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      const currentIndex = threads.findIndex(t => t.id === selectedThreadId);
      const prevIndex = Math.min(threads.length - 1, Math.max(0, currentIndex - 1));
      if (threads[prevIndex]) {
        handleSelectThread(threads[prevIndex].id);
      }
    }

    // Tab switching (1-6)
    if (/[1-6]/.test(event.key)) {
      event.preventDefault();
      const tabMap: Record<string, string> = {
        "1": "all",
        "2": "unread",
        "3": "escalated",
        "4": "ai_active",
        "5": "mine",
        "6": "resolved",
      };
      const newStatus = tabMap[event.key];
      if (newStatus) setStatusFilter(newStatus);
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      document.getElementById("inbox-reply-textarea")?.focus();
    }

    if (event.shiftKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      if (resolvedDetail && resolvedDetail.status !== "escalated") {
        void inboxApi.escalate(resolvedDetail.conversation_id);
      }
    }
  }, [threads, selectedThreadId, resolvedDetail, handleSelectThread]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardNavigation);
    return () => window.removeEventListener("keydown", handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  const handleMobileBack = useCallback(() => {
    setMobileShowDetail(false);
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col w-full min-w-0 h-full">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="shrink-0 sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight leading-none">
              Inbox
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-description hidden sm:block">
              Unified conversations across all channels
            </p>
          </div>
          {counts.unread > 0 && (
            <Badge className="bg-primary/10 text-primary text-[11px] font-mono">
              {counts.unread} unread
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsCreateOpen(true)}
            title="New Conversation"
          >
            <MessageSquare size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hidden md:flex"
            onClick={() => setShowRightPanel(prev => !prev)}
            title={showRightPanel ? "Hide details" : "Show details"}
          >
            <User size={16} />
          </Button>
        </div>
      </div>
    </div>

      <NewConversationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(id) => {
          setSelectedThreadId(id);
          setMobileShowDetail(true);
        }}
      />

      {/* Mobile filter bar */}
      {!mobileShowDetail && (
        <MobileFilterBar
          channelFilters={channelFilters}
          statusFilter={statusFilter}
          onChannelChange={setChannelFilters}
          onStatusChange={setStatusFilter}
        />
      )}

      {/* 4-Column layout: FilterSidebar | ThreadList | MessagePanel | ContactPanel */}
      <div className="flex items-stretch flex-1 h-full min-h-0 overflow-hidden border-t bg-card">
        {/* LEFT: Filter sidebar (lg+) */}
        <FilterSidebar
          channelFilters={channelFilters}
          statusFilter={statusFilter}
          onChannelChange={setChannelFilters}
          onStatusChange={setStatusFilter}
          channelCounts={channelCounts}
          statusCounts={counts}
        />

        {/* Thread list — hidden on mobile when detail is shown */}
        {!mobileShowDetail && (
          <ThreadListPanel
            threads={threads}
            isLoading={listLoading}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onClearFilters={handleClearFilters}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
          />
        )}
        {/* On md+, thread list is always visible */}
        {mobileShowDetail && (
          <div className="hidden md:block h-full">
            <ThreadListPanel
              threads={threads}
              isLoading={listLoading}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              onClearFilters={handleClearFilters}
              selectedThreadId={selectedThreadId}
              onSelectThread={handleSelectThread}
            />
          </div>
        )}

        {/* Message panel - takes remaining space */}
        {mobileShowDetail ? (
          // Mobile: messages take full width
          <MessagePanel
            thread={selectedThread}
            detail={resolvedDetail}
            isLoading={detailLoading}
            onBack={handleMobileBack}
            showBackButton={true}
          />
        ) : showRightPanel ? (
          // Desktop: show message panel
          <MessagePanel
            thread={selectedThread}
            detail={resolvedDetail}
            isLoading={detailLoading}
            onBack={handleMobileBack}
            showBackButton={false}
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center flex-1 bg-card/20">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <InboxIcon size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Messages hidden</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Toggle using the button in the header
            </p>
          </div>
        )}

        {/* Contact panel - right sidebar (xl+ only) */}
        {showRightPanel && (
          <ContactPanel
            detail={resolvedDetail}
            onSelectThread={handleSelectThread}
          />
        )}
      </div>
    </div>
  );
}
