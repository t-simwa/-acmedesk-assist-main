/**
 * Conversations — 7.4 (All 5 specs)
 * Filters, Stats Bar, Table, Detail Panel, Bulk Actions
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  MessageSquare, Search, X, ChevronDown, Download,
  Trash2, Tag, Clock,
  ThumbsUp, ThumbsDown, CheckCircle2,
  RefreshCw, ChevronLeft, ChevronRight,
  Flag, User, MoreHorizontal, Send,
  Instagram, Facebook, Cpu, AlertCircle,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD_BG = "#1C1F26";
const INPUT_BG = "#111827";
const BORDER = "#2D333B";
const TEXT = "#F9FAFB";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const BLUE = "#4F8EF7";
const GREEN = "#10B981";
const AMBER = "#F59E0B";
const ROSE = "#EF4444";

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_STATS = { total: 1247, active: 312, resolved: 782, escalated: 89, abandoned: 64 };
const MOCK_CONVERSATIONS: ConversationListItem[] = [
  { id: "1", channel: "web", contact_name: "Sarah Johnson", contact_phone: null, contact_email: "sarah@acme.com", first_message: "Hi, I need help with my subscription billing. The charge on my account doesn't match what I expected.", message_count: 8, status: "resolved", rating: "positive", duration_minutes: 12.3, started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "2", channel: "whatsapp", contact_name: "Marcus Williams", contact_phone: "+1 555 0102", contact_email: null, first_message: "What are your business hours? I need to speak to someone urgently.", message_count: 4, status: "escalated", rating: null, duration_minutes: 5.1, started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: "3", channel: "instagram", contact_name: null, contact_phone: null, contact_email: null, first_message: "Do you ship internationally? What are the shipping rates to Australia?", message_count: 6, status: "active", rating: null, duration_minutes: null, started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "4", channel: "web", contact_name: "Emily Chen", contact_phone: null, contact_email: "emily.chen@gmail.com", first_message: "I'm looking for the Pro plan pricing. Can you compare it against the Business plan?", message_count: 11, status: "resolved", rating: "positive", duration_minutes: 18.7, started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: "5", channel: "facebook", contact_name: "David Okafor", contact_phone: null, contact_email: null, first_message: "How do I reset my password? I'm locked out of my account.", message_count: 3, status: "resolved", rating: "negative", duration_minutes: 3.2, started_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: "6", channel: "whatsapp", contact_name: "Priya Patel", contact_phone: "+44 7700 900123", contact_email: "priya@techcorp.io", first_message: "We are interested in the Enterprise plan for our team of 50. Can we schedule a demo?", message_count: 15, status: "active", rating: null, duration_minutes: null, started_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "7", channel: "web", contact_name: null, contact_phone: null, contact_email: null, first_message: "What integrations do you support? Does it work with Salesforce?", message_count: 5, status: "abandoned", rating: null, duration_minutes: 7.8, started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];

const MOCK_DETAIL = {
  id: "1",
  channel: "web",
  status: "resolved",
  rating: "positive",
  message_count: 8,
  started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  resolved_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  last_activity_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  page_url: "https://acme.com/pricing",
  duration_minutes: 12.3,
  is_flagged: false,
  contact: {
    id: "c1",
    full_name: "Sarah Johnson",
    email: "sarah@acme.com",
    phone: "+1 555 0101",
    instagram_handle: null,
    company: "Acme Corp",
    lead_status: "qualified",
    channels_used: ["web"],
    first_seen_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    notes: null,
  },
  messages: [
    { id: "m1", role: "user", content: "Hi, I need help with my subscription billing. The charge on my account doesn't match what I expected.", citations: null, confidence_score: null, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: "m2", role: "assistant", content: "Hello Sarah! I'd be happy to help you with your billing question. Your current plan is the Growth plan at $99/month, billed on the 1st of each month. The charge you're seeing should reflect your most recent billing cycle.", citations: [{ source: "Billing FAQ.pdf" }], confidence_score: 0.94, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString() },
    { id: "m3", role: "user", content: "But I was charged $129. I thought I was on the $99 plan.", citations: null, confidence_score: null, created_at: new Date(Date.now() - 1.9 * 60 * 60 * 1000).toISOString() },
    { id: "m4", role: "assistant", content: "I can see that your account was upgraded to the Pro plan on the 15th, which is why the charge was prorated to $129 for the month. Would you like me to show you the full breakdown of the proration calculation?", citations: [{ source: "Pricing Guide.pdf" }, { source: "Proration Policy.pdf" }], confidence_score: 0.91, created_at: new Date(Date.now() - 1.85 * 60 * 60 * 1000).toISOString() },
    { id: "m5", role: "user", content: "Yes please, that would be helpful.", citations: null, confidence_score: null, created_at: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString() },
    { id: "m6", role: "assistant", content: "Here's the breakdown: Growth plan ($99) × 15/30 days = $49.50 credit + Pro plan ($149) × 15/30 days = $74.50. Total: $124.00 + applicable taxes = $129.00. This is correct per our proration policy.", citations: [{ source: "Billing FAQ.pdf" }], confidence_score: 0.97, created_at: new Date(Date.now() - 1.75 * 60 * 60 * 1000).toISOString() },
    { id: "m7", role: "user", content: "Ah that makes sense! Thank you for explaining.", citations: null, confidence_score: null, created_at: new Date(Date.now() - 1.7 * 60 * 60 * 1000).toISOString() },
    { id: "m8", role: "assistant", content: "You're welcome, Sarah! If you have any other questions about your billing or account, feel free to ask anytime. Have a great day!", citations: null, confidence_score: 0.99, created_at: new Date(Date.now() - 1.65 * 60 * 60 * 1000).toISOString() },
  ],
  timeline: [
    { event: "Conversation Started", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), detail: "via web" },
    { event: "Contact Identified", timestamp: new Date(Date.now() - 1.98 * 60 * 60 * 1000).toISOString(), detail: "Sarah Johnson" },
    { event: "Resolved", timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), detail: null },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, string> = {
  web: "🌐", whatsapp: "💬", instagram: "📸", facebook: "💙", email: "📧", sms: "📱",
};
const CHANNEL_COLORS: Record<string, string> = {
  web: BLUE, whatsapp: GREEN, instagram: AMBER, facebook: "#3B82F6", email: "#8B5CF6", sms: "#EC4899",
};

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
  if (!mins) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

function formatTimestamp(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: "Active", bg: "rgba(79,142,247,0.15)", color: BLUE },
    resolved: { label: "Resolved", bg: "rgba(16,185,129,0.15)", color: GREEN },
    escalated: { label: "Escalated", bg: "rgba(245,158,11,0.15)", color: AMBER },
    abandoned: { label: "Abandoned", bg: "rgba(107,114,128,0.15)", color: DIM },
  };
  const s = map[status] ?? map.active;
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full font-heading"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose: () => void;
}) {
  const { data: rawDetail, isLoading } = useConversationDetail(conversationId);
  const detail = rawDetail ?? (conversationId === "1" ? MOCK_DETAIL : null);

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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: conversationId, status: newStatus });
      toast({ title: "Status updated", description: `Conversation marked as ${newStatus}` });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleFlag = async () => {
    const next = !isFlagged;
    setIsFlagged(next);
    try {
      await toggleFlag.mutateAsync(conversationId);
      toast({ title: next ? "Flagged for training" : "Flag removed", description: next ? "Conversation added to training queue" : "Conversation removed from training queue" });
    } catch {
      setIsFlagged(!next);
      toast({ title: "Error", description: "Failed to toggle flag", variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote.mutateAsync({ id: conversationId, note: noteText.trim() });
      setLocalNotes(prev => [...prev, { text: noteText.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      setNoteText("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    }
  };

  const contact = detail?.contact;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(680px, 100vw)",
        background: CARD_BG,
        borderLeft: `1px solid ${BORDER}`,
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          background: "#0D1117",
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-md transition-colors"
          style={{ width: 28, height: 28, color: MUTED, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          aria-label="Close panel"
        >
          <X size={16} />
        </button>

        <span style={{ fontSize: 16, color: DIM }}>
          {CHANNEL_ICONS[detail?.channel ?? "web"] ?? "🌐"}
        </span>
        <span className="text-sm font-semibold font-heading truncate flex-1" style={{ color: TEXT }}>
          {contact?.full_name ?? detail?.contact?.phone ?? "Anonymous"}
        </span>
        {detail && <StatusBadge status={detail.status} />}

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleFlag}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all font-description"
            style={{
              background: isFlagged ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
              color: isFlagged ? AMBER : MUTED,
              border: `1px solid ${isFlagged ? "rgba(245,158,11,0.3)" : BORDER}`,
            }}
            title={isFlagged ? "Remove from training" : "Flag for training"}
          >
            <Flag size={12} fill={isFlagged ? AMBER : "none"} />
            {isFlagged ? "Flagged" : "Flag"}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all font-description"
                style={{ background: "rgba(255,255,255,0.05)", color: MUTED, border: `1px solid ${BORDER}` }}
              >
                Status <ChevronDown size={11} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ background: "#111827", border: `1px solid ${BORDER}` }} align="end">
              {["active", "resolved", "escalated", "abandoned"].map(s => (
                <DropdownMenuItem
                  key={s}
                  className="text-xs font-description capitalize cursor-pointer"
                  style={{ color: TEXT }}
                  onClick={() => handleStatusChange(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      {isLoading && !detail ? (
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" style={{ background: "#111827" }} />
          ))}
        </div>
      ) : detail ? (
        <div className="flex-1 overflow-hidden flex" style={{ minHeight: 0 }}>
          {/* Left: Transcript */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: "16px", scrollbarWidth: "none", borderRight: `1px solid ${BORDER}` } as React.CSSProperties}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-4 font-heading" style={{ color: DIM }}>
              Transcript
            </div>
            <div className="space-y-3">
              {detail.messages.map(msg => {
                if (msg.role === "system") {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="text-xs italic font-description" style={{ color: DIM }}>
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: "8px 12px",
                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isUser ? BLUE : "rgba(255,255,255,0.06)",
                        border: isUser ? "none" : `1px solid ${BORDER}`,
                        color: isUser ? "#fff" : TEXT,
                        fontSize: 13,
                        lineHeight: 1.5,
                        fontFamily: "'Satoshi', sans-serif",
                      }}
                    >
                      {msg.content}
                    </div>
                    {/* Citations */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.citations.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-description px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: "rgba(79,142,247,0.12)", color: BLUE, border: `1px solid rgba(79,142,247,0.2)` }}
                          >
                            📄 {c.source ?? c.title ?? "Source"}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] mt-1 font-mono" style={{ color: DIM }}>
                      {formatTimestamp(msg.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Contact + Timeline + Notes */}
          <div
            className="overflow-y-auto flex-shrink-0"
            style={{ width: 220, padding: "16px 14px", scrollbarWidth: "none" } as React.CSSProperties}
          >
            {/* Contact card */}
            <div style={{ background: "#111827", borderRadius: 10, padding: 12, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mx-auto mb-2"
                style={{ background: `linear-gradient(135deg, ${BLUE}, #7C3AED)` }}
              >
                {getInitials(contact?.full_name ?? null)}
              </div>
              <div className="text-center mb-2">
                <div className="text-sm font-semibold font-heading truncate" style={{ color: TEXT }}>
                  {contact?.full_name ?? "Anonymous"}
                </div>
                {contact?.company && (
                  <div className="text-xs font-description" style={{ color: MUTED }}>{contact.company}</div>
                )}
              </div>
              {contact?.email && (
                <div className="text-xs font-description truncate mb-1 flex items-center gap-1" style={{ color: MUTED }}>
                  <span style={{ color: DIM }}>✉</span> {contact.email}
                </div>
              )}
              {contact?.phone && (
                <div className="text-xs font-description mb-1 flex items-center gap-1" style={{ color: MUTED }}>
                  <span style={{ color: DIM }}>📞</span> {contact.phone}
                </div>
              )}
              {contact?.lead_status && (
                <div className="mt-2 text-center">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase font-heading"
                    style={{ background: "rgba(79,142,247,0.15)", color: BLUE }}
                  >
                    {contact.lead_status}
                  </span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3 font-heading" style={{ color: DIM }}>
                Timeline
              </div>
              <div className="relative">
                {detail.timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-2.5 mb-3 relative">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: idx === detail.timeline.length - 1 ? GREEN : BLUE }}
                      />
                      {idx < detail.timeline.length - 1 && (
                        <div className="w-px flex-1 mt-1" style={{ background: BORDER, minHeight: 12 }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="text-xs font-medium font-description" style={{ color: TEXT }}>{event.event}</div>
                      {event.detail && (
                        <div className="text-[10px] font-description" style={{ color: MUTED }}>{event.detail}</div>
                      )}
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: DIM }}>
                        {relativeTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 font-heading" style={{ color: DIM }}>
                Notes
              </div>
              {localNotes.map((note, i) => (
                <div key={i} style={{ background: "#111827", borderRadius: 8, padding: "8px 10px", border: `1px solid ${BORDER}`, marginBottom: 6 }}>
                  <div className="text-xs font-description" style={{ color: TEXT }}>{note.text}</div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: DIM }}>{note.time}</div>
                </div>
              ))}
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add internal note..."
                className="text-xs font-description resize-none"
                style={{ background: "#111827", border: `1px solid ${BORDER}`, color: TEXT, minHeight: 60 }}
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteText.trim() || addNote.isPending}
                className="mt-1.5 w-full text-xs font-description"
                style={{ background: BLUE, color: "#fff", height: 30 }}
              >
                <Send size={11} className="mr-1" />
                {addNote.isPending ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={32} style={{ color: DIM, margin: "0 auto 8px" }} />
            <div className="text-sm font-description" style={{ color: MUTED }}>Conversation not found</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Conversations() {
  const [filters, setFilters] = useState<ConversationListFilters>({ page: 1, per_page: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; type: "single" | "bulk"; id?: string }>({ open: false, type: "bulk" });
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();

  const { data: listData, isLoading: listLoading, refetch } = useConversationsList(filters);
  const bulkAction = useBulkConversationAction();

  const conversations = listData?.conversations ?? MOCK_CONVERSATIONS;
  const stats = listData?.stats ?? MOCK_STATS;
  const total = listData?.total ?? MOCK_CONVERSATIONS.length;
  const totalPages = Math.ceil(total / (filters.per_page ?? 20));

  // Compute active filter count
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

  // Select all/none
  const allSelected = conversations.length > 0 && conversations.every(c => selectedIds.has(c.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk actions
  const handleBulkResolve = async () => {
    try {
      await bulkAction.mutateAsync({ action: "resolve", conversation_ids: Array.from(selectedIds) });
      toast({ title: `${selectedIds.size} conversations resolved` });
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Error", description: "Bulk resolve failed", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
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
  };

  const handleBulkTag = async () => {
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
  };

  const handleBulkExport = async () => {
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
        a.href = url; a.download = `conversations-export.csv`; a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: `${selectedIds.size} conversations exported` });
    } catch {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  };

  const currentPage = filters.page ?? 1;
  const perPage = filters.per_page ?? 20;
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  return (
    <div className="relative min-h-full" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* ── 7.4.1 Page Header + Filters ─────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold font-heading" style={{ color: TEXT }}>
              Conversations
            </h1>
            <p className="text-sm font-description mt-0.5" style={{ color: MUTED }}>
              Full conversation history and management
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="font-description text-xs"
            style={{ color: MUTED, border: `1px solid ${BORDER}` }}
          >
            <RefreshCw size={13} className="mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1" style={{ minWidth: 220, maxWidth: 280 }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DIM }} />
            <Input
              value={filters.search ?? ""}
              onChange={e => updateFilter("search", e.target.value || undefined)}
              placeholder="Search contacts or messages..."
              className="pl-8 text-sm font-description h-9"
              style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>

          {/* Channel */}
          <Select
            value={filters.channel ?? "all"}
            onValueChange={v => updateFilter("channel", v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-9 text-sm font-description w-36" style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}>
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent style={{ background: "#111827", border: `1px solid ${BORDER}` }}>
              <SelectItem value="all" className="text-sm font-description" style={{ color: TEXT }}>All Channels</SelectItem>
              <SelectItem value="web" className="text-sm font-description" style={{ color: TEXT }}>🌐 Web</SelectItem>
              <SelectItem value="whatsapp" className="text-sm font-description" style={{ color: TEXT }}>💬 WhatsApp</SelectItem>
              <SelectItem value="instagram" className="text-sm font-description" style={{ color: TEXT }}>📸 Instagram</SelectItem>
              <SelectItem value="facebook" className="text-sm font-description" style={{ color: TEXT }}>💙 Facebook</SelectItem>
              <SelectItem value="email" className="text-sm font-description" style={{ color: TEXT }}>📧 Email</SelectItem>
              <SelectItem value="sms" className="text-sm font-description" style={{ color: TEXT }}>📱 SMS</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={filters.status ?? "all"}
            onValueChange={v => updateFilter("status", v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-9 text-sm font-description w-36" style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ background: "#111827", border: `1px solid ${BORDER}` }}>
              <SelectItem value="all" className="text-sm font-description" style={{ color: TEXT }}>All Status</SelectItem>
              <SelectItem value="active" className="text-sm font-description" style={{ color: TEXT }}>Active</SelectItem>
              <SelectItem value="resolved" className="text-sm font-description" style={{ color: TEXT }}>Resolved</SelectItem>
              <SelectItem value="escalated" className="text-sm font-description" style={{ color: TEXT }}>Escalated</SelectItem>
              <SelectItem value="abandoned" className="text-sm font-description" style={{ color: TEXT }}>Abandoned</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={filters.date_from ?? ""}
              onChange={e => updateFilter("date_from", e.target.value || undefined)}
              className="h-9 text-xs font-mono w-36"
              style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
            <span className="text-xs" style={{ color: DIM }}>–</span>
            <Input
              type="date"
              value={filters.date_to ?? ""}
              onChange={e => updateFilter("date_to", e.target.value || undefined)}
              className="h-9 text-xs font-mono w-36"
              style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>

          {/* Rating */}
          <Select
            value={filters.rating ?? "all"}
            onValueChange={v => updateFilter("rating", v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-9 text-sm font-description w-32" style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}>
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent style={{ background: "#111827", border: `1px solid ${BORDER}` }}>
              <SelectItem value="all" className="text-sm font-description" style={{ color: TEXT }}>All Ratings</SelectItem>
              <SelectItem value="positive" className="text-sm font-description" style={{ color: TEXT }}>👍 Positive</SelectItem>
              <SelectItem value="negative" className="text-sm font-description" style={{ color: TEXT }}>👎 Negative</SelectItem>
              <SelectItem value="none" className="text-sm font-description" style={{ color: TEXT }}>No Rating</SelectItem>
            </SelectContent>
          </Select>

          {/* Active filter badge + clear */}
          {activeFilterCount > 0 && (
            <>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full font-heading"
                style={{ background: "rgba(79,142,247,0.15)", color: BLUE }}
              >
                {activeFilterCount} active
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-description flex items-center gap-1 transition-colors"
                style={{ color: MUTED }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
              >
                <X size={11} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 7.4.2 Stats Summary Bar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KPICard
          label="Total"
          value={stats.total.toLocaleString()}
          icon={<MessageSquare size={18} style={{ color: BLUE }} />}
        />
        <KPICard
          label="Active"
          value={stats.active.toLocaleString()}
          icon={<CheckCircle2 size={18} style={{ color: GREEN }} />}
        />
        <KPICard
          label="Resolved"
          value={stats.resolved.toLocaleString()}
          icon={<CheckCircle2 size={18} style={{ color: DIM }} />}
        />
        <KPICard
          label="Escalated"
          value={stats.escalated.toLocaleString()}
          icon={<AlertCircle size={18} style={{ color: AMBER }} />}
        />
        <KPICard
          label="Abandoned"
          value={stats.abandoned.toLocaleString()}
          icon={<X size={18} style={{ color: ROSE }} />}
        />
      </div>

      {/* ── 7.4.3 Conversations Table ─────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
      >
        {/* Table wrapper for horizontal scroll on mobile */}
        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 800, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "#0D1117" }}>
                <th className="p-3" style={{ width: 40 }}>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    className="border-gray-600"
                  />
                </th>
                {["Channel", "Contact", "First Message", "Msgs", "Status", "Rating", "Duration", "Date", ""].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider font-heading"
                    style={{ color: DIM, whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-4 rounded" style={{ background: "#111827", width: j === 0 ? 20 : j === 3 ? 160 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <MessageSquare size={28} style={{ color: DIM, margin: "0 auto 8px" }} />
                    <div className="text-sm font-description" style={{ color: MUTED }}>No conversations found</div>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-xs mt-2 font-description" style={{ color: BLUE }}>
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                conversations.map(conv => {
                  const isSelected = selectedIds.has(conv.id);
                  const isActive = activeConversationId === conv.id;
                  return (
                    <tr
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: isActive ? "rgba(79,142,247,0.06)" : isSelected ? "rgba(79,142,247,0.04)" : "transparent",
                        cursor: "pointer",
                        transition: "background 120ms ease",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(79,142,247,0.06)" : isSelected ? "rgba(79,142,247,0.04)" : "transparent";
                      }}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleSelect(conv.id); }}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(conv.id)}
                          className="border-gray-600"
                        />
                      </td>

                      {/* Channel */}
                      <td className="px-3 py-3" style={{ whiteSpace: "nowrap" }}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: CHANNEL_COLORS[conv.channel] ?? BLUE }}
                          />
                          <span className="text-xs font-description" style={{ color: MUTED }}>
                            {CHANNEL_ICONS[conv.channel] ?? "🌐"} {conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1)}
                          </span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-3" style={{ maxWidth: 140 }}>
                        <div className="text-sm font-medium font-description truncate" style={{ color: TEXT }}>
                          {conv.contact_name ?? conv.contact_phone ?? "Anonymous"}
                        </div>
                        {conv.contact_email && (
                          <div className="text-xs font-description truncate" style={{ color: DIM }}>
                            {conv.contact_email}
                          </div>
                        )}
                      </td>

                      {/* First message */}
                      <td className="px-3 py-3" style={{ maxWidth: 240 }}>
                        <div
                          className="text-xs font-description"
                          style={{ color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}
                        >
                          {conv.first_message ?? "—"}
                        </div>
                      </td>

                      {/* Message count */}
                      <td className="px-3 py-3" style={{ whiteSpace: "nowrap" }}>
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.06)", color: MUTED }}
                        >
                          {conv.message_count}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3" style={{ whiteSpace: "nowrap" }}>
                        <StatusBadge status={conv.status} />
                      </td>

                      {/* Rating */}
                      <td className="px-3 py-3" style={{ whiteSpace: "nowrap" }}>
                        {conv.rating === "positive" ? (
                          <ThumbsUp size={14} style={{ color: GREEN }} />
                        ) : conv.rating === "negative" ? (
                          <ThumbsDown size={14} style={{ color: ROSE }} />
                        ) : (
                          <span style={{ color: DIM }}>—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-3" style={{ whiteSpace: "nowrap" }}>
                        <span className="text-xs font-mono" style={{ color: MUTED }}>
                          {formatDuration(conv.duration_minutes)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3" style={{ whiteSpace: "nowrap" }}>
                        <span className="text-xs font-description" style={{ color: DIM }}>
                          {relativeTime(conv.started_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="flex items-center justify-center rounded-md transition-colors"
                              style={{ width: 28, height: 28, color: DIM }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <MoreHorizontal size={15} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            style={{ background: "#111827", border: `1px solid ${BORDER}` }}
                          >
                            <DropdownMenuItem
                              className="text-xs font-description cursor-pointer"
                              style={{ color: TEXT }}
                              onClick={() => setActiveConversationId(conv.id)}
                            >
                              <MessageSquare size={12} className="mr-2" /> View Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs font-description cursor-pointer"
                              style={{ color: TEXT }}
                              onClick={async () => {
                                try {
                                  await bulkAction.mutateAsync({ action: "resolve", conversation_ids: [conv.id] });
                                  toast({ title: "Conversation resolved" });
                                } catch {
                                  toast({ title: "Error", variant: "destructive" });
                                }
                              }}
                            >
                              <CheckCircle2 size={12} className="mr-2" /> Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuSeparator style={{ background: BORDER }} />
                            <DropdownMenuItem
                              className="text-xs font-description cursor-pointer"
                              style={{ color: ROSE }}
                              onClick={() => setConfirmDelete({ open: true, type: "single", id: conv.id })}
                            >
                              <Trash2 size={12} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!listLoading && conversations.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <div className="text-xs font-description" style={{ color: DIM }}>
              Showing {startItem}–{endItem} of {total}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-description" style={{ color: MUTED }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={currentPage <= 1}
                onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) - 1 }))}
                style={{ height: 28, color: MUTED, border: `1px solid ${BORDER}`, padding: "0 8px" }}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
                style={{ height: 28, color: MUTED, border: `1px solid ${BORDER}`, padding: "0 8px" }}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 7.4.4 Detail Panel ────────────────────────────────────────────────── */}
      {/* Backdrop overlay */}
      {activeConversationId && (
        <div
          className="fixed inset-0 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.35)", zIndex: 75 }}
          onClick={() => setActiveConversationId(null)}
        />
      )}
      {/* Slide-in panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
          transform: activeConversationId ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          width: "min(680px, 100vw)",
        }}
      >
        {activeConversationId && (
          <DetailPanel
            conversationId={activeConversationId}
            onClose={() => setActiveConversationId(null)}
          />
        )}
      </div>

      {/* ── 7.4.5 Bulk Actions Bar ───────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          transform: selectedIds.size > 0 ? "translateY(0)" : "translateY(100%)",
          transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1)",
          padding: "0 24px 16px",
          pointerEvents: selectedIds.size > 0 ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 mx-auto"
          style={{
            background: "#1C1F26",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
            maxWidth: 640,
          }}
        >
          <span className="text-sm font-semibold font-heading" style={{ color: TEXT, flexShrink: 0 }}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Button
              size="sm"
              onClick={handleBulkResolve}
              disabled={bulkAction.isPending}
              className="text-xs font-description h-8"
              style={{ background: "rgba(16,185,129,0.15)", color: GREEN, border: `1px solid rgba(16,185,129,0.3)` }}
            >
              <CheckCircle2 size={12} className="mr-1.5" /> Mark Resolved
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmDelete({ open: true, type: "bulk" })}
              disabled={bulkAction.isPending}
              className="text-xs font-description h-8"
              style={{ background: "rgba(239,68,68,0.12)", color: ROSE, border: `1px solid rgba(239,68,68,0.25)` }}
            >
              <Trash2 size={12} className="mr-1.5" /> Delete
            </Button>
            <Button
              size="sm"
              onClick={handleBulkExport}
              disabled={bulkAction.isPending}
              className="text-xs font-description h-8"
              style={{ background: "rgba(255,255,255,0.06)", color: MUTED, border: `1px solid ${BORDER}` }}
            >
              <Download size={12} className="mr-1.5" /> Export
            </Button>
            <Button
              size="sm"
              onClick={() => setTagDialogOpen(true)}
              disabled={bulkAction.isPending}
              className="text-xs font-description h-8"
              style={{ background: "rgba(124,58,237,0.12)", color: "#A78BFA", border: `1px solid rgba(124,58,237,0.25)` }}
            >
              <Tag size={12} className="mr-1.5" /> Tag
            </Button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center justify-center rounded-md flex-shrink-0 transition-colors"
            style={{ width: 28, height: 28, color: MUTED }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            title="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ────────────────────────────────────────── */}
      <Dialog open={confirmDelete.open} onOpenChange={open => !open && setConfirmDelete({ open: false, type: "bulk" })}>
        <DialogContent style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT }}>
          <DialogHeader>
            <DialogTitle className="font-heading" style={{ color: TEXT }}>
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm font-description" style={{ color: MUTED }}>
            {confirmDelete.type === "bulk"
              ? `Are you sure you want to delete ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`
              : "Are you sure you want to delete this conversation? This cannot be undone."}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete({ open: false, type: "bulk" })}
              className="text-sm font-description"
              style={{ color: MUTED, border: `1px solid ${BORDER}` }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={bulkAction.isPending}
              className="text-sm font-description"
              style={{ background: ROSE, color: "#fff" }}
            >
              {bulkAction.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tag Dialog ────────────────────────────────────────────────────────── */}
      <Dialog open={tagDialogOpen} onOpenChange={open => { if (!open) { setTagDialogOpen(false); setTagInput(""); } }}>
        <DialogContent style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT }}>
          <DialogHeader>
            <DialogTitle className="font-heading" style={{ color: TEXT }}>Tag Conversations</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-description mb-3" style={{ color: MUTED }}>
            Enter a tag to apply to {selectedIds.size} selected conversation{selectedIds.size > 1 ? "s" : ""}:
          </p>
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="e.g. billing, urgent, follow-up"
            className="text-sm font-description"
            style={{ background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT }}
            onKeyDown={e => { if (e.key === "Enter") handleBulkTag(); }}
          />
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => { setTagDialogOpen(false); setTagInput(""); }}
              className="text-sm font-description"
              style={{ color: MUTED, border: `1px solid ${BORDER}` }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkTag}
              disabled={!tagInput.trim() || bulkAction.isPending}
              className="text-sm font-description"
              style={{ background: BLUE, color: "#fff" }}
            >
              {bulkAction.isPending ? "Applying..." : "Apply Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
