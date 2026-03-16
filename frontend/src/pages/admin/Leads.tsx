import { useState, useCallback, useMemo, useEffect, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Users, Search, X, Download, Trash2,
  Phone, Mail, Clock, ChevronLeft, ChevronRight,
  MoreHorizontal, Star, Calendar,
  CheckCircle2, RefreshCw, Plus,
  MessageSquare, Send, FileText, Building2, Layers,
  Globe, ArrowUpRight, AlertCircle, Eye,
  GripVertical, Sparkles, ExternalLink, SlidersHorizontal,
  ChevronDown, Filter,
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
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useLeadsList, useLeadDetail, useUpdateLeadStatus, useUpdateLead,
  useAddLeadNote, useDeleteLeadNote, useRecalculateLeadScore, useBulkLeadAction,
  useLeadStats, useLeadPipeline, useCreateLead,
  useLeadTags, useLeadAssignees,
  useGenerateFollowupDraft, useSendFollowup,
} from "@/hooks/useLeads";
import {
  type LeadListItem, type LeadDetailResponse, type LeadListFilters,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_PIPELINE = ["new", "contacted", "qualified", "converted", "lost"] as const;

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  new:       { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   label: "New" },
  contacted: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Contacted" },
  qualified: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",       label: "Qualified" },
  converted: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Converted" },
  lost:      { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",       label: "Lost" },
};

const SCORE_META: Record<string, { badge: string; label: string }> = {
  high:   { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "High" },
  medium: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",      label: "Medium" },
  low:    { badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",          label: "Low" },
};

const STAT_CARD_KEYS = ["total", "new", "contacted", "qualified", "converted", "this_month"] as const;
const STAT_CARDS: { key: typeof STAT_CARD_KEYS[number]; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "total",      label: "Total Leads",  icon: <Users size={18} />,          accent: "from-blue-500/20 to-blue-500/0" },
  { key: "new",        label: "New",           icon: <AlertCircle size={18} />,    accent: "from-amber-500/20 to-amber-500/0" },
  { key: "contacted",  label: "Contacted",     icon: <MessageSquare size={18} />,  accent: "from-violet-500/20 to-violet-500/0" },
  { key: "qualified",  label: "Qualified",     icon: <CheckCircle2 size={18} />,   accent: "from-blue-500/20 to-blue-500/0" },
  { key: "converted",  label: "Converted",     icon: <ArrowUpRight size={18} />,   accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "this_month", label: "This Month",    icon: <Calendar size={18} />,       accent: "from-pink-500/20 to-pink-500/0" },
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function LeadAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
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
  const meta = STATUS_META[status] ?? STATUS_META.new;
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

function ScoreBadge({ score }: { score: string | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">--</span>;
  const meta = SCORE_META[score] ?? SCORE_META.low;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5",
      "text-[11px] font-semibold font-mono tracking-wide",
      meta.badge,
    )}>
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

/* ═══════════════════════════════════════════════════════════════════════════════
   KANBAN COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function ColumnDropTarget({ columnId }: { columnId: string }) {
  const { setNodeRef } = useSortable({ id: `__col__${columnId}`, data: { status: columnId } });
  return <div ref={setNodeRef} className="h-2 w-full" />;
}

function KanbanCard({ lead, onOpen }: { lead: LeadListItem; onOpen: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { status: lead.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "group rounded-xl border bg-card p-3.5 transition-all",
        "hover:border-primary/30 hover:shadow-soft-md",
        isDragging ? "cursor-grabbing shadow-strong border-primary/40 scale-[1.02]" : "cursor-grab",
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle + name */}
      <div className="flex items-start gap-2.5 mb-3">
        <GripVertical size={14} className="text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <LeadAvatar name={lead.contact_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-[13px] text-foreground truncate leading-tight">
            {lead.contact_name || "Anonymous"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {lead.contact_email || lead.contact_phone || "No contact info"}
          </p>
        </div>
      </div>

      {/* First message preview */}
      {lead.first_message && (
        <p className="text-[11px] text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed pl-[38px]">
          {lead.first_message}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap pl-[38px]">
        <ChannelPill channel={lead.channel} />
        <ScoreBadge score={lead.lead_score} />
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {relativeTime(lead.created_at)}
        </span>
      </div>

      {/* View button */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); navigate(`/leads/${lead.id}`); }}
        className={cn(
          "mt-3 w-full rounded-lg py-1.5 text-[11px] font-semibold font-heading",
          "bg-primary/8 border border-primary/15 text-primary",
          "hover:bg-primary/15 hover:border-primary/25 transition-colors",
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
        )}
      >
        View Detail
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PIPELINE STEPPER
   ═══════════════════════════════════════════════════════════════════════════════ */

function PipelineStepper({
  currentStatus,
  onChangeStatus,
}: {
  currentStatus: string;
  onChangeStatus: (status: string) => void;
}) {
  const currentIdx = STATUS_PIPELINE.indexOf(currentStatus as typeof STATUS_PIPELINE[number]);

  return (
    <div className="flex items-center w-full">
      {STATUS_PIPELINE.map((step, i) => {
        const isLost = currentStatus === "lost" && step === "lost";
        const isPast = i < currentIdx && currentStatus !== "lost";
        const isCurrent = i === currentIdx;
        const isLast = i === STATUS_PIPELINE.length - 1;

        return (
          <Fragment key={step}>
            <button
              onClick={() => onChangeStatus(step)}
              className="flex flex-col items-center gap-1.5 group shrink-0"
            >
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-[11px] transition-all border-2",
                isLost && "border-red-500/50 bg-red-500/10",
                isCurrent && !isLost && "border-primary bg-primary text-white scale-110",
                isPast && "border-emerald-500 bg-emerald-500/15",
                !isCurrent && !isPast && !isLost && "border-border bg-card",
              )}>
                {(isPast || (isCurrent && !isLost)) && <CheckCircle2 size={13} className={isCurrent ? "text-white" : "text-emerald-500"} />}
                {isLost && <X size={11} className="text-red-500" />}
              </div>
              <span className={cn(
                "text-[9px] sm:text-[10px] font-semibold font-heading capitalize whitespace-nowrap transition-colors",
                isLost && "text-red-400",
                isCurrent && !isLost && "text-primary",
                isPast && "text-emerald-400",
                !isCurrent && !isPast && !isLost && "text-muted-foreground",
                "group-hover:text-foreground",
              )}>
                {step}
              </span>
            </button>
            {!isLast && (
              <div className={cn(
                "flex-1 h-[2px] mx-1 rounded-full transition-colors min-w-[12px]",
                isPast && currentStatus !== "lost" ? "bg-emerald-500/40" : "bg-border",
              )} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Leads() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();

  const [view, setView] = useState<"table" | "kanban">("table");
  const [filters, setFilters] = useState<LeadListFilters>({ page: 1, per_page: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeLead, setActiveLead] = useState<string | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);
  const [convertEstValue, setConvertEstValue] = useState("");
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupChannel, setFollowupChannel] = useState("email");
  const [followupSubject, setFollowupSubject] = useState("");
  const [followupMessage, setFollowupMessage] = useState("");
  const [followupIsAi, setFollowupIsAi] = useState(false);
  const [followupScheduledAt, setFollowupScheduledAt] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kanbanMobileOpen, setKanbanMobileOpen] = useState<string | null>("new");

  const { data: listData, isLoading, refetch } = useLeadsList(filters);
  const { data: statsData } = useLeadStats();
  const { data: tagOptions } = useLeadTags();
  const { data: assignees } = useLeadAssignees();
  const PIPELINE_MAX_PER_COLUMN = 25;
  const { data: pipelineData } = useLeadPipeline({
    status: filters.status,
    channel: filters.channel,
    search: filters.search,
    max_per_column: PIPELINE_MAX_PER_COLUMN,
  });
  const createLead = useCreateLead();
  const { data: detailData, isLoading: detailLoading } = useLeadDetail(activeLead);
  const updateStatus = useUpdateLeadStatus();
  const updateLead = useUpdateLead();
  const addNote = useAddLeadNote();
  const deleteNote = useDeleteLeadNote();
  const recalcScore = useRecalculateLeadScore();
  const generateFollowup = useGenerateFollowupDraft();
  const sendFollowup = useSendFollowup();
  const bulkAction = useBulkLeadAction();
  const { toast } = useToast();

  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadStatus, setNewLeadStatus] = useState("new");
  const [newLeadScore, setNewLeadScore] = useState<number | undefined>(undefined);
  const [newLeadEstValue, setNewLeadEstValue] = useState<string>("");
  const [newLeadChannel, setNewLeadChannel] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("");
  const [newLeadTags, setNewLeadTags] = useState("");
  const [newLeadInterest, setNewLeadInterest] = useState("");

  // Sync active lead from URL param
  useEffect(() => {
    if (params.id) {
      setActiveLead(params.id);
    }
  }, [params.id]);

  const leads = listData?.leads ?? [];
  const stats = statsData?.stats ?? listData?.stats ?? { total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, this_month: 0 };
  const totalPages = Math.ceil((listData?.total ?? 0) / (filters.per_page ?? 20)) || 1;
  const detail = detailData ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  /* ── Filter helpers ──────────────────────────────────────────────────────── */

  const updateFilter = useCallback((key: keyof LeadListFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 20 });
  }, []);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "page" && k !== "per_page" && v !== undefined && v !== ""
  ).length;

  /* ── Selection helpers ───────────────────────────────────────────────────── */

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

  /* ── DnD ─────────────────────────────────────────────────────────────────── */

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

    // If moving to converted, show a confirmation dialog to capture revenue
    if (targetStatus === "converted") {
      setConvertLeadId(draggedId);
      setConvertEstValue(activeLd.est_value ? String(activeLd.est_value) : "");
      setConvertModalOpen(true);
      return;
    }

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

  /* ── Bulk actions ────────────────────────────────────────────────────────── */

  const handleBulkExport = useCallback(async (format?: string) => {
    try {
      const result = await bulkAction.mutateAsync({ action: "export", lead_ids: Array.from(selectedIds), format });
      if (result.export_data && result.export_data.length > 0) {
        const headers = Object.keys(result.export_data[0]).join(",");
        const rows = result.export_data.map(row =>
          Object.values(row).map(v => String(v ?? "")).join(",")
        ).join("\n");
        const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads-export${format ? `-${format}` : ""}.csv`;
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

  const handleCreateLead = useCallback(async () => {
    try {
      const scoreVal = newLeadScore != null ? Number(newLeadScore) : undefined;
      const estValue = newLeadEstValue ? Number(newLeadEstValue) : undefined;
      await createLead.mutateAsync({
        name: newLeadName || undefined,
        email: newLeadEmail || undefined,
        phone: newLeadPhone || undefined,
        status: newLeadStatus,
        score: scoreVal,
        est_value: estValue,
        channel: newLeadChannel || undefined,
        source: newLeadSource || undefined,
        tags: newLeadTags ? newLeadTags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        interest: newLeadInterest || undefined,
      });
      toast({ description: "Lead created" });
      setAddLeadOpen(false);
      setNewLeadName("");
      setNewLeadEmail("");
      setNewLeadPhone("");
      setNewLeadStatus("new");
      setNewLeadScore(undefined);
      setNewLeadEstValue("");
      setNewLeadChannel("");
      setNewLeadSource("");
      setNewLeadTags("");
      setNewLeadInterest("");
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to create lead" });
    }
  }, [
    createLead,
    newLeadName,
    newLeadEmail,
    newLeadPhone,
    newLeadStatus,
    newLeadScore,
    newLeadEstValue,
    newLeadChannel,
    newLeadSource,
    newLeadTags,
    newLeadInterest,
    toast,
    refetch,
  ]);

  const handleConfirmConvert = useCallback(() => {
    if (!convertLeadId) return;

    updateStatus.mutate({ id: convertLeadId, status: "converted" }, {
      onSuccess: () => {
        if (convertEstValue) {
          updateLead.mutate({ id: convertLeadId, updates: { est_value: Number(convertEstValue) } });
        }
        toast({ description: "Lead converted" });
        setConvertModalOpen(false);
        setConvertLeadId(null);
        setConvertEstValue("");
        void refetch();
      },
      onError: () => {
        toast({ variant: "destructive", description: "Failed to convert lead" });
      },
    });
  }, [convertLeadId, convertEstValue, updateLead, updateStatus, toast, refetch]);

  const handleCancelConvert = useCallback(() => {
    setConvertModalOpen(false);
    setConvertLeadId(null);
    setConvertEstValue("");
  }, []);

  const openFollowupDrawer = useCallback(() => {
    setFollowupChannel("email");
    setFollowupSubject("");
    setFollowupMessage("");
    setFollowupIsAi(false);
    setFollowupScheduledAt(null);
    setFollowupOpen(true);
  }, []);

  const handleGenerateFollowupDraft = useCallback(async () => {
    if (!detail?.id) return;
    try {
      const response = await generateFollowup.mutateAsync({ lead_id: detail.id, channel: followupChannel });
      setFollowupSubject(response.draft.subject || "");
      setFollowupMessage(response.draft.body || "");
      setFollowupIsAi(true);
      toast({ description: "AI follow-up draft generated" });
    } catch {
      toast({ variant: "destructive", description: "Failed to generate draft" });
    }
  }, [detail?.id, followupChannel, generateFollowup, toast]);

  const handleSendFollowup = useCallback(async () => {
    if (!detail?.id) return;
    try {
      await sendFollowup.mutateAsync({
        lead_id: detail.id,
        channel: followupChannel,
        subject: followupSubject,
        content: followupMessage,
        is_ai_assisted: followupIsAi,
        scheduled_at: followupScheduledAt || undefined,
      });
      toast({ description: "Follow-up recorded" });
      setFollowupOpen(false);
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to send follow-up" });
    }
  }, [detail?.id, followupChannel, followupSubject, followupMessage, followupIsAi, followupScheduledAt, sendFollowup, toast, refetch]);

  /* ── Kanban columns ──────────────────────────────────────────────────────── */

  const kanbanColumns = useMemo(() => {
    const pipeline = pipelineData?.pipeline;
    if (pipeline) {
      return STATUS_PIPELINE.map(status => ({
        status,
        leads: pipeline[status]?.leads ?? [],
      }));
    }
    return STATUS_PIPELINE.map(status => ({
      status,
      leads: leads.filter(l => l.status === status),
    }));
  }, [leads, pipelineData]);

  /* ── Pagination ──────────────────────────────────────────────────────────── */

  const currentPage = filters.page || 1;
  const perPage = filters.per_page || 20;
  const totalCount = listData?.total ?? 0;
  const fromIdx = (currentPage - 1) * perPage + 1;
  const toIdx = Math.min(currentPage * perPage, totalCount);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Pipeline management and lead tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border bg-card overflow-hidden">
            {(["table", "kanban"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold font-heading transition-all",
                  view === v
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {v === "table" ? <FileText size={13} /> : <Layers size={13} />}
                <span className="hidden sm:inline">{v === "table" ? "Table" : "Board"}</span>
              </button>
            ))}
          </div>

          <Button
            variant="secondary" size="sm"
            onClick={() => setAddLeadOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>

          <Button
            variant="outline" size="sm"
            onClick={() => void refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ─── Stats Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
              {card.key === "converted" && stats["converted_value"] != null && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {`KSh ${Number(stats["converted_value"]).toLocaleString()}`} 
                </p>
              )}
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
              placeholder="Search leads..."
              value={filters.search || ""}
              onChange={e => updateFilter("search", e.target.value || undefined)}
              className="pl-9 h-9 text-sm bg-card"
            />
          </div>

          {/* Quick status filter */}
          <Select value={filters.status || "_all"} onValueChange={v => updateFilter("status", v === "_all" ? undefined : v)}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-card">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Status</SelectItem>
              {STATUS_PIPELINE.map(s => (
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
          <Select value={filters.channel || "_all"} onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}>
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
            <Select value={filters.channel || "_all"} onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-card sm:hidden">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Channels</SelectItem>
                {Object.entries(CHANNEL_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.icon} {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground shrink-0">From</label>
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={e => updateFilter("date_from", e.target.value || undefined)}
                className="h-9 px-2.5 text-xs rounded-md border bg-card text-foreground"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-muted-foreground shrink-0">To</label>
              <input
                type="date"
                value={filters.date_to || ""}
                onChange={e => updateFilter("date_to", e.target.value || undefined)}
                className="h-9 px-2.5 text-xs rounded-md border bg-card text-foreground"
              />
            </div>

            <Input
              placeholder="Source page (e.g. /pricing)"
              value={filters.source_page || ""}
              onChange={e => updateFilter("source_page", e.target.value || undefined)}
              className="h-9 w-[200px] text-xs bg-card"
            />

            <Select value={filters.tags || "_all"} onValueChange={v => updateFilter("tags", v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[180px] h-9 text-xs bg-card">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Tags</SelectItem>
                {(tagOptions || []).map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.assigned_to || "_all"} onValueChange={v => updateFilter("assigned_to", v === "_all" ? undefined : v)}>
              <SelectTrigger className="w-[180px] h-9 text-xs bg-card">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Anyone</SelectItem>
                {(assignees || []).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name || a.email || a.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         TABLE VIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      {view === "table" ? (
        <div className="rounded-xl border bg-card overflow-hidden">

          {/* ── DESKTOP / TABLET TABLE (sm+) ─────────────────────────────────
               Progressive column disclosure: lower-priority columns hide at
               smaller breakpoints so the table NEVER needs horizontal scroll.
               Priority: Lead > Status > Score > Date > Contact > Channel > Msg > Actions
               ────────────────────────────────────────────────────────────────── */}
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 p-3 pl-4">
                  <Checkbox
                    checked={selectedIds.size === leads.length && leads.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Lead</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">Contact</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">Channel</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden 2xl:table-cell">First Message</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">Score</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date</th>
                <th className="w-10 p-3 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3 pl-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="p-3"><Skeleton className="h-9 w-full" /></td>
                    <td className="p-3 hidden lg:table-cell"><Skeleton className="h-4 w-full" /></td>
                    <td className="p-3 hidden xl:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3 hidden 2xl:table-cell"><Skeleton className="h-4 w-full" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-5 w-14" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-3 pr-4"><Skeleton className="h-4 w-4" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Users size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">No leads found</p>
                      {activeFilterCount > 0 && (
                        <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : leads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className={cn(
                    "cursor-pointer transition-colors group",
                    selectedIds.has(lead.id)
                      ? "bg-primary/5 hover:bg-primary/8"
                      : "hover:bg-muted/50",
                  )}
                >
                  {/* Checkbox */}
                  <td className="p-3 pl-4" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </td>

                  {/* Lead — always visible, combines name + company. On sm/md also
                      shows inline contact & channel since those columns are hidden */}
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <LeadAvatar name={lead.contact_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                          {lead.contact_name || "Anonymous"}
                        </p>

                        {/* Company (always shown inline under name) */}
                        {lead.contact_company && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Building2 size={10} className="shrink-0" />
                            {lead.contact_company}
                          </p>
                        )}

                        {/* Contact info — inline when the Contact column is hidden (<lg) */}
                        <div className="lg:hidden mt-1 space-y-0.5">
                          {lead.contact_email && (
                            <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1">
                              <Mail size={9} className="shrink-0" />
                              {lead.contact_email}
                            </p>
                          )}
                        </div>

                        {/* Channel — inline when the Channel column is hidden (<xl) */}
                        <div className="xl:hidden mt-1">
                          <ChannelPill channel={lead.channel} />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact — visible on lg+ */}
                  <td className="p-3 hidden lg:table-cell">
                    <div className="space-y-0.5">
                      {lead.contact_email ? (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                          <Mail size={10} className="shrink-0 text-muted-foreground/60" />
                          {lead.contact_email}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/50">--</p>
                      )}
                      {lead.contact_phone && (
                        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                          <Phone size={9} className="shrink-0" />
                          {lead.contact_phone}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Channel — visible on xl+ */}
                  <td className="p-3 hidden xl:table-cell whitespace-nowrap">
                    <ChannelPill channel={lead.channel} />
                  </td>

                  {/* First message — visible on 2xl+ */}
                  <td className="p-3 hidden 2xl:table-cell max-w-[220px]">
                    <p className="text-[12px] text-muted-foreground truncate">
                      {lead.first_message || "--"}
                    </p>
                  </td>

                  {/* Status — always visible */}
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="focus:outline-none">
                          <StatusBadge status={lead.status} interactive />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[140px]">
                        {STATUS_PIPELINE.map(s => (
                          <DropdownMenuItem
                            key={s}
                            className="capitalize text-xs gap-2"
                            onClick={() => updateStatus.mutate({ id: lead.id, status: s }, {
                              onSuccess: () => { toast({ description: `Status updated to ${s}` }); void refetch(); },
                            })}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {/* Score — visible on md+ */}
                  <td className="p-3 hidden md:table-cell">
                    <ScoreBadge score={lead.lead_score} />
                  </td>

                  {/* Date — always visible */}
                  <td className="p-3 whitespace-nowrap">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {relativeTime(lead.created_at)}
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
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => navigate(`/leads/${lead.id}`)}>
                          <Eye size={13} /> View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => updateStatus.mutate({ id: lead.id, status: "qualified" }, {
                          onSuccess: () => { toast({ description: "Marked as Qualified" }); void refetch(); },
                        })}>
                          <CheckCircle2 size={13} /> Mark Qualified
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => updateStatus.mutate({ id: lead.id, status: "converted" }, {
                          onSuccess: () => { toast({ description: "Marked as Converted" }); void refetch(); },
                        })}>
                          <ArrowUpRight size={13} /> Mark Converted
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                          onClick={() => { setSelectedIds(new Set([lead.id])); setConfirmDelete(true); }}
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

          {/* ── MOBILE CARD LIST (<sm) ─────────────────────────────────────── */}
          <div className="sm:hidden divide-y">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : leads.length === 0 ? (
              <div className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Users size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No leads found</p>
                  {activeFilterCount > 0 && (
                    <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            ) : leads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setActiveLead(lead.id)}
                className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </div>
                  <LeadAvatar name={lead.contact_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                        {lead.contact_name || "Anonymous"}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {relativeTime(lead.created_at)}
                      </span>
                    </div>
                    {lead.contact_company && (
                      <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Building2 size={10} /> {lead.contact_company}
                      </p>
                    )}
                    {lead.first_message && (
                      <p className="text-[12px] text-muted-foreground/80 line-clamp-2 mb-2 leading-relaxed">
                        {lead.first_message}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={lead.status} />
                      <ScoreBadge score={lead.lead_score} />
                      <ChannelPill channel={lead.channel} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {!isLoading && leads.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-[11px] text-muted-foreground font-mono hidden sm:block">
                {fromIdx}--{toIdx} of {totalCount}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono sm:hidden">
                {currentPage}/{totalPages || 1}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setFilters(p => ({ ...p, page: (p.page || 1) - 1 }))}
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
                  onClick={() => setFilters(p => ({ ...p, page: (p.page || 1) + 1 }))}
                  disabled={currentPage >= totalPages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
           KANBAN VIEW
           ─────────────────────────────────────────────────────────────────────
           Mobile (<sm): stacked accordion — each status is a collapsible section
           Tablet (sm–lg): 2×3 or 3×2 fluid grid — no horizontal scroll
           Desktop (lg+): 5-column fluid row — columns stretch to fill
           ═══════════════════════════════════════════════════════════════════════ */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>

          {pipelineData?.pipeline && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 p-3 rounded-xl border bg-card/40">
              <span className="text-[11px] text-muted-foreground">
                Pipeline Value: <span className="font-medium text-foreground">KSh {Object.values(pipelineData.pipeline).reduce((sum, col) => sum + (col.total_value ?? 0), 0).toLocaleString()}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Converted: <span className="font-medium text-foreground">KSh {(pipelineData.pipeline.converted?.total_value ?? 0).toLocaleString()}</span>
              </span>
              {pipelineData.max_per_column && Object.values(pipelineData.pipeline).some(p => p.limit_exceeded) && (
                <span className="text-[11px] text-amber-600 font-medium">
                  Showing first {pipelineData.max_per_column} leads per column. Some columns have more leads than shown.
                </span>
              )}
            </div>
          )}

          {/* ── MOBILE: Stacked collapsible sections ──────────────────────── */}
          <div className="flex flex-col gap-2 sm:hidden">
            {kanbanColumns.map(col => {
              const meta = STATUS_META[col.status] ?? STATUS_META.new;
              const isExpanded = kanbanMobileOpen === col.status;
              return (
                <div key={col.status} className="rounded-xl border bg-card/60 overflow-hidden">
                  {/* Tap to expand / collapse */}
                  <button
                    onClick={() => setKanbanMobileOpen(isExpanded ? null : col.status)}
                    className="flex items-center gap-2.5 p-3.5 w-full text-left border-b border-transparent hover:bg-muted/30 transition-colors"
                  >
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    <span className="font-heading font-bold text-[13px] text-foreground capitalize flex-1">
                      {col.status}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {col.leads.length}
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <SortableContext
                      items={[...col.leads.map(l => l.id), `__col__${col.status}`]}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-2 p-2.5 border-t animate-fade-in">
                        {col.leads.length === 0 && (
                          <div className="py-5 text-center">
                            <p className="text-[11px] text-muted-foreground/50">No leads in this stage</p>
                          </div>
                        )}
                        {col.leads.map(lead => (
                          <KanbanCard key={lead.id} lead={lead} onOpen={setActiveLead} />
                        ))}
                        <ColumnDropTarget columnId={col.status} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => setAddLeadOpen(true)}
                        >
                          + Add lead
                        </Button>
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── TABLET / DESKTOP: Fluid grid — no horizontal scrollbar ───── */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {kanbanColumns.map(col => {
              const meta = STATUS_META[col.status] ?? STATUS_META.new;
              return (
                <div
                  key={col.status}
                  className="rounded-xl border bg-card/60 flex flex-col min-w-0"
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2.5 p-3.5 border-b shrink-0">
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    <span className="font-heading font-bold text-[13px] text-foreground capitalize truncate">
                      {col.status}
                    </span>
                    <span className="ml-auto text-[11px] font-mono font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                      {col.leads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <SortableContext
                    items={[...col.leads.map(l => l.id), `__col__${col.status}`]}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2 p-2 min-h-[60px] flex-1">
                      {col.leads.length === 0 && (
                        <div className="py-6 text-center">
                          <p className="text-[11px] text-muted-foreground/50">No leads</p>
                        </div>
                      )}
                      {col.leads.map(lead => (
                        <KanbanCard key={lead.id} lead={lead} onOpen={(id) => navigate(`/leads/${id}`)} />
                      ))}
                      <ColumnDropTarget columnId={col.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => setAddLeadOpen(true)}
                      >
                        + Add lead
                      </Button>
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         LEAD DETAIL MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!activeLead} onOpenChange={open => { if (!open) { setActiveLead(null); navigate("/leads"); } }}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden flex flex-col gap-0",
            "max-w-[860px] w-[95vw] max-h-[92vh] sm:max-h-[88vh]",
            "bg-card border rounded-2xl",
          )}
        >
          {detailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !detail ? (
            <div className="p-6 text-center">
              <Users size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Lead not found</p>
            </div>
          ) : (
            <>
              {/* ── Contact Header ── */}
              <div className="shrink-0 p-5 sm:p-6 border-b space-y-5">
                <div className="flex items-start gap-3.5">
                  <LeadAvatar name={detail.contact?.full_name ?? null} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h2 className="font-heading text-base sm:text-lg font-bold text-foreground leading-none">
                        {detail.contact?.full_name || "Anonymous"}
                      </h2>
                      <ScoreBadge score={detail.lead_score} />
                      <ChannelPill channel={detail.channel} />
                    </div>

                    {detail.contact?.company && (
                      <p className="text-[13px] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Building2 size={12} /> {detail.contact.company}
                      </p>
                    )}

                    <div className="flex gap-4 flex-wrap">
                      {detail.contact?.email && (
                        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                          <Mail size={12} className="text-muted-foreground/60" />{detail.contact.email}
                        </span>
                      )}
                      {detail.contact?.phone && (
                        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                          <Phone size={12} className="text-muted-foreground/60" />{detail.contact.phone}
                        </span>
                      )}
                    </div>

                    {detail.contact?.tags && detail.contact.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        {detail.contact.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pipeline stepper */}
                <div className="px-1 sm:px-4">
                  <PipelineStepper
                    currentStatus={detail.status}
                    onChangeStatus={(status) => updateStatus.mutate({ id: detail.id, status }, {
                      onSuccess: () => { toast({ description: `Status updated to ${status}` }); void refetch(); },
                    })}
                  />
                </div>
              </div>

              {/* ── Two-column Body ── */}
              <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
                {/* LEFT: Transcript */}
                <div className="flex-1 overflow-auto p-4 sm:p-5 sm:border-r order-2 sm:order-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-4">
                    Conversation Transcript
                  </h3>

                  {detail.messages.length === 0 ? (
                    <div className="py-8 text-center">
                      <MessageSquare size={20} className="text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No messages in this conversation</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {detail.messages.map(msg => {
                        if (msg.role === "user") {
                          return (
                            <div key={msg.id} className="flex justify-end">
                              <div className="max-w-[85%] sm:max-w-[78%]">
                                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-relaxed">
                                  {msg.content}
                                </div>
                                <p className="text-[10px] text-muted-foreground text-right mt-1 font-mono">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        if (msg.role === "assistant") {
                          return (
                            <div key={msg.id} className="flex justify-start">
                              <div className="max-w-[85%] sm:max-w-[78%]">
                                <div className="bg-muted border rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] text-foreground leading-relaxed">
                                  {msg.content}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                  <div className="flex gap-1 flex-wrap mt-1.5">
                                    {msg.sources.map(src => (
                                      <span
                                        key={src}
                                        className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/8 px-1.5 py-0.5 text-[10px] text-primary"
                                      >
                                        <FileText size={9} /> {src}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <p key={msg.id} className="text-center text-xs text-muted-foreground italic py-1">
                            {msg.content}
                          </p>
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
                      {detail.contact?.email && (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Mail size={13} className="text-muted-foreground/60 shrink-0" />
                          <span className="text-muted-foreground truncate">{detail.contact.email}</span>
                        </div>
                      )}
                      {detail.contact?.phone && (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Phone size={13} className="text-muted-foreground/60 shrink-0" />
                          <span className="text-muted-foreground">{detail.contact.phone}</span>
                        </div>
                      )}
                      {detail.contact?.company && (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Building2 size={13} className="text-muted-foreground/60 shrink-0" />
                          <span className="text-muted-foreground">{detail.contact.company}</span>
                        </div>
                      )}
                      {detail.contact?.channels_used && detail.contact.channels_used.length > 0 && (
                        <div className="flex items-center gap-2 text-[12px]">
                          <Globe size={13} className="text-muted-foreground/60 shrink-0" />
                          <span className="text-muted-foreground">{detail.contact.channels_used.join(", ")}</span>
                        </div>
                      )}
                      {detail.source_page_url && (
                        <div className="flex items-center gap-2 text-[11px] pt-1 border-t border-dashed">
                          <ExternalLink size={11} className="text-muted-foreground/50 shrink-0" />
                          <span className="text-muted-foreground/70">Source:</span>
                          <span className="text-primary font-medium">{detail.source_page_url}</span>
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
                            <div className="h-2 w-2 rounded-full bg-primary border-2 border-background shrink-0 mt-1" />
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

                  {/* Internal notes */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                      Internal Notes
                    </h4>
                    {detail.notes.map((note, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 p-3 mb-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[12px] text-foreground leading-relaxed">{note.note}</p>
                          <button
                            onClick={() => deleteNote.mutate({ id: detail.id, noteId: note.id }, {
                              onSuccess: () => toast({ description: "Note deleted" }),
                              onError: () => toast({ variant: "destructive", description: "Failed to delete note" }),
                            })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-1.5">{relativeTime(note.created_at)}</p>
                      </div>
                    ))}
                    <Textarea
                      placeholder="Add an internal note..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={3}
                      className="text-[13px] bg-card resize-none mt-1"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        disabled={!noteText.trim() || addNote.isPending}
                        onClick={() => addNote.mutate({ id: detail.id, note: noteText.trim() }, {
                          onSuccess: () => { setNoteText(""); toast({ description: "Note added" }); },
                          onError: () => toast({ variant: "destructive", description: "Failed to add note" }),
                        })}
                        className="flex-1 gap-1.5 text-xs h-8"
                      >
                        <Send size={12} /> Add Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={recalcScore.isPending}
                        onClick={() => recalcScore.mutate(detail.id, {
                          onSuccess: data => toast({ description: `Score: ${data.lead_score || "unchanged"}` }),
                          onError: () => toast({ variant: "destructive", description: "Score recalculation failed" }),
                        })}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Sparkles size={12} /> Recalc
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <div className="shrink-0 border-t p-4 sm:px-6 flex gap-2.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openFollowupDrawer}
                  className="gap-1.5 text-xs"
                >
                  <Send size={13} /> Send follow-up
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: detail.id, status: "converted" }, {
                    onSuccess: () => { toast({ description: "Lead marked as Converted" }); void refetch(); setActiveLead(null); navigate("/leads"); },
                  })}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <CheckCircle2 size={13} /> Mark Converted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: detail.id, status: "lost" }, {
                    onSuccess: () => { toast({ description: "Lead marked as Lost" }); void refetch(); setActiveLead(null); navigate("/leads"); },
                  })}
                  className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <X size={13} /> Mark Lost
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         Add Lead Drawer
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="max-w-lg w-[90vw]">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Full Name"
                value={newLeadName}
                onChange={e => setNewLeadName(e.target.value)}
                className="h-10"
              />
              <Input
                placeholder="Email"
                value={newLeadEmail}
                onChange={e => setNewLeadEmail(e.target.value)}
                className="h-10"
              />
              <Input
                placeholder="Phone"
                value={newLeadPhone}
                onChange={e => setNewLeadPhone(e.target.value)}
                className="h-10"
              />
              <Select value={newLeadStatus} onValueChange={setNewLeadStatus}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Estimated value (e.g. 5000)"
                value={newLeadEstValue}
                onChange={e => setNewLeadEstValue(e.target.value)}
                className="h-10"
                type="number"
              />
              <Input
                placeholder="Channel (whatsapp, email, web)"
                value={newLeadChannel}
                onChange={e => setNewLeadChannel(e.target.value)}
                className="h-10"
              />
            </div>

            <Input
              placeholder="Source (e.g. Website, Manual Entry)"
              value={newLeadSource}
              onChange={e => setNewLeadSource(e.target.value)}
              className="h-10"
            />

            <Input
              placeholder="Tags (comma separated)"
              value={newLeadTags}
              onChange={e => setNewLeadTags(e.target.value)}
              className="h-10"
            />

            <Textarea
              placeholder="Interest / what they asked about"
              value={newLeadInterest}
              onChange={e => setNewLeadInterest(e.target.value)}
              rows={3}
              className="text-sm"
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAddLeadOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateLead}
                disabled={createLead.isLoading}
              >
                Create Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={convertModalOpen} onOpenChange={open => { if (!open) handleCancelConvert(); }}>
        <DialogContent className="max-w-md p-5 bg-card border rounded-2xl">
          <DialogHeader>
            <DialogTitle>Convert Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the estimated value for this lead when converting. This helps track pipeline value.
            </p>
            <Input
              type="number"
              placeholder="Estimated value (e.g. 5000)"
              value={convertEstValue}
              onChange={e => setConvertEstValue(e.target.value)}
              className="h-10"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" size="sm" onClick={handleCancelConvert}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmConvert}>
              Convert Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followupOpen} onOpenChange={open => { if (!open) setFollowupOpen(false); }}>
        <DialogContent className="max-w-md p-5 bg-card border rounded-2xl">
          <DialogHeader>
            <DialogTitle>Send Follow-up</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={followupChannel} onValueChange={setFollowupChannel}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Subject"
                value={followupSubject}
                onChange={e => setFollowupSubject(e.target.value)}
                className="h-10"
              />
            </div>

            <Textarea
              placeholder="Message"
              value={followupMessage}
              onChange={e => setFollowupMessage(e.target.value)}
              rows={5}
              className="text-sm"
            />

            <div className="flex items-center gap-2">
              <Checkbox
                checked={followupIsAi}
                onCheckedChange={checked => setFollowupIsAi(Boolean(checked))}
              />
              <span className="text-xs text-muted-foreground">AI draft</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateFollowupDraft}
                disabled={!detail?.id}
              >
                Generate draft
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setFollowupOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendFollowup}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            onClick={() => handleBulkStatus("qualified")}
            className="gap-1.5 text-[11px] h-7 bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25"
          >
            Qualified
          </Button>

          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => handleBulkStatus("converted")}
            className="gap-1.5 text-[11px] h-7 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25"
          >
            Converted
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
            onClick={() => void handleBulkExport("hubspot")}
            variant="outline"
            className="gap-1.5 text-[11px] h-7"
          >
            HubSpot
          </Button>
          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => void handleBulkExport("salesforce")}
            variant="outline"
            className="gap-1.5 text-[11px] h-7"
          >
            Salesforce
          </Button>

          <Button
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => setConfirmDelete(true)}
            className="gap-1.5 text-[11px] h-7 bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25"
          >
            <Trash2 size={12} /> Delete
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
         DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Delete Leads</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""}?
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={bulkAction.isPending}
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
