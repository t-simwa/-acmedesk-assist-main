import { useState, useCallback } from "react";
import {
  CalendarCheck, Search, Plus, Calendar, Clock,
  CheckCircle2, AlertCircle, X, MoreHorizontal,
  Eye, Trash2, Edit, ChevronLeft, ChevronRight,
  Users, FileText,
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
  useBookingsList, useBookingStats,
  useCreateBooking, useUpdateBooking, useDeleteBooking,
} from "@/hooks/useBookings";
import {
  type BookingItem, type BookingListFilters, type BookingCreateRequest,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const MOCK_STATS = {
  total: 42, requested: 12, confirmed: 18, completed: 9, cancelled: 3,
};

const MOCK_BOOKINGS: BookingItem[] = [
  { id: "b1", tenant_id: "t1", contact_id: "c1", conversation_id: "cv1", service: "Product Demo", preferred_date: "2026-03-10", preferred_time: "10:00", status: "confirmed", notes: "VP of Engineering wants a walkthrough of the analytics dashboard", source_channel: "web", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: "b2", tenant_id: "t1", contact_id: "c2", conversation_id: "cv2", service: "Onboarding Call", preferred_date: "2026-03-12", preferred_time: "14:30", status: "requested", notes: "New enterprise customer, team of 30", source_channel: "whatsapp", created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), updated_at: null },
  { id: "b3", tenant_id: "t1", contact_id: null, conversation_id: "cv3", service: "Technical Support", preferred_date: "2026-03-08", preferred_time: "09:00", status: "completed", notes: null, source_channel: "email", created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "b4", tenant_id: "t1", contact_id: "c4", conversation_id: null, service: "Sales Consultation", preferred_date: "2026-03-15", preferred_time: "11:00", status: "requested", notes: "Interested in annual plan pricing", source_channel: "instagram", created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), updated_at: null },
  { id: "b5", tenant_id: "t1", contact_id: "c5", conversation_id: "cv5", service: "Account Review", preferred_date: "2026-03-05", preferred_time: "16:00", status: "cancelled", notes: "Customer rescheduled — will follow up next week", source_channel: "facebook", created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "b6", tenant_id: "t1", contact_id: "c6", conversation_id: "cv6", service: "Integration Setup", preferred_date: "2026-03-18", preferred_time: "13:00", status: "confirmed", notes: "Salesforce + Slack integration walkthrough", source_channel: "web", created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: "b7", tenant_id: "t1", contact_id: null, conversation_id: "cv7", service: "Product Demo", preferred_date: "2026-03-20", preferred_time: "15:30", status: "requested", notes: null, source_channel: "sms", created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), updated_at: null },
  { id: "b8", tenant_id: "t1", contact_id: "c8", conversation_id: "cv8", service: "Custom Training", preferred_date: "2026-03-06", preferred_time: "10:30", status: "completed", notes: "2-hour session covering advanced reporting features", source_channel: "whatsapp", created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const BOOKING_STATUSES = ["requested", "confirmed", "completed", "cancelled"] as const;

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  requested: { dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Requested" },
  confirmed: { dot: "bg-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Confirmed" },
  completed: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Completed" },
  cancelled: { dot: "bg-red-400", badge: "bg-red-500/10 text-red-400 border-red-500/20", label: "Cancelled" },
};

const CHANNEL_META: Record<string, { icon: string; label: string; className: string }> = {
  web:       { icon: "\u{1F310}", label: "Web",       className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  whatsapp:  { icon: "\u{1F4AC}", label: "WhatsApp",  className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  instagram: { icon: "\u{1F4F8}", label: "Instagram", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  facebook:  { icon: "\u{1F499}", label: "Facebook",  className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  email:     { icon: "\u{1F4E7}", label: "Email",     className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  sms:       { icon: "\u{1F4F1}", label: "SMS",       className: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
};

const STAT_CARDS: { key: keyof typeof MOCK_STATS; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "total",     label: "Total",     icon: <CalendarCheck size={18} />, accent: "from-blue-500/20 to-blue-500/0" },
  { key: "requested", label: "Requested", icon: <AlertCircle size={18} />,   accent: "from-amber-500/20 to-amber-500/0" },
  { key: "confirmed", label: "Confirmed", icon: <CheckCircle2 size={18} />,  accent: "from-blue-500/20 to-blue-500/0" },
  { key: "completed", label: "Completed", icon: <FileText size={18} />,      accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "cancelled", label: "Cancelled", icon: <X size={18} />,             accent: "from-red-500/20 to-red-500/0" },
];

const CHANNEL_KEYS = Object.keys(CHANNEL_META);

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
  return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "--";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status, interactive }: { status: string; interactive?: boolean }) {
  const meta = STATUS_META[status] ?? STATUS_META.requested;
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
      <span className="text-[10px]">{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FORM STATE INTERFACE
   ═══════════════════════════════════════════════════════════════════════════════ */

interface BookingFormState {
  service: string;
  contact_id: string;
  preferred_date: string;
  preferred_time: string;
  notes: string;
  source_channel: string;
}

const EMPTY_FORM: BookingFormState = {
  service: "",
  contact_id: "",
  preferred_date: "",
  preferred_time: "",
  notes: "",
  source_channel: "",
};

function formToCreateRequest(form: BookingFormState): BookingCreateRequest {
  return {
    service: form.service,
    ...(form.contact_id ? { contact_id: form.contact_id } : {}),
    ...(form.preferred_date ? { preferred_date: form.preferred_date } : {}),
    ...(form.preferred_time ? { preferred_time: form.preferred_time } : {}),
    ...(form.notes ? { notes: form.notes } : {}),
    ...(form.source_channel ? { source_channel: form.source_channel } : {}),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Bookings() {
  const [filters, setFilters] = useState<BookingListFilters>({ page: 1, per_page: 20 });
  const [detailBooking, setDetailBooking] = useState<BookingItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null);
  const [form, setForm] = useState<BookingFormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: listData, isLoading, refetch } = useBookingsList(filters);
  const { data: statsData } = useBookingStats();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const { toast } = useToast();

  const bookings = listData?.bookings ?? MOCK_BOOKINGS;
  const stats = statsData ?? MOCK_STATS;
  const totalPages = Math.ceil((listData?.total ?? MOCK_BOOKINGS.length) / (filters.per_page ?? 20));

  /* ── Filter helpers ──────────────────────────────────────────────────────── */

  const updateFilter = useCallback((key: keyof BookingListFilters, value: string | number | undefined) => {
    setFilters(prev => {
      const next = { ...prev, page: 1 };
      if (value === undefined) {
        delete next[key];
      } else {
        (next as Record<string, string | number>)[key] = value;
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 20 });
  }, []);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "page" && k !== "per_page" && v !== undefined && v !== ""
  ).length;

  /* ── Form helpers ────────────────────────────────────────────────────────── */

  const openCreateForm = useCallback(() => {
    setEditingBooking(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((booking: BookingItem) => {
    setEditingBooking(booking);
    setForm({
      service: booking.service,
      contact_id: booking.contact_id ?? "",
      preferred_date: booking.preferred_date ?? "",
      preferred_time: booking.preferred_time ?? "",
      notes: booking.notes ?? "",
      source_channel: booking.source_channel ?? "",
    });
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(() => {
    if (!form.service.trim()) {
      toast({ variant: "destructive", description: "Service is required" });
      return;
    }

    if (editingBooking) {
      updateBooking.mutate({
        id: editingBooking.id,
        data: {
          service: form.service,
          ...(form.contact_id ? { contact_id: form.contact_id } : {}),
          ...(form.preferred_date ? { preferred_date: form.preferred_date } : {}),
          ...(form.preferred_time ? { preferred_time: form.preferred_time } : {}),
          ...(form.notes ? { notes: form.notes } : {}),
        },
      }, {
        onSuccess: () => {
          toast({ description: "Booking updated" });
          setFormOpen(false);
          setEditingBooking(null);
          void refetch();
        },
        onError: () => toast({ variant: "destructive", description: "Failed to update booking" }),
      });
    } else {
      createBooking.mutate(formToCreateRequest(form), {
        onSuccess: () => {
          toast({ description: "Booking created" });
          setFormOpen(false);
          void refetch();
        },
        onError: () => toast({ variant: "destructive", description: "Failed to create booking" }),
      });
    }
  }, [form, editingBooking, createBooking, updateBooking, toast, refetch]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    updateBooking.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ description: `Status updated to ${status}` });
        void refetch();
        if (detailBooking?.id === id) {
          setDetailBooking(prev => prev ? { ...prev, status } : null);
        }
      },
      onError: () => toast({ variant: "destructive", description: "Failed to update status" }),
    });
  }, [updateBooking, toast, refetch, detailBooking]);

  const handleDelete = useCallback(() => {
    if (!confirmDeleteId) return;
    deleteBooking.mutate(confirmDeleteId, {
      onSuccess: () => {
        toast({ description: "Booking deleted" });
        setConfirmDeleteId(null);
        if (detailBooking?.id === confirmDeleteId) setDetailBooking(null);
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to delete booking" }),
    });
  }, [confirmDeleteId, deleteBooking, toast, refetch, detailBooking]);

  /* ── Pagination ──────────────────────────────────────────────────────────── */

  const currentPage = filters.page || 1;
  const perPage = filters.per_page || 20;
  const totalCount = listData?.total ?? MOCK_BOOKINGS.length;
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
            Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Schedule and manage customer appointments across channels
          </p>
        </div>

        <Button
          size="sm"
          onClick={openCreateForm}
          className="gap-1.5 text-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          New Booking
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
          value={filters.status || "_all"}
          onValueChange={v => updateFilter("status", v === "_all" ? undefined : v)}
        >
          <SelectTrigger className="w-[140px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            {BOOKING_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                  {STATUS_META[s]?.label}
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
          <SelectTrigger className="w-[150px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Channels</SelectItem>
            {CHANNEL_KEYS.map(key => (
              <SelectItem key={key} value={key}>
                {CHANNEL_META[key].icon} {CHANNEL_META[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         TABLE
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* ── DESKTOP / TABLET TABLE (sm+) ───────────────────────────────────
             Progressive column disclosure:
             Always: Service | Status | Date | Actions
             sm+:    + Contact
             md+:    + Time
             lg+:    + Channel
             xl+:    + Notes
             ──────────────────────────────────────────────────────────────────── */}
        <table className="w-full hidden sm:table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Service</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Contact</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">Time</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">Channel</th>
              <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">Notes</th>
              <th className="w-10 p-3 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="p-3 pl-4"><Skeleton className="h-5 w-28" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-20" /></td>
                  <td className="p-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3 hidden xl:table-cell"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3 pr-4"><Skeleton className="h-4 w-4" /></td>
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <CalendarCheck size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No bookings found</p>
                    {activeFilterCount > 0 && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                        Clear filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : bookings.map(booking => (
              <tr
                key={booking.id}
                onClick={() => setDetailBooking(booking)}
                className="cursor-pointer transition-colors group hover:bg-muted/50"
              >
                {/* Service */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarCheck size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                        {booking.service}
                      </p>
                      {/* Show time inline on small screens where the Time column is hidden */}
                      <p className="text-[10px] text-muted-foreground md:hidden flex items-center gap-1 mt-0.5">
                        <Clock size={9} className="shrink-0" />
                        {formatTime(booking.preferred_time)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-muted-foreground/60 shrink-0" />
                    <span className="text-[12px] text-muted-foreground truncate max-w-[120px]">
                      {booking.contact_id ?? "Anonymous"}
                    </span>
                  </div>
                </td>

                {/* Date */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-muted-foreground/60 shrink-0" />
                    <span className="text-[12px] text-foreground font-mono">
                      {formatDate(booking.preferred_date)}
                    </span>
                  </div>
                </td>

                {/* Time — visible on md+ */}
                <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-muted-foreground/60 shrink-0" />
                    <span className="text-[12px] text-foreground font-mono">
                      {formatTime(booking.preferred_time)}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus:outline-none">
                        <StatusBadge status={booking.status} interactive />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[140px]">
                      {BOOKING_STATUSES.map(s => (
                        <DropdownMenuItem
                          key={s}
                          className="text-xs gap-2"
                          onClick={() => handleStatusChange(booking.id, s)}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s]?.dot)} />
                          {STATUS_META[s]?.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>

                {/* Channel — visible on lg+ */}
                <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap">
                  <ChannelPill channel={booking.source_channel} />
                </td>

                {/* Notes — visible on xl+ */}
                <td className="px-3 py-3 hidden xl:table-cell max-w-[220px]">
                  <p className="text-[12px] text-muted-foreground truncate">
                    {booking.notes || "--"}
                  </p>
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
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => setDetailBooking(booking)}>
                        <Eye size={13} /> View Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => openEditForm(booking)}>
                        <Edit size={13} /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs gap-2"
                        onClick={() => handleStatusChange(booking.id, "confirmed")}
                      >
                        <CheckCircle2 size={13} /> Confirm
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                        onClick={() => setConfirmDeleteId(booking.id)}
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
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <CalendarCheck size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No bookings found</p>
                {activeFilterCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          ) : bookings.map(booking => (
            <div
              key={booking.id}
              onClick={() => setDetailBooking(booking)}
              className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarCheck size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                      {booking.service}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {relativeTime(booking.created_at)}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(booking.preferred_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTime(booking.preferred_time)}
                    </span>
                  </div>

                  {/* Contact */}
                  <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                    <Users size={10} className="shrink-0" />
                    {booking.contact_id ?? "Anonymous"}
                  </p>

                  {/* Notes preview */}
                  {booking.notes && (
                    <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mb-2">
                      {booking.notes}
                    </p>
                  )}

                  {/* Tags row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={booking.status} />
                    <ChannelPill channel={booking.source_channel} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && bookings.length > 0 && (
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
         DETAIL DIALOG
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!detailBooking} onOpenChange={open => { if (!open) setDetailBooking(null); }}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden flex flex-col gap-0",
            "max-w-[640px] w-[95vw] max-h-[92vh] sm:max-h-[88vh]",
            "bg-card border rounded-2xl",
          )}
        >
          {detailBooking && (
            <>
              {/* ── Header ── */}
              <div className="shrink-0 p-5 sm:p-6 border-b space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarCheck size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-base sm:text-lg font-bold text-foreground leading-tight mb-1.5">
                      {detailBooking.service}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={detailBooking.status} />
                      <ChannelPill channel={detailBooking.source_channel} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-auto p-5 sm:p-6 space-y-5">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-1.5">
                      Date
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary/70" />
                      <span className="text-[13px] font-mono text-foreground">
                        {formatDate(detailBooking.preferred_date)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-1.5">
                      Time
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-primary/70" />
                      <span className="text-[13px] font-mono text-foreground">
                        {formatTime(detailBooking.preferred_time)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="rounded-lg border bg-muted/30 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                    Contact
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[12px]">
                      <Users size={13} className="text-muted-foreground/60 shrink-0" />
                      <span className="text-muted-foreground">
                        {detailBooking.contact_id ?? "Not specified"}
                      </span>
                    </div>
                    {detailBooking.conversation_id && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Search size={13} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-muted-foreground font-mono text-[11px]">
                          Conv: {detailBooking.conversation_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                    Notes
                  </p>
                  {detailBooking.notes ? (
                    <div className="rounded-lg border bg-muted/30 p-3.5">
                      <p className="text-[13px] text-foreground leading-relaxed">
                        {detailBooking.notes}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted-foreground/60 italic">No notes</p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 font-mono pt-2 border-t border-dashed">
                  <span>Created: {relativeTime(detailBooking.created_at)}</span>
                  {detailBooking.updated_at && (
                    <span>Updated: {relativeTime(detailBooking.updated_at)}</span>
                  )}
                </div>
              </div>

              {/* ── Footer Actions ── */}
              <div className="shrink-0 border-t p-4 sm:px-6 flex gap-2.5 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => {
                    openEditForm(detailBooking);
                    setDetailBooking(null);
                  }}
                  variant="outline"
                  className="gap-1.5 text-xs"
                >
                  <Edit size={13} /> Edit
                </Button>

                {detailBooking.status !== "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(detailBooking.id, "confirmed")}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    <CheckCircle2 size={13} /> Confirm
                  </Button>
                )}

                {detailBooking.status !== "completed" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(detailBooking.id, "completed")}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <CheckCircle2 size={13} /> Complete
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfirmDeleteId(detailBooking.id);
                  }}
                  className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 ml-auto"
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
      <Dialog open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditingBooking(null); } }}>
        <DialogContent className="max-w-[520px] w-[95vw] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">
              {editingBooking ? "Edit Booking" : "New Booking"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Service */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Service *
              </label>
              <Input
                placeholder="e.g. Product Demo, Onboarding Call"
                value={form.service}
                onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
                className="h-9 text-sm bg-card"
              />
            </div>

            {/* Contact ID */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Contact ID
              </label>
              <Input
                placeholder="Contact identifier"
                value={form.contact_id}
                onChange={e => setForm(p => ({ ...p, contact_id: e.target.value }))}
                className="h-9 text-sm bg-card"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={form.preferred_date}
                  onChange={e => setForm(p => ({ ...p, preferred_date: e.target.value }))}
                  className="h-9 w-full px-2.5 text-sm rounded-md border bg-card text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Preferred Time
                </label>
                <input
                  type="time"
                  value={form.preferred_time}
                  onChange={e => setForm(p => ({ ...p, preferred_time: e.target.value }))}
                  className="h-9 w-full px-2.5 text-sm rounded-md border bg-card text-foreground"
                />
              </div>
            </div>

            {/* Source Channel */}
            {!editingBooking && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Source Channel
                </label>
                <Select
                  value={form.source_channel || "_none"}
                  onValueChange={v => setForm(p => ({ ...p, source_channel: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger className="h-9 text-sm bg-card">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {CHANNEL_KEYS.map(key => (
                      <SelectItem key={key} value={key}>
                        {CHANNEL_META[key].icon} {CHANNEL_META[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Notes
              </label>
              <Textarea
                placeholder="Additional details about this booking..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="text-sm bg-card resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline" size="sm"
              onClick={() => { setFormOpen(false); setEditingBooking(null); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.service.trim() || createBooking.isPending || updateBooking.isPending}
              onClick={handleFormSubmit}
            >
              {(createBooking.isPending || updateBooking.isPending) ? "Saving..." : editingBooking ? "Save Changes" : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
         DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-[400px] bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base">Delete Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete this booking? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleteBooking.isPending}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBooking.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
