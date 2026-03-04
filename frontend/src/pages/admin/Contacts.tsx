import { useState, useCallback, useMemo } from "react";
import {
  Users, Search, X, Plus, Mail, Phone, Building2,
  Tag, MoreHorizontal, Eye, Trash2, ChevronLeft, ChevronRight,
  Edit, Star, Calendar, MessageSquare, BookOpen,
  CheckCircle2, AlertCircle, ArrowUpRight, Hash,
  Instagram, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  useContactsList, useContactDetail,
  useCreateContact, useUpdateContact, useDeleteContact,
} from "@/hooks/useContacts";
import {
  type ContactItem, type ContactListFilters,
  type ContactCreateRequest, type ContactUpdateRequest,
  type ContactDetailResponse,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const MOCK_STATS = {
  total: 312,
  new: 48,
  contacted: 87,
  qualified: 64,
  converted: 113,
};

const MOCK_CONTACTS: ContactItem[] = [
  {
    id: "c1", tenant_id: "t1", full_name: "Sarah Johnson", email: "sarah@acme.com",
    phone: "+1 555 0101", instagram_handle: null, company: "Acme Corp",
    channels_used: ["web", "email"], first_seen_channel: "web",
    first_seen_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lead_status: "qualified", lead_score: "high",
    tags: ["enterprise", "pricing"], notes: "Very interested in Pro plan. Follow up by Friday.",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c2", tenant_id: "t1", full_name: "Marcus Williams", email: null,
    phone: "+1 555 0102", instagram_handle: "@marcus_w", company: null,
    channels_used: ["whatsapp", "instagram"], first_seen_channel: "whatsapp",
    first_seen_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    lead_status: "contacted", lead_score: "medium",
    tags: ["follow-up"], notes: null,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c3", tenant_id: "t1", full_name: "Emily Chen", email: "emily.chen@techcorp.io",
    phone: "+44 7700 900123", instagram_handle: null, company: "TechCorp",
    channels_used: ["web", "email", "whatsapp"], first_seen_channel: "web",
    first_seen_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lead_status: "converted", lead_score: "high",
    tags: ["enterprise", "demo-booked", "annual-plan"], notes: "Signed annual Enterprise plan. Very happy with onboarding.",
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c4", tenant_id: "t1", full_name: "David Okafor", email: "david@startup.io",
    phone: null, instagram_handle: null, company: "Startup.io",
    channels_used: ["facebook"], first_seen_channel: "facebook",
    first_seen_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lead_status: "new", lead_score: "medium",
    tags: ["integration"], notes: "Asked about Salesforce integration.",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c5", tenant_id: "t1", full_name: "Priya Patel", email: "priya@enterprise.com",
    phone: "+1 555 0106", instagram_handle: "@priya.patel", company: "Enterprise Ltd",
    channels_used: ["whatsapp", "web", "sms"], first_seen_channel: "whatsapp",
    first_seen_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lead_status: "qualified", lead_score: "high",
    tags: ["enterprise", "sla-required", "high-volume"],
    notes: "Looking for 10k conversations/month. Needs enterprise SLAs.",
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c6", tenant_id: "t1", full_name: "James Miller", email: "james@retail.com",
    phone: null, instagram_handle: null, company: null,
    channels_used: ["web"], first_seen_channel: "web",
    first_seen_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lead_status: "new", lead_score: "low",
    tags: null, notes: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c7", tenant_id: "t1", full_name: "Aisha Rahman", email: "aisha@designco.com",
    phone: "+971 50 123 4567", instagram_handle: "@aisha.design", company: "DesignCo",
    channels_used: ["instagram", "email"], first_seen_channel: "instagram",
    first_seen_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    lead_status: "contacted", lead_score: "medium",
    tags: ["creative", "small-team"],
    notes: "Small design agency, 8-person team. Interested in Pro plan.",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "c8", tenant_id: "t1", full_name: null, email: null,
    phone: "+1 555 0199", instagram_handle: null, company: null,
    channels_used: ["sms"], first_seen_channel: "sms",
    first_seen_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    lead_status: "new", lead_score: null,
    tags: null, notes: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_DETAIL: ContactDetailResponse = {
  contact: MOCK_CONTACTS[0],
  conversations_count: 9,
  bookings_count: 2,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted"] as const;

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  new:       { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",        label: "New" },
  contacted: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",     label: "Contacted" },
  qualified: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",           label: "Qualified" },
  converted: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",  label: "Converted" },
};

const SCORE_META: Record<string, { badge: string; label: string }> = {
  high:   { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "High" },
  medium: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",      label: "Medium" },
  low:    { badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",          label: "Low" },
};

const STAT_CARDS: { key: keyof typeof MOCK_STATS; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "total",     label: "Total Contacts", icon: <Users size={18} />,         accent: "from-blue-500/20 to-blue-500/0" },
  { key: "new",       label: "New",            icon: <AlertCircle size={18} />,   accent: "from-amber-500/20 to-amber-500/0" },
  { key: "contacted", label: "Contacted",      icon: <MessageSquare size={18} />, accent: "from-violet-500/20 to-violet-500/0" },
  { key: "qualified", label: "Qualified",      icon: <CheckCircle2 size={18} />,  accent: "from-blue-500/20 to-blue-500/0" },
  { key: "converted", label: "Converted",      icon: <ArrowUpRight size={18} />,  accent: "from-emerald-500/20 to-emerald-500/0" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return "--";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function contactDisplayName(contact: ContactItem): string {
  return contact.full_name || contact.email || contact.phone || "Unknown";
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function ContactAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">--</span>;
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold font-heading tracking-wide",
      meta.badge,
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

function ChannelPill({ channel }: { channel: string }) {
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
   FORM STATE
   ═══════════════════════════════════════════════════════════════════════════════ */

interface ContactFormState {
  full_name: string;
  email: string;
  phone: string;
  instagram_handle: string;
  company: string;
  lead_status: string;
  lead_score: string;
  tags: string;
  notes: string;
}

const EMPTY_FORM: ContactFormState = {
  full_name: "",
  email: "",
  phone: "",
  instagram_handle: "",
  company: "",
  lead_status: "new",
  lead_score: "",
  tags: "",
  notes: "",
};

function contactToForm(c: ContactItem): ContactFormState {
  return {
    full_name: c.full_name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    instagram_handle: c.instagram_handle ?? "",
    company: c.company ?? "",
    lead_status: c.lead_status ?? "new",
    lead_score: c.lead_score ?? "",
    tags: c.tags ? c.tags.join(", ") : "",
    notes: c.notes ?? "",
  };
}

function formToCreateRequest(f: ContactFormState): ContactCreateRequest {
  const req: ContactCreateRequest = {};
  if (f.full_name.trim()) req.full_name = f.full_name.trim();
  if (f.email.trim()) req.email = f.email.trim();
  if (f.phone.trim()) req.phone = f.phone.trim();
  if (f.instagram_handle.trim()) req.instagram_handle = f.instagram_handle.trim();
  if (f.company.trim()) req.company = f.company.trim();
  if (f.lead_status) req.lead_status = f.lead_status;
  if (f.lead_score) req.lead_score = f.lead_score;
  if (f.tags.trim()) req.tags = f.tags.split(",").map(t => t.trim()).filter(Boolean);
  if (f.notes.trim()) req.notes = f.notes.trim();
  return req;
}

function formToUpdateRequest(f: ContactFormState): ContactUpdateRequest {
  const req: ContactUpdateRequest = {};
  if (f.full_name.trim()) req.full_name = f.full_name.trim();
  if (f.email.trim()) req.email = f.email.trim();
  if (f.phone.trim()) req.phone = f.phone.trim();
  if (f.instagram_handle.trim()) req.instagram_handle = f.instagram_handle.trim();
  if (f.company.trim()) req.company = f.company.trim();
  if (f.lead_status) req.lead_status = f.lead_status;
  if (f.lead_score) req.lead_score = f.lead_score;
  req.tags = f.tags.trim() ? f.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  if (f.notes.trim()) req.notes = f.notes.trim();
  return req;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Contacts() {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const [filters, setFilters] = useState<ContactListFilters>({ page: 1, per_page: 20 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [formState, setFormState] = useState<ContactFormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ── Queries & Mutations ───────────────────────────────────────────────── */
  const { data: listData, isLoading, refetch } = useContactsList(filters);
  const { data: detailData, isLoading: detailLoading } = useContactDetail(activeContactId);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const { toast } = useToast();

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const contacts = listData?.contacts ?? MOCK_CONTACTS;
  const stats = MOCK_STATS;
  const totalPages = Math.ceil((listData?.total ?? MOCK_CONTACTS.length) / (filters.per_page ?? 20));
  const detail: ContactDetailResponse | null = detailData ?? (activeContactId === "c1" ? MOCK_DETAIL : null);

  const currentPage = filters.page || 1;
  const perPage = filters.per_page || 20;
  const totalCount = listData?.total ?? MOCK_CONTACTS.length;
  const fromIdx = (currentPage - 1) * perPage + 1;
  const toIdx = Math.min(currentPage * perPage, totalCount);

  /* ── Active filter count ───────────────────────────────────────────────── */
  const activeFilterCount = useMemo(() =>
    Object.entries(filters).filter(
      ([k, v]) => k !== "page" && k !== "per_page" && v !== undefined && v !== ""
    ).length
  , [filters]);

  /* ── Filter helpers ────────────────────────────────────────────────────── */
  const updateFilter = useCallback((key: keyof ContactListFilters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 20 });
  }, []);

  /* ── Selection helpers ─────────────────────────────────────────────────── */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === contacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map(c => c.id)));
  }, [selectedIds.size, contacts]);

  /* ── Form helpers ──────────────────────────────────────────────────────── */
  const openCreateDialog = useCallback(() => {
    setEditingContact(null);
    setFormState(EMPTY_FORM);
    setFormDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((contact: ContactItem) => {
    setEditingContact(contact);
    setFormState(contactToForm(contact));
    setFormDialogOpen(true);
  }, []);

  const handleFormField = useCallback(<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleFormSubmit = useCallback(() => {
    if (editingContact) {
      updateContact.mutate(
        { id: editingContact.id, data: formToUpdateRequest(formState) },
        {
          onSuccess: () => {
            toast({ description: "Contact updated" });
            setFormDialogOpen(false);
            void refetch();
          },
          onError: () => toast({ variant: "destructive", description: "Failed to update contact" }),
        },
      );
    } else {
      createContact.mutate(formToCreateRequest(formState), {
        onSuccess: () => {
          toast({ description: "Contact created" });
          setFormDialogOpen(false);
          void refetch();
        },
        onError: () => toast({ variant: "destructive", description: "Failed to create contact" }),
      });
    }
  }, [editingContact, formState, updateContact, createContact, toast, refetch]);

  const handleDelete = useCallback((id: string) => {
    deleteContact.mutate(id, {
      onSuccess: () => {
        toast({ description: "Contact deleted" });
        setConfirmDeleteId(null);
        setActiveContactId(null);
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to delete contact" }),
    });
  }, [deleteContact, toast, refetch]);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Manage your omnichannel contacts and lead pipeline
          </p>
        </div>

        <Button size="sm" onClick={openCreateDialog} className="gap-1.5 text-xs self-start sm:self-auto">
          <Plus size={14} />
          Add Contact
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
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              card.accent,
            )} />
            <div className="relative">
              <div className="text-muted-foreground mb-2">{card.icon}</div>
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
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search contacts..."
            value={filters.search || ""}
            onChange={e => updateFilter("search", e.target.value || undefined)}
            className="pl-9 h-9 text-sm bg-card"
          />
        </div>

        {/* Lead status filter */}
        <Select
          value={filters.lead_status || "_all"}
          onValueChange={v => updateFilter("lead_status", v === "_all" ? undefined : v)}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Status</SelectItem>
            {LEAD_STATUSES.map(s => (
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
        <Select
          value={filters.channel || "_all"}
          onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}
        >
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

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         TABLE
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* ── DESKTOP / TABLET TABLE (sm+) ─────────────────────────────────── */}
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 p-3 pl-4">
                <Checkbox
                  checked={selectedIds.size === contacts.length && contacts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Name
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                Email
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                Phone
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden 2xl:table-cell">
                Company
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                Channels
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">
                Score
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                Last Active
              </th>
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
                  <td className="p-3 hidden xl:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3 hidden 2xl:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3 hidden xl:table-cell"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="p-3 hidden md:table-cell"><Skeleton className="h-5 w-14" /></td>
                  <td className="p-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3 pr-4"><Skeleton className="h-4 w-4" /></td>
                </tr>
              ))
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Users size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No contacts found</p>
                    {activeFilterCount > 0 && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : contacts.map(contact => (
              <tr
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={cn(
                  "cursor-pointer transition-colors group",
                  selectedIds.has(contact.id)
                    ? "bg-primary/5 hover:bg-primary/8"
                    : "hover:bg-muted/50",
                )}
              >
                {/* Checkbox */}
                <td className="p-3 pl-4" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                </td>

                {/* Name / Avatar — always visible; shows email inline when lg column hidden */}
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <ContactAvatar name={contact.full_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                        {contactDisplayName(contact)}
                      </p>

                      {/* Company inline under name on smaller screens */}
                      {contact.company && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5 2xl:hidden">
                          <Building2 size={10} className="shrink-0" />
                          {contact.company}
                        </p>
                      )}

                      {/* Email inline when lg column hidden */}
                      {contact.email && (
                        <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5 lg:hidden">
                          <Mail size={9} className="shrink-0" />
                          {contact.email}
                        </p>
                      )}

                      {/* Channels inline when xl column hidden */}
                      <div className="xl:hidden mt-1 flex gap-1 flex-wrap">
                        {contact.channels_used && contact.channels_used.length > 0 ? (
                          contact.channels_used.slice(0, 2).map(ch => (
                            <ChannelPill key={ch} channel={ch} />
                          ))
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Email — visible on lg+ */}
                <td className="p-3 hidden lg:table-cell">
                  {contact.email ? (
                    <p className="text-[11px] text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                      <Mail size={10} className="shrink-0 text-muted-foreground/60" />
                      {contact.email}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50">--</p>
                  )}
                </td>

                {/* Phone — visible on xl+ */}
                <td className="p-3 hidden xl:table-cell whitespace-nowrap">
                  {contact.phone ? (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone size={10} className="shrink-0 text-muted-foreground/60" />
                      {contact.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50">--</p>
                  )}
                </td>

                {/* Company — visible on 2xl+ */}
                <td className="p-3 hidden 2xl:table-cell">
                  {contact.company ? (
                    <p className="text-[11px] text-muted-foreground truncate max-w-[160px] flex items-center gap-1">
                      <Building2 size={10} className="shrink-0 text-muted-foreground/60" />
                      {contact.company}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/50">--</p>
                  )}
                </td>

                {/* Channels — visible on xl+ */}
                <td className="p-3 hidden xl:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {contact.channels_used && contact.channels_used.length > 0 ? (
                      contact.channels_used.map(ch => (
                        <ChannelPill key={ch} channel={ch} />
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">--</span>
                    )}
                  </div>
                </td>

                {/* Lead Status — always visible */}
                <td className="p-3">
                  <StatusBadge status={contact.lead_status} />
                </td>

                {/* Lead Score — visible on md+ */}
                <td className="p-3 hidden md:table-cell">
                  <ScoreBadge score={contact.lead_score} />
                </td>

                {/* Last Active — visible on lg+ */}
                <td className="p-3 hidden lg:table-cell whitespace-nowrap">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {relativeTime(contact.last_active_at)}
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
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => setActiveContactId(contact.id)}>
                        <Eye size={13} /> View Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => openEditDialog(contact)}>
                        <Edit size={13} /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                        onClick={() => setConfirmDeleteId(contact.id)}
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
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : contacts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Users size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No contacts found</p>
                {activeFilterCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : contacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => setActiveContactId(contact.id)}
              className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                </div>
                <ContactAvatar name={contact.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                      {contactDisplayName(contact)}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {relativeTime(contact.last_active_at)}
                    </span>
                  </div>

                  {contact.company && (
                    <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                      <Building2 size={10} /> {contact.company}
                    </p>
                  )}

                  {contact.email && (
                    <p className="text-[11px] text-muted-foreground/70 truncate mb-1 flex items-center gap-1">
                      <Mail size={9} /> {contact.email}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <StatusBadge status={contact.lead_status} />
                    <ScoreBadge score={contact.lead_score} />
                    {contact.channels_used && contact.channels_used.slice(0, 2).map(ch => (
                      <ChannelPill key={ch} channel={ch} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && contacts.length > 0 && (
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

      {/* ═══════════════════════════════════════════════════════════════════════
         CONTACT DETAIL DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!activeContactId} onOpenChange={open => { if (!open) setActiveContactId(null); }}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden flex flex-col gap-0",
            "max-w-[720px] w-[95vw] max-h-[92vh] sm:max-h-[88vh]",
            "bg-card border rounded-2xl",
          )}
        >
          {detailLoading || !detail ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              {/* ── Contact Header ── */}
              <div className="shrink-0 p-5 sm:p-6 border-b space-y-4">
                <div className="flex items-start gap-3.5">
                  <ContactAvatar name={detail.contact.full_name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h2 className="font-heading text-base sm:text-lg font-bold text-foreground leading-none">
                        {contactDisplayName(detail.contact)}
                      </h2>
                      <StatusBadge status={detail.contact.lead_status} />
                      <ScoreBadge score={detail.contact.lead_score} />
                    </div>

                    {detail.contact.company && (
                      <p className="text-[13px] text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Building2 size={12} /> {detail.contact.company}
                      </p>
                    )}

                    <div className="flex gap-4 flex-wrap">
                      {detail.contact.email && (
                        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                          <Mail size={12} className="text-muted-foreground/60" />{detail.contact.email}
                        </span>
                      )}
                      {detail.contact.phone && (
                        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                          <Phone size={12} className="text-muted-foreground/60" />{detail.contact.phone}
                        </span>
                      )}
                      {detail.contact.instagram_handle && (
                        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                          <Instagram size={12} className="text-muted-foreground/60" />{detail.contact.instagram_handle}
                        </span>
                      )}
                    </div>

                    {detail.contact.tags && detail.contact.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        {detail.contact.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            <Tag size={8} className="mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Detail Body ── */}
              <div className="flex-1 overflow-auto p-5 sm:p-6 space-y-5">

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                      Conversations
                    </p>
                    <p className="text-lg font-bold font-mono text-foreground">{detail.conversations_count}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                      Bookings
                    </p>
                    <p className="text-lg font-bold font-mono text-foreground">{detail.bookings_count}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                      First Seen
                    </p>
                    <p className="text-[12px] font-medium font-mono text-foreground">
                      {relativeTime(detail.contact.first_seen_at)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                      Last Active
                    </p>
                    <p className="text-[12px] font-medium font-mono text-foreground">
                      {relativeTime(detail.contact.last_active_at)}
                    </p>
                  </div>
                </div>

                {/* Contact info card */}
                <div className="rounded-lg border bg-muted/30 p-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {detail.contact.email && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Mail size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground truncate">{detail.contact.email}</span>
                      </div>
                    )}
                    {detail.contact.phone && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Phone size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">{detail.contact.phone}</span>
                      </div>
                    )}
                    {detail.contact.company && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Building2 size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">{detail.contact.company}</span>
                      </div>
                    )}
                    {detail.contact.instagram_handle && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Instagram size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">{detail.contact.instagram_handle}</span>
                      </div>
                    )}
                    {detail.contact.channels_used && detail.contact.channels_used.length > 0 && (
                      <div className="flex items-center gap-2 text-[12px] sm:col-span-2">
                        <Hash size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">Channels:</span>
                        <div className="flex gap-1 flex-wrap">
                          {detail.contact.channels_used.map(ch => (
                            <ChannelPill key={ch} channel={ch} />
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.contact.first_seen_channel && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Star size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground">
                          First via {CHANNEL_META[detail.contact.first_seen_channel]?.label ?? detail.contact.first_seen_channel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-lg border bg-muted/30 p-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                    Notes
                  </h4>
                  {detail.contact.notes ? (
                    <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
                      {detail.contact.notes}
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground/50 italic">
                      No notes added yet.
                    </p>
                  )}
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <div className="shrink-0 border-t p-4 sm:px-6 flex gap-2.5 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveContactId(null);
                    openEditDialog(detail.contact);
                  }}
                  variant="outline"
                  className="gap-1.5 text-xs"
                >
                  <Edit size={13} /> Edit Contact
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActiveContactId(null);
                    setConfirmDeleteId(detail.contact.id);
                  }}
                  className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={13} /> Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         CREATE / EDIT DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-[520px] w-[95vw] bg-card rounded-2xl max-h-[92vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Full Name
              </label>
              <Input
                value={formState.full_name}
                onChange={e => handleFormField("full_name", e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="h-9 text-sm bg-card"
              />
            </div>

            {/* Email + Phone row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  value={formState.email}
                  onChange={e => handleFormField("email", e.target.value)}
                  placeholder="email@example.com"
                  className="h-9 text-sm bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={formState.phone}
                  onChange={e => handleFormField("phone", e.target.value)}
                  placeholder="+1 555 0100"
                  className="h-9 text-sm bg-card"
                />
              </div>
            </div>

            {/* Instagram + Company row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Instagram Handle
                </label>
                <Input
                  value={formState.instagram_handle}
                  onChange={e => handleFormField("instagram_handle", e.target.value)}
                  placeholder="@handle"
                  className="h-9 text-sm bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Company
                </label>
                <Input
                  value={formState.company}
                  onChange={e => handleFormField("company", e.target.value)}
                  placeholder="Acme Corp"
                  className="h-9 text-sm bg-card"
                />
              </div>
            </div>

            {/* Lead Status + Lead Score row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Lead Status
                </label>
                <Select value={formState.lead_status} onValueChange={v => handleFormField("lead_status", v)}>
                  <SelectTrigger className="h-9 text-sm bg-card">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2 capitalize">
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                          {s}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Lead Score
                </label>
                <Select value={formState.lead_score || "_none"} onValueChange={v => handleFormField("lead_score", v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm bg-card">
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No Score</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Tags
              </label>
              <Input
                value={formState.tags}
                onChange={e => handleFormField("tags", e.target.value)}
                placeholder="Comma-separated tags, e.g. enterprise, pricing"
                className="h-9 text-sm bg-card"
              />
              <p className="text-[10px] text-muted-foreground/60">
                Separate multiple tags with commas
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Notes
              </label>
              <Textarea
                value={formState.notes}
                onChange={e => handleFormField("notes", e.target.value)}
                placeholder="Internal notes about this contact..."
                rows={3}
                className="text-sm bg-card resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setFormDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createContact.isPending || updateContact.isPending}
              onClick={handleFormSubmit}
            >
              {editingContact ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         DELETE CONFIRMATION DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Delete Contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete this contact? This action cannot be undone.
            All associated data will be permanently removed.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleteContact.isPending}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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
            variant="outline"
            onClick={() => {
              selectedIds.forEach(id => setConfirmDeleteId(id));
            }}
            className="gap-1.5 text-[11px] h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
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
    </div>
  );
}
