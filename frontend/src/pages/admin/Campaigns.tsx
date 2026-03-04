import { useState, useCallback, useMemo } from "react";
import {
  Megaphone, Search, Plus, Send, Calendar, BarChart3,
  Mail, MessageSquare, Eye, Trash2, Edit, MoreHorizontal,
  ChevronLeft, ChevronRight, X, Clock, Users,
  CheckCircle2, AlertCircle, RefreshCw, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  useCampaignsList, useCampaignStats,
  useCreateCampaign, useUpdateCampaign, useDeleteCampaign, useSendCampaign,
} from "@/hooks/useCampaigns";
import {
  type CampaignItem, type CampaignListFilters, type CampaignCreateRequest,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const MOCK_STATS = {
  total: 24, draft: 5, scheduled: 4, sending: 1, sent: 12, cancelled: 2,
};

const MOCK_CAMPAIGNS: CampaignItem[] = [
  {
    id: "c1", tenant_id: "t1", name: "Black Friday Flash Sale",
    channel: "whatsapp", status: "sent",
    audience_filter: { segment: "active_buyers" },
    message_template: "Hey {{name}}! Our biggest sale of the year is LIVE. Get up to 60% off everything. Shop now before it's gone!",
    scheduled_at: "2025-11-29T08:00:00Z", sent_at: "2025-11-29T08:00:12Z",
    sent_count: 4230, delivered_count: 4105, read_count: 3412, reply_count: 287,
    created_at: "2025-11-25T10:30:00Z", updated_at: "2025-11-29T08:00:12Z",
  },
  {
    id: "c2", tenant_id: "t1", name: "January Product Launch",
    channel: "email", status: "scheduled",
    audience_filter: { segment: "newsletter_subscribers" },
    message_template: "Dear {{name}}, we're thrilled to announce our newest product line launching January 15th. Be the first to explore what's new.",
    scheduled_at: "2026-01-15T09:00:00Z", sent_at: null,
    sent_count: 0, delivered_count: 0, read_count: 0, reply_count: 0,
    created_at: "2025-12-20T14:00:00Z", updated_at: "2025-12-28T11:15:00Z",
  },
  {
    id: "c3", tenant_id: "t1", name: "Re-engagement: Dormant Users",
    channel: "sms", status: "sending",
    audience_filter: { inactive_days: 90 },
    message_template: "Hi {{name}}, we miss you! Come back and enjoy 20% off your next order with code WELCOME20. Expires in 48h.",
    scheduled_at: "2026-03-04T06:00:00Z", sent_at: "2026-03-04T06:00:05Z",
    sent_count: 1820, delivered_count: 1650, read_count: 920, reply_count: 45,
    created_at: "2026-02-28T09:00:00Z", updated_at: "2026-03-04T06:00:05Z",
  },
  {
    id: "c4", tenant_id: "t1", name: "Instagram Story Promotion",
    channel: "instagram", status: "draft",
    audience_filter: null,
    message_template: "Check out our latest collection! Tap the link in bio for exclusive early access. Limited quantities available.",
    scheduled_at: null, sent_at: null,
    sent_count: 0, delivered_count: 0, read_count: 0, reply_count: 0,
    created_at: "2026-03-01T16:00:00Z", updated_at: "2026-03-02T10:00:00Z",
  },
  {
    id: "c5", tenant_id: "t1", name: "Customer Satisfaction Survey",
    channel: "email", status: "sent",
    audience_filter: { segment: "recent_purchasers" },
    message_template: "Hi {{name}}, thank you for your recent purchase! We'd love your feedback. Take our 2-minute survey and get 10% off your next order.",
    scheduled_at: "2026-02-14T10:00:00Z", sent_at: "2026-02-14T10:00:08Z",
    sent_count: 2150, delivered_count: 2098, read_count: 1456, reply_count: 532,
    created_at: "2026-02-10T11:30:00Z", updated_at: "2026-02-14T10:00:08Z",
  },
  {
    id: "c6", tenant_id: "t1", name: "Messenger Holiday Greetings",
    channel: "facebook", status: "sent",
    audience_filter: { segment: "all_contacts" },
    message_template: "Season's greetings from the team! Wishing you a wonderful holiday season. Enjoy free shipping on all orders this week.",
    scheduled_at: "2025-12-24T07:00:00Z", sent_at: "2025-12-24T07:00:03Z",
    sent_count: 5600, delivered_count: 5320, read_count: 4100, reply_count: 890,
    created_at: "2025-12-20T09:00:00Z", updated_at: "2025-12-24T07:00:03Z",
  },
  {
    id: "c7", tenant_id: "t1", name: "Spring Collection Preview",
    channel: "whatsapp", status: "draft",
    audience_filter: null,
    message_template: null,
    scheduled_at: null, sent_at: null,
    sent_count: 0, delivered_count: 0, read_count: 0, reply_count: 0,
    created_at: "2026-03-03T08:00:00Z", updated_at: "2026-03-03T08:00:00Z",
  },
  {
    id: "c8", tenant_id: "t1", name: "Cancelled: Pricing Update Notice",
    channel: "email", status: "cancelled",
    audience_filter: { segment: "paying_customers" },
    message_template: "Important update regarding our pricing changes effective April 1st...",
    scheduled_at: "2026-03-10T12:00:00Z", sent_at: null,
    sent_count: 0, delivered_count: 0, read_count: 0, reply_count: 0,
    created_at: "2026-02-25T15:00:00Z", updated_at: "2026-03-01T09:30:00Z",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const CHANNEL_META: Record<string, { icon: string; label: string; className: string }> = {
  whatsapp:  { icon: "💬", label: "WhatsApp",  className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  instagram: { icon: "📸", label: "Instagram", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  facebook:  { icon: "💙", label: "Facebook",  className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  email:     { icon: "📧", label: "Email",     className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  sms:       { icon: "📱", label: "SMS",       className: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
};

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  draft:     { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",       label: "Draft" },
  scheduled: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",       label: "Scheduled" },
  sending:   { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",   label: "Sending" },
  sent:      { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Sent" },
  cancelled: { dot: "bg-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20",         label: "Cancelled" },
};

const STATUS_LIST = ["draft", "scheduled", "sending", "sent", "cancelled"] as const;
const CHANNEL_LIST = ["whatsapp", "instagram", "facebook", "email", "sms"] as const;

type StatKey = keyof typeof MOCK_STATS;

const STAT_CARDS: { key: StatKey; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "total",     label: "Total",     icon: <Megaphone size={18} />,     accent: "from-blue-500/20 to-blue-500/0" },
  { key: "draft",     label: "Draft",     icon: <Edit size={18} />,          accent: "from-gray-500/20 to-gray-500/0" },
  { key: "scheduled", label: "Scheduled", icon: <Calendar size={18} />,      accent: "from-blue-500/20 to-blue-500/0" },
  { key: "sending",   label: "Sending",   icon: <Send size={18} />,          accent: "from-amber-500/20 to-amber-500/0" },
  { key: "sent",      label: "Sent",      icon: <CheckCircle2 size={18} />,  accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "cancelled", label: "Cancelled", icon: <AlertCircle size={18} />,   accent: "from-red-500/20 to-red-500/0" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return "--";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) {
    // Future date
    const absMins = Math.abs(mins);
    if (absMins < 60) return `in ${absMins}m`;
    const hrs = Math.floor(absMins / 60);
    if (hrs < 24) return `in ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `in ${days}d`;
  }
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "--";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
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

function ChannelPill({ channel }: { channel: string }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.email;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
      "text-[11px] font-medium",
      meta.className,
    )}>
      <span className="text-[10px]">{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider font-heading">
        {label}
      </span>
      <span className="text-sm font-bold font-mono text-foreground">
        {formatCount(value)}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FORM STATE TYPE
   ═══════════════════════════════════════════════════════════════════════════════ */

interface CampaignFormState {
  name: string;
  channel: string;
  message_template: string;
  scheduled_at: string;
}

const INITIAL_FORM: CampaignFormState = {
  name: "",
  channel: "whatsapp",
  message_template: "",
  scheduled_at: "",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Campaigns() {
  const [filters, setFilters] = useState<CampaignListFilters>({ page: 1, per_page: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<CampaignItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CampaignItem | null>(null);
  const [confirmSend, setConfirmSend] = useState<CampaignItem | null>(null);
  const [form, setForm] = useState<CampaignFormState>(INITIAL_FORM);

  const { data: listData, isLoading, refetch } = useCampaignsList(filters);
  const { data: statsData } = useCampaignStats();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign = useSendCampaign();
  const { toast } = useToast();

  const campaigns = listData?.campaigns ?? MOCK_CAMPAIGNS;
  const stats = statsData ?? MOCK_STATS;
  const totalPages = Math.ceil((listData?.total ?? MOCK_CAMPAIGNS.length) / (filters.per_page ?? 10));

  /* ── Filter helpers ──────────────────────────────────────────────────────── */

  const updateFilter = useCallback((key: keyof CampaignListFilters, value: string | number | undefined) => {
    setFilters(prev => {
      const next: CampaignListFilters = { ...prev, page: 1 };
      if (value !== undefined) {
        (next as Record<string, unknown>)[key] = value;
      } else {
        delete (next as Record<string, unknown>)[key];
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 10 });
  }, []);

  const activeFilterCount = useMemo(() =>
    Object.entries(filters).filter(
      ([k, v]) => k !== "page" && k !== "per_page" && v !== undefined && v !== ""
    ).length
  , [filters]);

  /* ── Filtered campaigns for client-side demo ─────────────────────────────── */

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (filters.status) {
      result = result.filter(c => c.status === filters.status);
    }
    if (filters.channel) {
      result = result.filter(c => c.channel === filters.channel);
    }
    return result;
  }, [campaigns, filters.status, filters.channel]);

  /* ── Pagination ──────────────────────────────────────────────────────────── */

  const currentPage = filters.page ?? 1;
  const perPage = filters.per_page ?? 10;
  const totalCount = listData?.total ?? filteredCampaigns.length;
  const fromIdx = (currentPage - 1) * perPage + 1;
  const toIdx = Math.min(currentPage * perPage, totalCount);

  /* ── Form helpers ────────────────────────────────────────────────────────── */

  const openCreate = useCallback(() => {
    setForm(INITIAL_FORM);
    setEditingCampaign(null);
    setCreateOpen(true);
  }, []);

  const openEdit = useCallback((campaign: CampaignItem) => {
    setForm({
      name: campaign.name,
      channel: campaign.channel,
      message_template: campaign.message_template ?? "",
      scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : "",
    });
    setEditingCampaign(campaign);
    setCreateOpen(true);
  }, []);

  const handleFormSubmit = useCallback(() => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", description: "Campaign name is required" });
      return;
    }

    if (editingCampaign) {
      // Update existing
      const data: Record<string, unknown> = {
        name: form.name.trim(),
        channel: form.channel,
      };
      if (form.message_template.trim()) {
        data.message_template = form.message_template.trim();
      }
      if (form.scheduled_at) {
        data.scheduled_at = new Date(form.scheduled_at).toISOString();
      }
      updateCampaign.mutate({ id: editingCampaign.id, data }, {
        onSuccess: () => {
          toast({ description: "Campaign updated successfully" });
          setCreateOpen(false);
          void refetch();
        },
        onError: () => toast({ variant: "destructive", description: "Failed to update campaign" }),
      });
    } else {
      // Create new
      const payload: CampaignCreateRequest = {
        name: form.name.trim(),
        channel: form.channel,
        ...(form.message_template.trim() ? { message_template: form.message_template.trim() } : {}),
        ...(form.scheduled_at ? { scheduled_at: new Date(form.scheduled_at).toISOString() } : {}),
      };
      createCampaign.mutate(payload, {
        onSuccess: () => {
          toast({ description: "Campaign created successfully" });
          setCreateOpen(false);
          void refetch();
        },
        onError: () => toast({ variant: "destructive", description: "Failed to create campaign" }),
      });
    }
  }, [form, editingCampaign, createCampaign, updateCampaign, toast, refetch]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) return;
    deleteCampaign.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast({ description: "Campaign deleted" });
        setConfirmDelete(null);
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to delete campaign" }),
    });
  }, [confirmDelete, deleteCampaign, toast, refetch]);

  const handleSend = useCallback(() => {
    if (!confirmSend) return;
    sendCampaign.mutate(confirmSend.id, {
      onSuccess: () => {
        toast({ description: "Campaign is now sending!" });
        setConfirmSend(null);
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to send campaign" }),
    });
  }, [confirmSend, sendCampaign, toast, refetch]);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Create, schedule, and track omnichannel campaign performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => void refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            className="gap-1.5 text-xs"
          >
            <Plus size={13} />
            Create Campaign
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
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <Select
          value={filters.status ?? "_all"}
          onValueChange={v => updateFilter("status", v === "_all" ? undefined : v)}
        >
          <SelectTrigger className="w-[140px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Status</SelectItem>
            {STATUS_LIST.map(s => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
                  {STATUS_META[s].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Channel filter */}
        <Select
          value={filters.channel ?? "_all"}
          onValueChange={v => updateFilter("channel", v === "_all" ? undefined : v)}
        >
          <SelectTrigger className="w-[150px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Channels</SelectItem>
            {CHANNEL_LIST.map(ch => (
              <SelectItem key={ch} value={ch}>
                {CHANNEL_META[ch].icon} {CHANNEL_META[ch].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter size={12} />
            Clear filters
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         TABLE VIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* ── DESKTOP / TABLET TABLE (sm+) ──────────────────────────────────
             Progressive column disclosure: lower-priority columns hide at
             smaller breakpoints so the table NEVER needs horizontal scroll.
             ────────────────────────────────────────────────────────────────── */}
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Campaign
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Channel
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                Template
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">
                Date
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
                Performance
              </th>
              <th className="w-10 p-3 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-4"><Skeleton className="h-9 w-full" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-20" /></td>
                  <td className="p-3 hidden lg:table-cell"><Skeleton className="h-4 w-full" /></td>
                  <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-3 hidden xl:table-cell"><Skeleton className="h-8 w-full" /></td>
                  <td className="p-3 pr-4"><Skeleton className="h-4 w-4" /></td>
                </tr>
              ))
            ) : filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Megaphone size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No campaigns found</p>
                    {activeFilterCount > 0 && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : filteredCampaigns.map(campaign => {
              const channelMeta = CHANNEL_META[campaign.channel] ?? CHANNEL_META.email;
              return (
                <tr
                  key={campaign.id}
                  onClick={() => setDetailCampaign(campaign)}
                  className="cursor-pointer transition-colors group hover:bg-muted/50"
                >
                  {/* Campaign name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-base border",
                        channelMeta.className,
                      )}>
                        {channelMeta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                          {campaign.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {relativeTime(campaign.created_at)}
                        </p>

                        {/* Inline channel + date on smaller viewports */}
                        <div className="md:hidden mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={9} />
                            {campaign.sent_at
                              ? formatDate(campaign.sent_at)
                              : campaign.scheduled_at
                                ? formatDate(campaign.scheduled_at)
                                : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <ChannelPill channel={campaign.channel} />
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <StatusBadge status={campaign.status} />
                  </td>

                  {/* Template preview — visible lg+ */}
                  <td className="px-3 py-3 hidden lg:table-cell max-w-[200px]">
                    <p className="text-[12px] text-muted-foreground truncate leading-relaxed">
                      {campaign.message_template || "--"}
                    </p>
                  </td>

                  {/* Date — visible md+ */}
                  <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      {campaign.sent_at ? (
                        <>
                          <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <Send size={9} className="text-emerald-400" />
                            {formatDate(campaign.sent_at)}
                          </span>
                        </>
                      ) : campaign.scheduled_at ? (
                        <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                          <Calendar size={9} className="text-blue-400" />
                          {formatDate(campaign.scheduled_at)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/50">--</span>
                      )}
                    </div>
                  </td>

                  {/* Performance — visible xl+ */}
                  <td className="px-3 py-3 hidden xl:table-cell">
                    {campaign.sent_count > 0 ? (
                      <div className="flex items-center gap-3">
                        <MetricPill label="Sent" value={campaign.sent_count} />
                        <MetricPill label="Dlvd" value={campaign.delivered_count} />
                        <MetricPill label="Read" value={campaign.read_count} />
                        <MetricPill label="Reply" value={campaign.reply_count} />
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">--</span>
                    )}
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
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => setDetailCampaign(campaign)}>
                          <Eye size={13} /> View Details
                        </DropdownMenuItem>
                        {(campaign.status === "draft" || campaign.status === "scheduled") && (
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(campaign)}>
                            <Edit size={13} /> Edit
                          </DropdownMenuItem>
                        )}
                        {(campaign.status === "draft" || campaign.status === "scheduled") && (
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => setConfirmSend(campaign)}>
                            <Send size={13} /> Send Now
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(campaign)}
                        >
                          <Trash2 size={13} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
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
          ) : filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Megaphone size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No campaigns found</p>
                {activeFilterCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : filteredCampaigns.map(campaign => {
            const channelMeta = CHANNEL_META[campaign.channel] ?? CHANNEL_META.email;
            return (
              <div
                key={campaign.id}
                onClick={() => setDetailCampaign(campaign)}
                className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-base border mt-0.5",
                    channelMeta.className,
                  )}>
                    {channelMeta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                        {campaign.name}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => setDetailCampaign(campaign)}>
                            <Eye size={13} /> View
                          </DropdownMenuItem>
                          {(campaign.status === "draft" || campaign.status === "scheduled") && (
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => openEdit(campaign)}>
                              <Edit size={13} /> Edit
                            </DropdownMenuItem>
                          )}
                          {(campaign.status === "draft" || campaign.status === "scheduled") && (
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => setConfirmSend(campaign)}>
                              <Send size={13} /> Send
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs gap-2 text-destructive focus:text-destructive"
                            onClick={() => setConfirmDelete(campaign)}
                          >
                            <Trash2 size={13} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {campaign.message_template && (
                      <p className="text-[12px] text-muted-foreground/80 line-clamp-2 mb-2 leading-relaxed">
                        {campaign.message_template}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <StatusBadge status={campaign.status} />
                      <ChannelPill channel={campaign.channel} />
                    </div>

                    {/* Date + metrics row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock size={9} />
                        {campaign.sent_at
                          ? formatDate(campaign.sent_at)
                          : campaign.scheduled_at
                            ? formatDate(campaign.scheduled_at)
                            : "No date"}
                      </span>
                      {campaign.sent_count > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatCount(campaign.sent_count)} sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!isLoading && filteredCampaigns.length > 0 && (
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
         CREATE / EDIT DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="max-w-[520px] w-[95vw] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">
              {editingCampaign ? "Edit Campaign" : "Create Campaign"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Campaign Name
              </label>
              <Input
                placeholder="e.g. Spring Sale Announcement"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 text-sm bg-card"
              />
            </div>

            {/* Channel */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Channel
              </label>
              <Select value={form.channel} onValueChange={v => setForm(prev => ({ ...prev, channel: v }))}>
                <SelectTrigger className="h-9 text-sm bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_LIST.map(ch => (
                    <SelectItem key={ch} value={ch}>
                      <span className="flex items-center gap-2">
                        <span>{CHANNEL_META[ch].icon}</span>
                        {CHANNEL_META[ch].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message template */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Message Template
              </label>
              <Textarea
                placeholder="Write your campaign message here. Use {{name}} for personalization..."
                value={form.message_template}
                onChange={e => setForm(prev => ({ ...prev, message_template: e.target.value }))}
                rows={5}
                className="text-sm bg-card resize-none"
              />
              <p className="text-[10px] text-muted-foreground/60">
                Supports variables: {"{{name}}"}, {"{{email}}"}, {"{{company}}"}
              </p>
            </div>

            {/* Scheduled at */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Schedule Send
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 pl-9 text-sm",
                    "text-foreground shadow-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "placeholder:text-muted-foreground",
                  )}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Leave empty to save as draft
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createCampaign.isPending || updateCampaign.isPending}
              onClick={handleFormSubmit}
              className="gap-1.5"
            >
              {editingCampaign ? (
                <>
                  <CheckCircle2 size={13} /> Save Changes
                </>
              ) : (
                <>
                  <Plus size={13} /> Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         DETAIL VIEW DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!detailCampaign} onOpenChange={open => { if (!open) setDetailCampaign(null); }}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden flex flex-col gap-0",
            "max-w-[720px] w-[95vw] max-h-[92vh] sm:max-h-[88vh]",
            "bg-card border rounded-2xl",
          )}
        >
          {detailCampaign && (
            <>
              {/* ── Header ── */}
              <div className="shrink-0 p-5 sm:p-6 border-b space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center text-lg border shrink-0",
                    (CHANNEL_META[detailCampaign.channel] ?? CHANNEL_META.email).className,
                  )}>
                    {(CHANNEL_META[detailCampaign.channel] ?? CHANNEL_META.email).icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h2 className="font-heading text-base sm:text-lg font-bold text-foreground leading-none">
                        {detailCampaign.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={detailCampaign.status} />
                      <ChannelPill channel={detailCampaign.channel} />
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Created {relativeTime(detailCampaign.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-auto p-5 sm:p-6 space-y-6">

                {/* Performance metrics */}
                {detailCampaign.sent_count > 0 && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-3 flex items-center gap-1.5">
                      <BarChart3 size={12} /> Campaign Performance
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-card">
                        <Send size={14} className="text-blue-400 mb-1" />
                        <span className="text-lg font-bold font-mono text-foreground">
                          {formatCount(detailCampaign.sent_count)}
                        </span>
                        <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                          Sent
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-card">
                        <CheckCircle2 size={14} className="text-emerald-400 mb-1" />
                        <span className="text-lg font-bold font-mono text-foreground">
                          {formatCount(detailCampaign.delivered_count)}
                        </span>
                        <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                          Delivered
                        </span>
                        {detailCampaign.sent_count > 0 && (
                          <span className="text-[10px] font-mono text-emerald-400">
                            {Math.round((detailCampaign.delivered_count / detailCampaign.sent_count) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-card">
                        <Eye size={14} className="text-amber-400 mb-1" />
                        <span className="text-lg font-bold font-mono text-foreground">
                          {formatCount(detailCampaign.read_count)}
                        </span>
                        <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                          Read
                        </span>
                        {detailCampaign.delivered_count > 0 && (
                          <span className="text-[10px] font-mono text-amber-400">
                            {Math.round((detailCampaign.read_count / detailCampaign.delivered_count) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-card">
                        <MessageSquare size={14} className="text-violet-400 mb-1" />
                        <span className="text-lg font-bold font-mono text-foreground">
                          {formatCount(detailCampaign.reply_count)}
                        </span>
                        <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                          Replies
                        </span>
                        {detailCampaign.read_count > 0 && (
                          <span className="text-[10px] font-mono text-violet-400">
                            {Math.round((detailCampaign.reply_count / detailCampaign.read_count) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message template */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Mail size={12} /> Message Template
                  </h4>
                  {detailCampaign.message_template ? (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {detailCampaign.message_template}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground/60 italic">No template configured</p>
                  )}
                </div>

                {/* Schedule info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-muted/30 p-3.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Calendar size={11} /> Scheduled At
                    </h4>
                    <p className="text-[13px] text-foreground font-mono">
                      {formatDate(detailCampaign.scheduled_at)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Send size={11} /> Sent At
                    </h4>
                    <p className="text-[13px] text-foreground font-mono">
                      {formatDate(detailCampaign.sent_at)}
                    </p>
                  </div>
                </div>

                {/* Audience filter */}
                {detailCampaign.audience_filter && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Users size={12} /> Audience Filter
                    </h4>
                    <div className="rounded-lg border bg-muted/30 p-3.5">
                      <pre className="text-[12px] text-muted-foreground font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(detailCampaign.audience_filter, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer Actions ── */}
              <div className="shrink-0 border-t p-4 sm:px-6 flex gap-2.5 flex-wrap">
                {(detailCampaign.status === "draft" || detailCampaign.status === "scheduled") && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => { setDetailCampaign(null); openEdit(detailCampaign); }}
                      variant="outline"
                      className="gap-1.5 text-xs"
                    >
                      <Edit size={13} /> Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setDetailCampaign(null); setConfirmSend(detailCampaign); }}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Send size={13} /> Send Now
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setDetailCampaign(null); setConfirmDelete(detailCampaign); }}
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
         DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Delete Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-foreground">{confirmDelete?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleteCampaign.isPending}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         SEND CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmSend} onOpenChange={open => { if (!open) setConfirmSend(null); }}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Send Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to send <span className="font-semibold text-foreground">{confirmSend?.name}</span> now?
            This will begin delivering messages to your audience immediately.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmSend(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={sendCampaign.isPending}
              onClick={handleSend}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send size={13} /> Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
