import { useState, useCallback, useMemo } from "react";
import {
  Users, Search, X, Filter, Download, Trash2, Tag,
  Globe, Phone, Mail, Clock, ChevronLeft, ChevronRight,
  MoreHorizontal, Star, TrendingUp, Calendar, ArrowRight,
  CheckCircle2, AlertCircle, RefreshCw, SlidersHorizontal,
  MessageSquare, Send, FileText, User, Building2, Layers,
  ChevronDown, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useLeadsList, useLeadDetail, useUpdateLeadStatus,
  useAddLeadNote, useRecalculateLeadScore, useBulkLeadAction
} from "@/hooks/useLeads";
import {
  type LeadListItem, type LeadDetailResponse, type LeadListFilters
} from "@/lib/api";
import { KPICard } from "@/components/dashboard/KPICard";
import { useToast } from "@/hooks/use-toast";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATS = { total: 847, new: 124, contacted: 198, qualified: 89, converted: 312, this_month: 67 };

const MOCK_LEADS: LeadListItem[] = [
  { id: "1", contact_id: "c1", conversation_id: "cv1", contact_name: "Sarah Johnson", contact_email: "sarah@acme.com", contact_phone: "+1 555 0101", contact_company: "Acme Corp", channel: "web", source_page_url: "/pricing", first_message: "Hi, I need help comparing your Pro and Business plans. We have a team of 25 people.", status: "qualified", lead_score: "high", message_count: 9, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "2", contact_id: "c2", conversation_id: "cv2", contact_name: "Marcus Williams", contact_email: null, contact_phone: "+1 555 0102", contact_company: null, channel: "whatsapp", source_page_url: null, first_message: "What are your business hours? I need to speak to someone urgently about pricing.", status: "contacted", lead_score: "medium", message_count: 4, created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: "3", contact_id: null, conversation_id: "cv3", contact_name: null, contact_email: null, contact_phone: null, contact_company: null, channel: "instagram", source_page_url: null, first_message: "Do you ship internationally? What are the rates to Australia?", status: "new", lead_score: "low", message_count: 2, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "4", contact_id: "c4", conversation_id: "cv4", contact_name: "Emily Chen", contact_email: "emily.chen@techcorp.io", contact_phone: "+44 7700 900123", contact_company: "TechCorp", channel: "web", source_page_url: "/demo", first_message: "We're interested in the Enterprise plan for our team of 50. Can we schedule a demo call?", status: "converted", lead_score: "high", message_count: 15, created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "5", contact_id: "c5", conversation_id: "cv5", contact_name: "David Okafor", contact_email: "david@startup.io", contact_phone: null, contact_company: "Startup.io", channel: "facebook", source_page_url: null, first_message: "How do I integrate this with our existing Salesforce setup?", status: "new", lead_score: "medium", message_count: 6, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "6", contact_id: "c6", conversation_id: "cv6", contact_name: "Priya Patel", contact_email: "priya@enterprise.com", contact_phone: "+1 555 0106", contact_company: "Enterprise Ltd", channel: "whatsapp", source_page_url: "/enterprise", first_message: "Looking for a platform that can handle 10k conversations per month. Do you have enterprise SLAs?", status: "qualified", lead_score: "high", message_count: 11, created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "7", contact_id: "c7", conversation_id: "cv7", contact_name: "James Miller", contact_email: "james@retail.com", contact_phone: null, contact_company: null, channel: "web", source_page_url: "/", first_message: "What integrations do you support?", status: "new", lead_score: "low", message_count: 1, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
];

const MOCK_DETAIL: LeadDetailResponse = {
  id: "1",
  contact: {
    id: "c1", full_name: "Sarah Johnson", email: "sarah@acme.com", phone: "+1 555 0101",
    company: "Acme Corp", instagram_handle: null,
    channels_used: ["web", "email"], lead_status: "qualified", lead_score: "high",
    tags: ["enterprise", "pricing"], notes: "Very interested in Pro plan. Follow up by Friday.",
  },
  conversation_id: "cv1", channel: "web", source_page_url: "/pricing",
  first_message: "Hi, I need help comparing your Pro and Business plans. We have a team of 25 people.",
  status: "qualified", lead_score: "high", message_count: 9,
  messages: [
    { id: "m1", role: "user", content: "Hi, I need help comparing your Pro and Business plans. We have a team of 25 people.", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 300000).toISOString(), sources: null },
    { id: "m2", role: "assistant", content: "Hello! I'd be happy to help you compare our Pro and Business plans for your team of 25. The Pro plan includes unlimited conversations, 5 team seats, and priority support at $99/month. The Business plan adds custom integrations, 20 team seats, dedicated onboarding, and SLA guarantees at $299/month. For a team of 25, the Business plan would be the better fit.", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 240000).toISOString(), sources: ["pricing-guide.pdf", "plans-comparison.pdf"] },
    { id: "m3", role: "user", content: "What about the Enterprise plan? Is there a trial available?", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 180000).toISOString(), sources: null },
    { id: "m4", role: "assistant", content: "Yes! Our Enterprise plan is fully customizable — pricing depends on conversation volume, team size, and required integrations. We offer a 14-day free trial for all plans. Would you like me to connect you with our sales team for a personalized Enterprise quote?", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 - 120000).toISOString(), sources: null },
  ],
  timeline: [
    { event: "Lead Captured", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), detail: "Via web channel" },
    { event: "Contact Identified", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 60000).toISOString(), detail: "Sarah Johnson" },
    { event: "Lead Qualified", timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), detail: null },
  ],
  notes: [
    { note: "Discussed pricing in detail. Very interested in Pro plan. Follow up by Friday.", created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  ],
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, string> = { web: "🌐", whatsapp: "💬", instagram: "📸", facebook: "💙", email: "📧", sms: "📱" };
const CHANNEL_COLORS: Record<string, string> = { web: "#4F8EF7", whatsapp: "#10B981", instagram: "#F59E0B", facebook: "#3B82F6", email: "#8B5CF6", sms: "#EC4899" };
const STATUS_PIPELINE = ["new", "contacted", "qualified", "converted", "lost"];
const COLUMN_COLORS: Record<string, string> = { new: "#F59E0B", contacted: "#A78BFA", qualified: "#4F8EF7", converted: "#10B981", lost: "#9CA3AF" };

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  new:       { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  text: "#F59E0B" },
  contacted: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", text: "#A78BFA" },
  qualified: { bg: "rgba(79,142,247,0.12)",  border: "rgba(79,142,247,0.3)",  text: "#4F8EF7" },
  converted: { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#10B981" },
  lost:      { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)", text: "#9CA3AF" },
};

const SCORE_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  high:   { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#10B981" },
  medium: { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  text: "#F59E0B" },
  low:    { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)", text: "#9CA3AF" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScorePill({ score }: { score: string | null }) {
  if (!score) return <span style={{ color: "#6B7280", fontSize: 12 }}>—</span>;
  const s = SCORE_STYLE[score] || SCORE_STYLE.low;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}>
      {score.charAt(0).toUpperCase() + score.slice(1)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.new;
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, textTransform: "capitalize" as const }}>
      {status}
    </span>
  );
}

function LeadAvatar({ name, size = 32 }: { name: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.34), fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: "0.02em" }}>
      {getInitials(name)}
    </div>
  );
}

// Kanban: invisible droppable placeholder at bottom of each column
function ColumnDropTarget({ columnId }: { columnId: string }) {
  const { setNodeRef } = useSortable({ id: `__col__${columnId}`, data: { status: columnId } });
  return <div ref={setNodeRef} style={{ height: 8, width: "100%" }} />;
}

// Kanban: draggable lead card
function KanbanCard({ lead, onOpen }: { lead: LeadListItem; onOpen: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { status: lead.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: "#111827",
        border: "1px solid #2D333B",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none" as const,
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <LeadAvatar name={lead.contact_name} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#F9FAFB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lead.contact_name || "Anonymous"}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lead.contact_email || lead.contact_phone || "No contact info"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
        {lead.channel && (
          <span style={{ fontSize: 11, color: "#9CA3AF", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 6px" }}>
            {CHANNEL_ICONS[lead.channel] || "🌐"} {lead.channel}
          </span>
        )}
        <ScorePill score={lead.lead_score} />
        <span style={{ marginLeft: "auto", color: "#6B7280", fontSize: 11 }}>{relativeTime(lead.created_at)}</span>
      </div>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onOpen(lead.id); }}
        style={{ marginTop: 10, width: "100%", background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.18)", color: "#4F8EF7", borderRadius: 7, padding: "5px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
      >
        View Detail
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Leads() {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [filters, setFilters] = useState<LeadListFilters>({ page: 1, per_page: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeLead, setActiveLead] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: listData, isLoading, refetch } = useLeadsList(filters);
  const { data: detailData, isLoading: detailLoading } = useLeadDetail(activeLead);
  const updateStatus = useUpdateLeadStatus();
  const addNote = useAddLeadNote();
  const recalcScore = useRecalculateLeadScore();
  const bulkAction = useBulkLeadAction();
  const { toast } = useToast();

  const leads = listData?.leads ?? MOCK_LEADS;
  const stats = listData?.stats ?? MOCK_STATS;
  const totalPages = Math.ceil((listData?.total ?? MOCK_LEADS.length) / (filters.per_page ?? 20));
  const detail = detailData ?? (activeLead === "1" ? MOCK_DETAIL : null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const updateFilter = useCallback((key: keyof LeadListFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 20 });
  }, []);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "page" && k !== "per_page" && v !== undefined && v !== ""
  ).length;

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map(l => l.id)));
  }, [selectedIds.size, leads]);

  // ── DnD ───────────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;
    if (draggedId === overId) return;

    let targetStatus: string | null = null;
    if (overId.startsWith("__col__")) {
      targetStatus = overId.replace("__col__", "");
    } else {
      const overLead = leads.find(l => l.id === overId);
      if (overLead) targetStatus = overLead.status;
    }

    const activeLd = leads.find(l => l.id === draggedId);
    if (!activeLd || !targetStatus || activeLd.status === targetStatus) return;

    updateStatus.mutate({ id: draggedId, status: targetStatus }, {
      onSuccess: () => {
        toast({ description: `Lead moved to ${targetStatus}` });
        void refetch();
      },
      onError: () => {
        toast({ variant: "destructive", description: "Failed to update lead status" });
      },
    });
  }, [leads, updateStatus, toast, refetch]);

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const handleBulkExport = useCallback(async () => {
    try {
      const result = await bulkAction.mutateAsync({ action: "export", lead_ids: Array.from(selectedIds) });
      if (result.export_data && result.export_data.length > 0) {
        const headers = Object.keys(result.export_data[0]).join(",");
        const rows = result.export_data.map(row =>
          Object.values(row).map(v => String(v ?? "")).join(",")
        ).join("\n");
        const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "leads-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast({ description: `Exported ${result.affected} leads` });
        setSelectedIds(new Set());
      }
    } catch {
      toast({ variant: "destructive", description: "Export failed" });
    }
  }, [bulkAction, selectedIds, toast]);

  const handleBulkStatus = useCallback((status: string) => {
    bulkAction.mutate({ action: "status_change", lead_ids: Array.from(selectedIds), status }, {
      onSuccess: data => {
        toast({ description: `${data.affected} leads updated` });
        setSelectedIds(new Set());
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Bulk update failed" }),
    });
  }, [bulkAction, selectedIds, toast, refetch]);

  const handleBulkDelete = useCallback(() => {
    bulkAction.mutate({ action: "delete", lead_ids: Array.from(selectedIds) }, {
      onSuccess: data => {
        toast({ description: `${data.affected} leads deleted` });
        setSelectedIds(new Set());
        setConfirmDelete(false);
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Delete failed" }),
    });
  }, [bulkAction, selectedIds, toast, refetch]);

  // ── Kanban columns ─────────────────────────────────────────────────────────

  const kanbanColumns = useMemo(() =>
    STATUS_PIPELINE.map(status => ({
      status,
      leads: leads.filter(l => l.status === status),
    }))
  , [leads]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const currentPage = filters.page || 1;
  const perPage = filters.per_page || 20;
  const totalCount = listData?.total ?? MOCK_LEADS.length;
  const fromIdx = (currentPage - 1) * perPage + 1;
  const toIdx = Math.min(currentPage * perPage, totalCount);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px 24px 120px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: "#F9FAFB", margin: 0 }}>
            Leads
          </h1>
          <p className="font-description" style={{ fontSize: 13, color: "#9CA3AF", margin: "4px 0 0" }}>
            Lead pipeline and contact management
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "#111827", border: "1px solid #2D333B", borderRadius: 8, overflow: "hidden" }}>
            {(["table", "kanban"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: view === v ? "#1C1F26" : "transparent",
                  color: view === v ? "#F9FAFB" : "#6B7280",
                  border: "none", display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {v === "table" ? <FileText size={14} /> : <Layers size={14} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => void refetch()}
            style={{ border: "1px solid #2D333B", background: "transparent", color: "#9CA3AF" }}
          >
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
          </Button>
        </div>
      </div>

      {/* ── 7.5.1 Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Total Leads" value={stats.total.toLocaleString()} icon={<Users size={20} />} />
        <KPICard label="New" value={stats.new.toLocaleString()} icon={<AlertCircle size={20} />} />
        <KPICard label="Contacted" value={stats.contacted.toLocaleString()} icon={<MessageSquare size={20} />} />
        <KPICard label="Qualified" value={stats.qualified.toLocaleString()} icon={<CheckCircle2 size={20} />} />
        <KPICard label="Converted" value={stats.converted.toLocaleString()} icon={<ArrowUpRight size={20} />} />
        <KPICard label="This Month" value={stats.this_month.toLocaleString()} icon={<Calendar size={20} />} />
      </div>

      {/* ── 7.5.2 Filters Row ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180, maxWidth: 280 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6B7280", pointerEvents: "none" }} />
          <Input
            placeholder="Search leads..."
            value={filters.search || ""}
            onChange={e => updateFilter("search", e.target.value || undefined)}
            style={{ paddingLeft: 32, background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB" }}
          />
        </div>

        <Select value={filters.status || "_all"} onValueChange={v => updateFilter("status", v === "_all" ? undefined : v)}>
          <SelectTrigger style={{ width: 140, background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB" }}>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.channel || "_all"} onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}>
          <SelectTrigger style={{ width: 145, background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB" }}>
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Channels</SelectItem>
            <SelectItem value="web">🌐 Web</SelectItem>
            <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
            <SelectItem value="instagram">📸 Instagram</SelectItem>
            <SelectItem value="facebook">💙 Facebook</SelectItem>
            <SelectItem value="email">📧 Email</SelectItem>
            <SelectItem value="sms">📱 SMS</SelectItem>
          </SelectContent>
        </Select>

        <input
          type="date"
          value={filters.date_from || ""}
          onChange={e => updateFilter("date_from", e.target.value || undefined)}
          style={{ background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB", borderRadius: 8, padding: "7px 10px", fontSize: 13 }}
        />
        <input
          type="date"
          value={filters.date_to || ""}
          onChange={e => updateFilter("date_to", e.target.value || undefined)}
          style={{ background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB", borderRadius: 8, padding: "7px 10px", fontSize: 13 }}
        />

        <Input
          placeholder="/pricing (source page)"
          value={filters.source_page || ""}
          onChange={e => updateFilter("source_page", e.target.value || undefined)}
          style={{ width: 190, background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB" }}
        />

        {activeFilterCount > 0 && (
          <>
            <span style={{ background: "rgba(79,142,247,0.15)", color: "#4F8EF7", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
              {activeFilterCount} active
            </span>
            <button onClick={clearFilters} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              Clear
            </button>
          </>
        )}
      </div>

      {/* ── 7.5.3 / 7.5.5 Table OR Kanban ── */}
      {view === "table" ? (
        <div style={{ background: "#1C1F26", border: "1px solid #2D333B", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2D333B" }}>
                  <th style={{ width: 44, padding: "12px 16px" }}>
                    <Checkbox
                      checked={selectedIds.size === leads.length && leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  {["Name", "Email / Phone", "Channel", "First Message", "Status", "Score", "Date", ""].map(h => (
                    <th key={h} style={{ padding: "12px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #2D333B" }}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} style={{ padding: "14px 12px" }}>
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "56px 24px", textAlign: "center" }}>
                      <Users size={32} style={{ color: "#2D333B", margin: "0 auto 12px" }} />
                      <div style={{ color: "#6B7280", fontSize: 14 }}>No leads found</div>
                      {activeFilterCount > 0 && (
                        <button onClick={clearFilters} style={{ color: "#4F8EF7", background: "none", border: "none", cursor: "pointer", fontSize: 13, marginTop: 8 }}>
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : leads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setActiveLead(lead.id)}
                    style={{
                      borderBottom: "1px solid #2D333B",
                      cursor: "pointer",
                      background: selectedIds.has(lead.id) ? "rgba(79,142,247,0.05)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        selectedIds.has(lead.id) ? "rgba(79,142,247,0.08)" : "rgba(255,255,255,0.025)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        selectedIds.has(lead.id) ? "rgba(79,142,247,0.05)" : "transparent";
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                    </td>

                    {/* Name */}
                    <td style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <LeadAvatar name={lead.contact_name} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#F9FAFB" }}>
                            {lead.contact_name || "Anonymous"}
                          </div>
                          {lead.contact_company && (
                            <div style={{ fontSize: 11, color: "#6B7280" }}>{lead.contact_company}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email / Phone */}
                    <td style={{ padding: "14px 12px" }}>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {lead.contact_email || <span style={{ color: "#6B7280" }}>—</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>{lead.contact_phone || "—"}</div>
                    </td>

                    {/* Channel */}
                    <td style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>
                      {lead.channel ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: CHANNEL_COLORS[lead.channel] || "#9CA3AF", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                            {CHANNEL_ICONS[lead.channel] || "🌐"} {lead.channel}
                          </span>
                        </div>
                      ) : <span style={{ color: "#6B7280" }}>—</span>}
                    </td>

                    {/* First message */}
                    <td style={{ padding: "14px 12px", maxWidth: 220 }}>
                      <div style={{ fontSize: 12, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.first_message || "—"}
                      </div>
                    </td>

                    {/* Status — clickable dropdown */}
                    <td style={{ padding: "14px 12px" }} onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            <StatusPill status={lead.status} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {STATUS_PIPELINE.map(s => (
                            <DropdownMenuItem
                              key={s}
                              style={{ textTransform: "capitalize" }}
                              onClick={() => updateStatus.mutate({ id: lead.id, status: s }, {
                                onSuccess: () => { toast({ description: `Status → ${s}` }); void refetch(); },
                              })}
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                    {/* Lead score */}
                    <td style={{ padding: "14px 12px" }}>
                      <ScorePill score={lead.lead_score} />
                    </td>

                    {/* Date */}
                    <td style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 12, color: "#6B7280" }}>{relativeTime(lead.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 12px" }} onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" style={{ width: 28, height: 28 }}>
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setActiveLead(lead.id)}>
                            View Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: lead.id, status: "qualified" }, {
                            onSuccess: () => { toast({ description: "Marked as Qualified" }); void refetch(); },
                          })}>
                            Mark Qualified
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: lead.id, status: "converted" }, {
                            onSuccess: () => { toast({ description: "Marked as Converted" }); void refetch(); },
                          })}>
                            Mark Converted
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            style={{ color: "#EF4444" }}
                            onClick={() => { setSelectedIds(new Set([lead.id])); setConfirmDelete(true); }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && leads.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #2D333B", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                Showing {fromIdx}–{toIdx} of {totalCount}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setFilters(p => ({ ...p, page: (p.page || 1) - 1 }))}
                  disabled={currentPage <= 1}
                  style={{ border: "1px solid #2D333B", background: "transparent" }}
                >
                  <ChevronLeft size={14} />
                </Button>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>Page {currentPage} of {totalPages || 1}</span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setFilters(p => ({ ...p, page: (p.page || 1) + 1 }))}
                  disabled={currentPage >= totalPages}
                  style={{ border: "1px solid #2D333B", background: "transparent" }}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── 7.5.5 Kanban View ── */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
            {kanbanColumns.map(col => (
              <div
                key={col.status}
                style={{ flexShrink: 0, width: 256, background: "#1C1F26", border: "1px solid #2D333B", borderRadius: 14, padding: 14 }}
              >
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLUMN_COLORS[col.status] || "#9CA3AF" }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#F9FAFB", textTransform: "capitalize" }}>
                    {col.status}
                  </span>
                  <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.07)", color: "#9CA3AF", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                    {col.leads.length}
                  </span>
                </div>

                {/* Cards */}
                <SortableContext
                  items={[...col.leads.map(l => l.id), `__col__${col.status}`]}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 48 }}>
                    {col.leads.map(lead => (
                      <KanbanCard key={lead.id} lead={lead} onOpen={setActiveLead} />
                    ))}
                    <ColumnDropTarget columnId={col.status} />
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
        </DndContext>
      )}

      {/* ── 7.5.4 Lead Detail Modal ── */}
      <Dialog open={!!activeLead} onOpenChange={open => { if (!open) setActiveLead(null); }}>
        <DialogContent
          className="p-0 overflow-hidden"
          style={{
            maxWidth: 820,
            width: "95vw",
            maxHeight: "90vh",
            background: "#1C1F26",
            border: "1px solid #2D333B",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {detailLoading || !detail ? (
            <div style={{ padding: 28 }}>
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Contact header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #2D333B", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                  <LeadAvatar name={detail.contact?.full_name ?? null} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#F9FAFB", margin: 0 }}>
                        {detail.contact?.full_name || "Anonymous"}
                      </h2>
                      <ScorePill score={detail.lead_score} />
                      {detail.channel && (
                        <span style={{ fontSize: 12, color: "#9CA3AF", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 8px" }}>
                          {CHANNEL_ICONS[detail.channel] || "🌐"} {detail.channel}
                        </span>
                      )}
                    </div>
                    {detail.contact?.company && (
                      <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 6 }}>{detail.contact.company}</div>
                    )}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {detail.contact?.email && (
                        <span style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={12} />{detail.contact.email}
                        </span>
                      )}
                      {detail.contact?.phone && (
                        <span style={{ fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone size={12} />{detail.contact.phone}
                        </span>
                      )}
                    </div>
                    {detail.contact?.tags && detail.contact.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                        {detail.contact.tags.map(tag => (
                          <span key={tag} style={{ background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.2)", color: "#4F8EF7", borderRadius: 6, padding: "2px 7px", fontSize: 11 }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual pipeline stepper */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {STATUS_PIPELINE.map((step, i) => {
                    const currentIdx = STATUS_PIPELINE.indexOf(detail.status);
                    const isLost = detail.status === "lost" && step === "lost";
                    const isPast = i < currentIdx && detail.status !== "lost";
                    const isCurrent = i === currentIdx;
                    const dotBg = isLost ? "rgba(239,68,68,0.15)" : isCurrent ? "#4F8EF7" : isPast ? "#10B981" : "#111827";
                    const dotBorder = isLost ? "#EF4444" : isCurrent ? "#4F8EF7" : isPast ? "#10B981" : "#2D333B";
                    const textColor = isLost ? "#EF4444" : isCurrent ? "#4F8EF7" : isPast ? "#10B981" : "#6B7280";
                    const lineBg = isPast && detail.status !== "lost" ? "#10B981" : "#2D333B";

                    return (
                      <div key={step} style={{ display: "flex", alignItems: "center", flex: step !== "lost" ? 1 : "none" }}>
                        <button
                          onClick={() => updateStatus.mutate({ id: detail.id, status: step }, {
                            onSuccess: () => { toast({ description: `Status → ${step}` }); void refetch(); },
                          })}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: dotBg, border: `2px solid ${dotBorder}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                            {(isPast || (isCurrent && !isLost)) && (
                              <CheckCircle2 size={13} color={isCurrent ? "#fff" : "#10B981"} />
                            )}
                            {isLost && <X size={12} color="#EF4444" />}
                          </div>
                          <span style={{ fontSize: 10, color: textColor, fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                            {step}
                          </span>
                        </button>
                        {step !== "lost" && (
                          <div style={{ flex: 1, height: 2, background: lineBg, transition: "background 0.2s", margin: "0 2px", marginBottom: 16 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two-column body */}
              <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

                {/* LEFT: Transcript */}
                <div style={{ flex: "1 1 60%", overflow: "auto", padding: 20, borderRight: "1px solid #2D333B" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
                    Conversation Transcript
                  </h3>
                  {detail.messages.length === 0 ? (
                    <div style={{ color: "#6B7280", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
                      No messages in this conversation.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {detail.messages.map(msg => {
                        if (msg.role === "user") {
                          return (
                            <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                              <div style={{ maxWidth: "80%" }}>
                                <div style={{ background: "#4F8EF7", color: "#fff", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", fontSize: 13, lineHeight: 1.55 }}>
                                  {msg.content}
                                </div>
                                <div className="font-mono" style={{ fontSize: 10, color: "#6B7280", textAlign: "right", marginTop: 4 }}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (msg.role === "assistant") {
                          return (
                            <div key={msg.id} style={{ display: "flex", justifyContent: "flex-start" }}>
                              <div style={{ maxWidth: "80%" }}>
                                <div style={{ background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", fontSize: 13, lineHeight: 1.55 }}>
                                  {msg.content}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                    {msg.sources.map(src => (
                                      <span key={src} style={{ background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.2)", color: "#4F8EF7", borderRadius: 6, padding: "2px 7px", fontSize: 11 }}>
                                        📄 {src}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="font-mono" style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={msg.id} style={{ textAlign: "center", fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>
                            {msg.content}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT: Contact + Timeline + Notes */}
                <div style={{ flex: "0 0 40%", overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* Contact info card */}
                  <div style={{ background: "#111827", border: "1px solid #2D333B", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                      Contact Info
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {detail.contact?.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <Mail size={13} style={{ color: "#6B7280", flexShrink: 0 }} />
                          <span style={{ color: "#9CA3AF" }}>{detail.contact.email}</span>
                        </div>
                      )}
                      {detail.contact?.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <Phone size={13} style={{ color: "#6B7280", flexShrink: 0 }} />
                          <span style={{ color: "#9CA3AF" }}>{detail.contact.phone}</span>
                        </div>
                      )}
                      {detail.contact?.company && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <Building2 size={13} style={{ color: "#6B7280", flexShrink: 0 }} />
                          <span style={{ color: "#9CA3AF" }}>{detail.contact.company}</span>
                        </div>
                      )}
                      {detail.contact?.channels_used && detail.contact.channels_used.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <Globe size={13} style={{ color: "#6B7280", flexShrink: 0 }} />
                          <span style={{ color: "#9CA3AF" }}>{detail.contact.channels_used.join(", ")}</span>
                        </div>
                      )}
                      {detail.source_page_url && (
                        <div style={{ fontSize: 11, color: "#6B7280", paddingTop: 4 }}>
                          Source: <span style={{ color: "#4F8EF7" }}>{detail.source_page_url}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                      Timeline
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {detail.timeline.map((event, i) => (
                        <div key={i} style={{ display: "flex", gap: 12 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4F8EF7", border: "2px solid #111827", flexShrink: 0, marginTop: 2 }} />
                            {i < detail.timeline.length - 1 && (
                              <div style={{ width: 2, flex: 1, background: "#2D333B", minHeight: 20, marginTop: 2 }} />
                            )}
                          </div>
                          <div style={{ paddingBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#F9FAFB" }}>{event.event}</div>
                            {event.detail && <div style={{ fontSize: 11, color: "#9CA3AF" }}>{event.detail}</div>}
                            <div className="font-mono" style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                              {relativeTime(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Internal notes */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                      Internal Notes
                    </div>
                    {detail.notes.map((note, i) => (
                      <div key={i} style={{ background: "#111827", border: "1px solid #2D333B", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#F9FAFB", lineHeight: 1.5 }}>{note.note}</div>
                        <div className="font-mono" style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                          {relativeTime(note.created_at)}
                        </div>
                      </div>
                    ))}
                    <Textarea
                      placeholder="Add an internal note..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={3}
                      style={{ background: "#111827", border: "1px solid #2D333B", color: "#F9FAFB", fontSize: 13, resize: "none" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <Button
                        size="sm"
                        disabled={!noteText.trim() || addNote.isPending}
                        onClick={() => addNote.mutate({ id: detail.id, note: noteText.trim() }, {
                          onSuccess: () => { setNoteText(""); toast({ description: "Note added" }); },
                          onError: () => toast({ variant: "destructive", description: "Failed to add note" }),
                        })}
                        style={{ background: "#4F8EF7", color: "#fff", border: "none", flex: 1 }}
                      >
                        <Send size={13} style={{ marginRight: 6 }} /> Add Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={recalcScore.isPending}
                        onClick={() => recalcScore.mutate(detail.id, {
                          onSuccess: data => toast({ description: `Score recalculated: ${data.lead_score || "unchanged"}` }),
                          onError: () => toast({ variant: "destructive", description: "Score recalculation failed" }),
                        })}
                        style={{ border: "1px solid #2D333B", background: "transparent", color: "#9CA3AF" }}
                      >
                        <Star size={13} style={{ marginRight: 4 }} /> Recalc Score
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions footer */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid #2D333B", display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                <Button
                  onClick={() => updateStatus.mutate({ id: detail.id, status: "converted" }, {
                    onSuccess: () => { toast({ description: "Lead marked as Converted" }); void refetch(); setActiveLead(null); },
                  })}
                  style={{ background: "#10B981", color: "#fff", border: "none" }}
                >
                  <CheckCircle2 size={14} style={{ marginRight: 6 }} /> Mark as Converted
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: detail.id, status: "lost" }, {
                    onSuccess: () => { toast({ description: "Lead marked as Lost" }); void refetch(); setActiveLead(null); },
                  })}
                  style={{ border: "1px solid #EF4444", color: "#EF4444", background: "transparent" }}
                >
                  Mark as Lost
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 7.5.7 Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1C1F26", border: "1px solid #2D333B", borderRadius: 14,
          padding: "12px 20px", display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 100, flexWrap: "wrap",
          maxWidth: "90vw",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", marginRight: 4 }}>
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => handleBulkStatus("qualified")}
            style={{ background: "rgba(79,142,247,0.15)", color: "#4F8EF7", border: "1px solid rgba(79,142,247,0.3)" }}
          >
            Mark Qualified
          </Button>
          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => handleBulkStatus("converted")}
            style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            Mark Converted
          </Button>
          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => void handleBulkExport()}
            style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF", border: "1px solid #2D333B" }}
          >
            <Download size={13} style={{ marginRight: 5 }} /> Export CSV
          </Button>
          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => setConfirmDelete(true)}
            style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <Trash2 size={13} style={{ marginRight: 5 }} /> Delete
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", display: "flex", alignItems: "center", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent style={{ background: "#1C1F26", border: "1px solid #2D333B", maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#F9FAFB" }}>Delete Leads</DialogTitle>
          </DialogHeader>
          <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""}?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              style={{ border: "1px solid #2D333B", background: "transparent", color: "#9CA3AF" }}
            >
              Cancel
            </Button>
            <Button
              disabled={bulkAction.isPending}
              onClick={handleBulkDelete}
              style={{ background: "#EF4444", color: "#fff", border: "none" }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
