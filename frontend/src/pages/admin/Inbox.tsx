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
  MessageSquare, Inbox as InboxIcon, Hash,
  CheckCircle2, Circle, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useInboxList, useInboxThread, useInboxReply,
} from "@/hooks/useInbox";
import type {
  InboxThreadItem,
  InboxListFilters,
  InboxMessageItem,
  InboxThreadDetailResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const MOCK_THREADS: InboxThreadItem[] = [
  {
    id: "t1", channel: "whatsapp", contact_name: "Sarah Johnson", contact_email: "sarah@acme.com",
    contact_phone: "+1 555 0101", last_message: "Thanks for the quick response! I'll proceed with the Pro plan upgrade.",
    last_message_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(), message_count: 8,
    status: "active", is_unread: true,
  },
  {
    id: "t2", channel: "email", contact_name: "Marcus Williams", contact_email: "marcus@techcorp.io",
    contact_phone: null, last_message: "Can you send me the invoice for last month? I need it for our accounting department.",
    last_message_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(), message_count: 5,
    status: "active", is_unread: true,
  },
  {
    id: "t3", channel: "web", contact_name: null, contact_email: null,
    contact_phone: null, last_message: "Do you ship internationally? What are the shipping rates to Australia?",
    last_message_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), message_count: 3,
    status: "active", is_unread: false,
  },
  {
    id: "t4", channel: "instagram", contact_name: "Emily Chen", contact_email: "emily@startup.io",
    contact_phone: "+44 7700 900123", last_message: "Love the new feature update! Is there a webinar I can attend?",
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), message_count: 6,
    status: "active", is_unread: false,
  },
  {
    id: "t5", channel: "sms", contact_name: "David Okafor", contact_email: null,
    contact_phone: "+1 555 0205", last_message: "Got it, thanks for confirming the appointment.",
    last_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), message_count: 4,
    status: "resolved", is_unread: false,
  },
  {
    id: "t6", channel: "facebook", contact_name: "Priya Patel", contact_email: "priya@enterprise.com",
    contact_phone: null, last_message: "We're interested in the Enterprise plan. Can we schedule a call this week?",
    last_message_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), message_count: 11,
    status: "active", is_unread: true,
  },
  {
    id: "t7", channel: "whatsapp", contact_name: "James Miller", contact_email: "james@retail.com",
    contact_phone: "+1 555 0307", last_message: "Perfect, the issue is resolved now. Thanks for your help!",
    last_message_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), message_count: 9,
    status: "resolved", is_unread: false,
  },
  {
    id: "t8", channel: "email", contact_name: "Anna Kowalski", contact_email: "anna.k@design.co",
    contact_phone: null, last_message: "Is there a way to export our conversation history as a PDF?",
    last_message_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), message_count: 3,
    status: "active", is_unread: false,
  },
  {
    id: "t9", channel: "web", contact_name: "Roberto Fernandez", contact_email: "roberto@logistica.mx",
    contact_phone: "+52 55 1234 5678", last_message: "Necesito ayuda con la integración de API. ¿Hay documentación en español?",
    last_message_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), message_count: 7,
    status: "resolved", is_unread: false,
  },
  {
    id: "t10", channel: "sms", contact_name: "Lisa Chang", contact_email: "lisa@finserv.com",
    contact_phone: "+1 555 0412", last_message: "Can you resend the verification code? I didn't receive it.",
    last_message_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), message_count: 2,
    status: "resolved", is_unread: false,
  },
];

function buildMockDetail(thread: InboxThreadItem): InboxThreadDetailResponse {
  const mockMessages: Record<string, InboxMessageItem[]> = {
    t1: [
      { id: "m1", role: "user", content: "Hi, I need help with my subscription billing. The charge doesn't match what I expected.", created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(), metadata: null },
      { id: "m2", role: "assistant", content: "Hello Sarah! I'd be happy to help with your billing question. Your current plan is the Growth plan at $99/month. Could you tell me which charge seems incorrect?", created_at: new Date(Date.now() - 33 * 60 * 1000).toISOString(), metadata: null },
      { id: "m3", role: "user", content: "I was charged $129 but I thought I was on the $99 plan.", created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(), metadata: null },
      { id: "m4", role: "assistant", content: "I see — your account was upgraded to the Pro plan on the 15th, so the charge was prorated to $129 for the remainder of the billing cycle. Here's the breakdown:\n\n• Growth plan: $99 × 15/30 days = $49.50 credit\n• Pro plan: $149 × 15/30 days = $74.50\n• Total: $124.00 + tax = $129.00", created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), metadata: null },
      { id: "m5", role: "user", content: "Ah that makes sense now! Thank you for explaining.", created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(), metadata: null },
      { id: "m6", role: "assistant", content: "You're welcome! Is there anything else I can help you with regarding your account or billing?", created_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(), metadata: null },
      { id: "m7", role: "user", content: "Actually yes — can I see what features come with the Pro plan?", created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), metadata: null },
      { id: "m8", role: "user", content: "Thanks for the quick response! I'll proceed with the Pro plan upgrade.", created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(), metadata: null },
    ],
    t2: [
      { id: "m1", role: "user", content: "Hi, I need the invoice for last month's subscription.", created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m2", role: "assistant", content: "Hi Marcus! I can help with that. Let me pull up your February invoice.", created_at: new Date(Date.now() - 58 * 60 * 1000).toISOString(), metadata: null },
      { id: "m3", role: "user", content: "Great, our accounting team needs it ASAP for the quarterly report.", created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), metadata: null },
      { id: "m4", role: "assistant", content: "Your February 2026 invoice (INV-2026-0247) for $299.00 has been sent to marcus@techcorp.io. You can also download it from Settings → Billing → Invoice History.", created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(), metadata: null },
      { id: "m5", role: "user", content: "Can you send me the invoice for last month? I need it for our accounting department.", created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(), metadata: null },
    ],
    t3: [
      { id: "m1", role: "user", content: "Do you ship internationally?", created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(), metadata: null },
      { id: "m2", role: "assistant", content: "Yes, we ship to over 40 countries! Shipping rates vary by region. For Australia, standard shipping starts at $12.99 with 7-10 business day delivery.", created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(), metadata: null },
      { id: "m3", role: "user", content: "Do you ship internationally? What are the shipping rates to Australia?", created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), metadata: null },
    ],
    t6: [
      { id: "m1", role: "user", content: "Hi there! We're a team of 50 and looking at your Enterprise plan.", created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m2", role: "assistant", content: "Hello Priya! Great to hear you're considering the Enterprise plan. For a team of 50, we can offer a customized package. Would you like to schedule a demo call?", created_at: new Date(Date.now() - 5.9 * 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m3", role: "user", content: "Yes please! We need SSO, custom SLA, and dedicated support.", created_at: new Date(Date.now() - 5.8 * 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m4", role: "assistant", content: "All of those are included in Enterprise. I'll have our sales team reach out with available times. What timezone are you in?", created_at: new Date(Date.now() - 5.7 * 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m5", role: "user", content: "We're in EST. Mornings work best for us.", created_at: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m6", role: "assistant", content: "Perfect, I've noted your preference for morning EST slots. Our enterprise account manager will reach out within 24 hours with a few options.", created_at: new Date(Date.now() - 5.4 * 60 * 60 * 1000).toISOString(), metadata: null },
      { id: "m7", role: "user", content: "We're interested in the Enterprise plan. Can we schedule a call this week?", created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), metadata: null },
    ],
  };

  const fallbackMessages: InboxMessageItem[] = [
    { id: "m1", role: "user", content: thread.last_message ?? "Hello", created_at: thread.last_message_at, metadata: null },
    { id: "m2", role: "assistant", content: "Thanks for reaching out! How can I help you today?", created_at: thread.last_message_at, metadata: null },
  ];

  return {
    conversation_id: thread.id,
    channel: thread.channel,
    status: thread.status,
    contact_name: thread.contact_name,
    contact_email: thread.contact_email,
    contact_phone: thread.contact_phone,
    messages: mockMessages[thread.id] ?? fallbackMessages,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const ALL_CHANNELS = ["all", "whatsapp", "email", "sms", "facebook", "instagram", "web"] as const;
const STATUS_FILTERS = ["all", "active", "resolved"] as const;

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

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function ContactAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-9 w-9 text-xs", md: "h-10 w-10 text-sm", lg: "h-11 w-11 text-sm" };
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

function ChannelBadge({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
      "text-[11px] font-medium shrink-0",
      meta.className,
    )}>
      <ChannelIcon channel={channel} size={11} />
      {meta.label}
    </span>
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
  channelFilter,
  statusFilter,
  onChannelChange,
  onStatusChange,
  threadCounts,
}: {
  channelFilter: string;
  statusFilter: string;
  onChannelChange: (channel: string) => void;
  onStatusChange: (status: string) => void;
  threadCounts: Record<string, number>;
}) {
  return (
    <aside className={cn(
      "hidden md:flex flex-col shrink-0 w-[220px] border-r",
      "bg-card/50 overflow-y-auto",
    )}>
      {/* Channel filters */}
      <div className="p-3.5 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest font-heading text-muted-foreground/60 px-2.5 mb-2.5">
          Channels
        </p>
        {ALL_CHANNELS.map(ch => {
          const isAll = ch === "all";
          const meta = isAll ? null : CHANNEL_META[ch];
          const isActive = channelFilter === ch;
          const count = isAll
            ? Object.values(threadCounts).reduce((a, b) => a + b, 0)
            : (threadCounts[ch] ?? 0);

          return (
            <button
              key={ch}
              onClick={() => onChannelChange(ch)}
              className={cn(
                "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2.5",
                "text-[13px] font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {isAll ? (
                <Hash size={14} className="shrink-0" />
              ) : (
                <ChannelIcon channel={ch} size={14} />
              )}
              <span className="flex-1 text-left truncate">
                {isAll ? "All Channels" : meta?.label}
              </span>
              {count > 0 && (
                <span className={cn(
                  "text-[11px] font-mono tabular-nums",
                  isActive ? "text-primary/70" : "text-muted-foreground/50",
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
      <div className="p-3.5 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest font-heading text-muted-foreground/60 px-2.5 mb-2.5">
          Status
        </p>
        {STATUS_FILTERS.map(status => {
          const isActive = statusFilter === status;
          const labels: Record<string, string> = { all: "All", active: "Active", resolved: "Resolved" };
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2.5",
                "text-[13px] font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {status === "all" ? (
                <InboxIcon size={14} className="shrink-0" />
              ) : status === "active" ? (
                <Circle size={14} className="shrink-0" />
              ) : (
                <CheckCircle2 size={14} className="shrink-0" />
              )}
              <span className="flex-1 text-left">{labels[status]}</span>
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
  channelFilter,
  statusFilter,
  onChannelChange,
  onStatusChange,
}: {
  channelFilter: string;
  statusFilter: string;
  onChannelChange: (channel: string) => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div className="md:hidden border-b bg-card/50 px-4 py-3 space-y-2.5">
      {/* Channel pills — horizontally scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ALL_CHANNELS.map(ch => {
          const isAll = ch === "all";
          const meta = isAll ? null : CHANNEL_META[ch];
          const isActive = channelFilter === ch;
          return (
            <button
              key={ch}
              onClick={() => onChannelChange(ch)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 shrink-0",
                "text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {isAll ? "All" : (
                <>
                  <ChannelIcon channel={ch} size={12} />
                  {meta?.label}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Status toggle */}
      <div className="flex gap-1">
        {STATUS_FILTERS.map(status => {
          const isActive = statusFilter === status;
          const labels: Record<string, string> = { all: "All", active: "Active", resolved: "Resolved" };
          return (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn(
                "flex-1 rounded-md py-2 text-xs font-semibold font-heading transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
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
  searchQuery,
  onSearchChange,
  selectedThreadId,
  onSelectThread,
}: {
  threads: InboxThreadItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedThreadId: string | null;
  onSelectThread: (id: string) => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0 border-r">
      {/* Search bar */}
      <div className="shrink-0 p-3.5 border-b">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-10 text-sm bg-card"
          />
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No conversations found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {threads.map(thread => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onSelect={() => onSelectThread(thread.id)}
              />
            ))}
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
  const meta = CHANNEL_META[thread.channel] ?? CHANNEL_META.web;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 w-full text-left p-4 transition-all",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50",
        isSelected && "bg-primary/5 hover:bg-primary/8 border-l-2 border-l-primary",
        !isSelected && "border-l-2 border-l-transparent",
        thread.is_unread && !isSelected && "bg-muted/20",
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <ContactAvatar name={thread.contact_name} size="sm" />
        {thread.is_unread && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + time */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn(
            "text-sm truncate",
            thread.is_unread ? "font-bold text-foreground" : "font-medium text-foreground/90",
          )}>
            {thread.contact_name || "Anonymous Visitor"}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">
            {relativeTime(thread.last_message_at)}
          </span>
        </div>

        {/* Middle row: channel badge + message count */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5",
            "text-[11px] font-medium",
            meta.className,
          )}>
            <ChannelIcon channel={thread.channel} size={10} />
            {meta.label}
          </span>
          <StatusDot status={thread.status} />
          <span className="text-[11px] text-muted-foreground/50 font-mono">
            {thread.message_count} msg{thread.message_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Last message preview */}
        <p className={cn(
          "text-[13px] leading-relaxed line-clamp-1",
          thread.is_unread ? "text-foreground/80" : "text-muted-foreground",
        )}>
          {thread.last_message || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RIGHT PANEL — MESSAGE DETAIL + REPLY COMPOSER
   ═══════════════════════════════════════════════════════════════════════════════ */

function DetailPanel({
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
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (detail?.messages) {
      // Small delay so DOM updates before scroll
      const t = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(t);
    }
  }, [detail?.messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !detail) return;
    try {
      await reply.mutateAsync({
        conversationId: detail.conversation_id,
        body: replyText.trim(),
      });
      setReplyText("");
    } catch {
      // Mutation errors handled by react-query
    }
  }, [replyText, detail, reply]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  // Empty state when no thread selected
  if (!thread) {
    return (
      <div className={cn(
        "hidden md:flex flex-col items-center justify-center",
        "w-[40%] min-w-[340px] bg-card/30",
      )}>
        <div className="text-center px-6">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <InboxIcon size={24} className="text-muted-foreground/50" />
          </div>
          <p className="text-sm font-heading font-semibold text-foreground/70 mb-1">
            No conversation selected
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-[260px] leading-relaxed">
            Select a conversation from the list to view messages and reply
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !detail) {
    return (
      <div className={cn(
        "flex flex-col",
        showBackButton ? "flex-1" : "hidden md:flex w-[40%] min-w-[340px]",
      )}>
        <div className="p-4 border-b">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-12 w-2/3 ml-auto" />
          <Skeleton className="h-16 w-3/4" />
        </div>
      </div>
    );
  }

  const channelMeta = CHANNEL_META[detail.channel] ?? CHANNEL_META.web;

  return (
    <div className={cn(
      "flex flex-col",
      showBackButton ? "flex-1" : "hidden md:flex w-[40%] min-w-[340px]",
    )}>
      {/* ── Contact header ── */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={onBack}
              className="shrink-0 rounded-md p-1.5 hover:bg-muted transition-colors"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
          )}
          <ContactAvatar name={detail.contact_name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-sm font-bold text-foreground leading-tight truncate">
                {detail.contact_name || "Anonymous Visitor"}
              </h3>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
                "text-[11px] font-medium",
                channelMeta.className,
              )}>
                <ChannelIcon channel={detail.channel} size={11} />
                {channelMeta.label}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] py-0 h-5 font-heading",
                  detail.status === "active"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                    : "border-gray-500/30 text-gray-400 bg-gray-500/5",
                )}
              >
                {detail.status === "active" ? "Active" : "Resolved"}
              </Badge>
            </div>

            {/* Contact details */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {detail.contact_email && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail size={12} className="text-muted-foreground/60" />
                  <span className="truncate max-w-[180px]">{detail.contact_email}</span>
                </span>
              )}
              {detail.contact_phone && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone size={12} className="text-muted-foreground/60" />
                  {detail.contact_phone}
                </span>
              )}
              {!detail.contact_email && !detail.contact_phone && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                  <User size={12} />
                  No contact info
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {detail.messages.map(msg => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div className="max-w-[85%]">
                <div className={cn(
                  "px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                    : "bg-muted border rounded-2xl rounded-bl-md text-foreground",
                )}>
                  {msg.content}
                </div>
                <p className={cn(
                  "text-[11px] text-muted-foreground/60 font-mono mt-1",
                  isUser ? "text-right" : "text-left",
                )}>
                  {formatTimestamp(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply composer ── */}
      <div className="shrink-0 border-t p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your reply... (Ctrl+Enter to send)"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 text-sm bg-card resize-none min-h-[68px]"
          />
          <Button
            size="sm"
            onClick={() => void handleSend()}
            disabled={!replyText.trim() || reply.isPending}
            className="self-end gap-1.5 h-9 px-4"
          >
            <Send size={14} />
            <span className="hidden sm:inline">
              {reply.isPending ? "Sending..." : "Send"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Inbox() {
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  // Mobile: when a thread is selected, show the detail view instead of the list
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  /* ── Build API filters ─────────────────────────────────────────────────── */

  const apiFilters = useMemo<InboxListFilters>(() => {
    const f: InboxListFilters = { page: 1, per_page: 50 };
    if (channelFilter !== "all") f.channel = channelFilter;
    if (statusFilter !== "all") f.status = statusFilter;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [channelFilter, statusFilter, searchQuery]);

  /* ── Hooks ─────────────────────────────────────────────────────────────── */

  const { data: listData, isLoading: listLoading } = useInboxList(apiFilters);
  const { data: threadDetail, isLoading: detailLoading } = useInboxThread(selectedThreadId);

  /* ── Derive displayed data (mock fallback) ─────────────────────────────── */

  const allThreads = listData?.threads ?? MOCK_THREADS;

  // Apply client-side filtering on mock data if API isn't available
  const threads = useMemo(() => {
    if (listData) return listData.threads; // API returned data, already filtered server-side

    let filtered = allThreads;
    if (channelFilter !== "all") {
      filtered = filtered.filter(t => t.channel === channelFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.contact_name?.toLowerCase().includes(q)) ||
        (t.contact_email?.toLowerCase().includes(q)) ||
        (t.last_message?.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [listData, allThreads, channelFilter, statusFilter, searchQuery]);

  // Channel counts for sidebar badges (computed from unfiltered mock data)
  const threadCounts = useMemo(() => {
    const source = listData?.threads ?? MOCK_THREADS;
    const counts: Record<string, number> = {};
    for (const t of source) {
      counts[t.channel] = (counts[t.channel] ?? 0) + 1;
    }
    return counts;
  }, [listData]);

  // Selected thread object
  const selectedThread = useMemo(
    () => threads.find(t => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  // Thread detail: use API data, else build from mock
  const resolvedDetail = useMemo<InboxThreadDetailResponse | null>(() => {
    if (threadDetail) return threadDetail;
    if (!selectedThread) return null;
    return buildMockDetail(selectedThread);
  }, [threadDetail, selectedThread]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const handleSelectThread = useCallback((id: string) => {
    setSelectedThreadId(id);
    setMobileShowDetail(true);
  }, []);

  const handleMobileBack = useCallback(() => {
    setMobileShowDetail(false);
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 h-full">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Unified conversations across all channels
          </p>
        </div>
      </div>

      {/* Mobile filter bar */}
      {!mobileShowDetail && (
        <MobileFilterBar
          channelFilter={channelFilter}
          statusFilter={statusFilter}
          onChannelChange={setChannelFilter}
          onStatusChange={setStatusFilter}
        />
      )}

      {/* 3-Column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border mx-4 mb-4 sm:mx-6 lg:mx-8 bg-card">
        {/* LEFT: Filter sidebar (md+) */}
        <FilterSidebar
          channelFilter={channelFilter}
          statusFilter={statusFilter}
          onChannelChange={setChannelFilter}
          onStatusChange={setStatusFilter}
          threadCounts={threadCounts}
        />

        {/* MIDDLE: Thread list — hidden on mobile when detail is shown */}
        {!mobileShowDetail && (
          <ThreadListPanel
            threads={threads}
            isLoading={listLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
          />
        )}
        {/* On md+, thread list is always visible */}
        {mobileShowDetail && (
          <div className="hidden md:flex flex-col flex-1 min-w-0 border-r">
            <ThreadListPanel
              threads={threads}
              isLoading={listLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedThreadId={selectedThreadId}
              onSelectThread={handleSelectThread}
            />
          </div>
        )}

        {/* RIGHT: Message detail */}
        {mobileShowDetail ? (
          // Mobile: detail takes full width
          <DetailPanel
            thread={selectedThread}
            detail={resolvedDetail}
            isLoading={detailLoading}
            onBack={handleMobileBack}
            showBackButton={true}
          />
        ) : (
          // Desktop: always show right panel
          <DetailPanel
            thread={selectedThread}
            detail={resolvedDetail}
            isLoading={detailLoading}
            onBack={handleMobileBack}
            showBackButton={false}
          />
        )}
      </div>
    </div>
  );
}
