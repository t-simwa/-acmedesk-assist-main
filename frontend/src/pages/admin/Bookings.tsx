import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck, Search, Plus, Calendar, Clock,
  CheckCircle2, AlertCircle, X, MoreHorizontal,
  Eye, Trash2, Edit, ChevronLeft, ChevronRight,
  Users, FileText,
} from "lucide-react";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO } from "date-fns";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useBookingsList, useBookingStats,
  useCreateBooking, useUpdateBooking, useDeleteBooking,
  useBulkBookingsAction, useBookingsCalendar,
  useBookingRealtime,
} from "@/hooks/useBookings";
import {
  bookingsApi,
  type BookingItem, type BookingListFilters, type BookingCreateRequest,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon, CHANNEL_KEYS } from "@/lib/channelMeta";


/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS & STYLE MAPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const BOOKING_STATUSES = ["requested", "confirmed", "completed", "cancelled", "no_show"] as const;

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  requested: { dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Requested" },
  confirmed: { dot: "bg-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Confirmed" },
  completed: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Completed" },
  cancelled: { dot: "bg-red-400", badge: "bg-red-500/10 text-red-400 border-red-500/20", label: "Cancelled" },
  no_show: { dot: "bg-gray-400", badge: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "No-show" },
};

const STAT_CARDS: { key: "total" | "requested" | "confirmed" | "completed" | "cancelled"; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: "total",     label: "Total",     icon: <CalendarCheck size={18} />, accent: "from-blue-500/20 to-blue-500/0" },
  { key: "requested", label: "Requested", icon: <AlertCircle size={18} />,   accent: "from-amber-500/20 to-amber-500/0" },
  { key: "confirmed", label: "Confirmed", icon: <CheckCircle2 size={18} />,  accent: "from-blue-500/20 to-blue-500/0" },
  { key: "completed", label: "Completed", icon: <FileText size={18} />,      accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "cancelled", label: "Cancelled", icon: <X size={18} />,             accent: "from-red-500/20 to-red-500/0" },
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

function getBookingDateStatus(booking: BookingItem): { badge?: string; className?: string } {
  if (!booking.booking_date) return {};
  const now = new Date();
  const bookingDate = parseISO(booking.booking_date);
  const isToday = isSameDay(bookingDate, now);
  const isPast = bookingDate < now;

  // Overdue if past and not confirmed/completed/cancelled
  const isOverdue = isPast && booking.status === "requested";

  // In 2 hours if booking is today and within 2 hours of now
  const inTwoHours = isToday && booking.booking_time;
  let isIn2h = false;
  if (inTwoHours) {
    const [h, m] = booking.booking_time.split(":");
    const dt = new Date(bookingDate);
    dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    const diff = dt.getTime() - now.getTime();
    isIn2h = diff > 0 && diff <= 2 * 60 * 60 * 1000;
  }

  if (isOverdue) return { badge: "Overdue", className: "bg-red-50" };
  if (isIn2h) return { badge: "In 2h", className: "bg-amber-50" };
  if (isToday) return { badge: "Today", className: "bg-blue-50" };
  return {};
}

function getReminderLabel(booking: BookingItem): string | null {
  if (booking.status !== "confirmed") return null;
  const hasReminder = Boolean(
    booking.reminder_manual_sent_at || booking.reminder_24h_sent_at || booking.reminder_2h_sent_at
  );
  return hasReminder ? "Reminder sent ✓" : "No reminder";
}

function getStatusBorder(status: string) {
  switch (status) {
    case "requested":
      return "border-l-4 border-amber-500";
    case "confirmed":
      return "border-l-4 border-emerald-500";
    case "completed":
      return "border-l-4 border-violet-500";
    case "cancelled":
      return "border-l-4 border-rose-500";
    default:
      return "";
  }
}

function bookingDateKey(booking: BookingItem): string {
  if (!booking.booking_date) return "";
  try {
    const d = typeof booking.booking_date === "string" ? new Date(booking.booking_date) : new Date(booking.booking_date as any);
    return format(d, "yyyy-MM-dd");
  } catch {
    return booking.booking_date as string;
  }
}

function buildMonthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
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
      status === "requested" && "animate-pulse",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
   FORM STATE INTERFACE
   ═══════════════════════════════════════════════════════════════════════════════ */

interface BookingFormState {
  service_id?: string;
  service: string;
  contact_id: string;
  booking_date: string;
  booking_time: string;
  special_requests: string;
  notes: string;
  source_channel: string;
}

const EMPTY_FORM: BookingFormState = {
  service_id: undefined,
  service: "",
  contact_id: "",
  booking_date: "",
  booking_time: "",
  special_requests: "",
  notes: "",
  source_channel: "",
};

function formToCreateRequest(form: BookingFormState): BookingCreateRequest {
  return {
    service: form.service,
    ...(form.service_id ? { service_id: form.service_id } : {}),
    ...(form.contact_id ? { contact_id: form.contact_id } : {}),
    ...(form.booking_date ? { booking_date: form.booking_date } : {}),
    ...(form.booking_time ? { booking_time: form.booking_time } : {}),
    ...(form.special_requests ? { special_requests: form.special_requests } : {}),
    ...(form.notes ? { notes: form.notes } : {}),
    ...(form.source_channel ? { source_channel: form.source_channel } : {}),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Bookings() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BookingListFilters>({ page: 1, per_page: 20, sort: "date_desc" });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null);
  const [form, setForm] = useState<BookingFormState>({
    ...EMPTY_FORM,
    special_requests: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;

  const { data: listData, isLoading, refetch } = useBookingsList(filters);
  const calendarStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const calendarEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
  const { data: calendarData, isLoading: isCalendarLoading } = useBookingsCalendar({
    start_date: calendarStart,
    end_date: calendarEnd,
  });

  const { data: statsData } = useBookingStats();
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => bookingsApi.listServices(),
    staleTime: 60_000,
    retry: 1,
  });
  useBookingRealtime();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const bulkAction = useBulkBookingsAction();
  const { toast } = useToast();

  const bookings = listData?.bookings ?? [];
  const stats = statsData ?? { total: 0, requested: 0, confirmed: 0, completed: 0, cancelled: 0 };

  useEffect(() => {
    // Keep selection bounded to the current page of bookings
    setSelectedIds(prev => {
      const next = new Set<string>();
      const ids = bookings.map(b => b.id);
      prev.forEach(id => {
        if (ids.includes(id)) next.add(id);
      });
      return next;
    });
  }, [bookings]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds(new Set(bookings.map(b => b.id)));
  }, [bookings]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback(async (action: "confirm" | "cancel" | "complete") => {
    if (selectedIds.size === 0) return;
    try {
      await bulkAction.mutateAsync({ booking_ids: Array.from(selectedIds), action });
      toast({ description: `Bulk action applied (${action})` });
      clearSelection();
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Bulk action failed" });
    }
  }, [bulkAction, clearSelection, refetch, selectedIds, toast]);

  const totalPages = Math.ceil((listData?.total ?? 0) / (filters.per_page ?? 20));

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

  const handleStatClick = useCallback((key: string) => {
    if (key === "total") {
      setFilters({ page: 1, per_page: filters.per_page ?? 20 });
    } else {
      setFilters({ page: 1, per_page: filters.per_page ?? 20, status: key });
    }
  }, [filters.per_page]);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "page" && k !== "per_page" && k !== "sort" && v !== undefined && v !== ""
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
      service_id: booking.service_id ?? undefined,
      service: booking.service,
      contact_id: booking.contact_id ?? "",
      booking_date: booking.booking_date ?? "",
      booking_time: booking.booking_time ?? "",
      notes: booking.notes ?? "",
      special_requests: booking.special_requests ?? "",
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
          ...(form.service_id ? { service_id: form.service_id } : {}),
          ...(form.contact_id ? { contact_id: form.contact_id } : {}),
          ...(form.booking_date ? { booking_date: form.booking_date } : {}),
          ...(form.booking_time ? { booking_time: form.booking_time } : {}),
          ...(form.notes ? { notes: form.notes } : {}),
          ...(form.special_requests ? { special_requests: form.special_requests } : {}),
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

  const handleValueEdit = useCallback((booking: BookingItem) => {
    const currentValue = booking.booking_value ?? 0;
    const input = window.prompt("Enter booking value (number)", String(currentValue));
    if (input == null) return;
    const parsed = parseFloat(input);
    if (Number.isNaN(parsed)) {
      toast({ variant: "destructive", description: "Value must be a number" });
      return;
    }
    updateBooking.mutate({ id: booking.id, data: { booking_value: parsed } }, {
      onSuccess: () => {
        toast({ description: "Booking value updated" });
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to update value" }),
    });
  }, [updateBooking, toast, refetch]);

  const handleStatusChange = useCallback((id: string, status: string) => {
    updateBooking.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ description: `Status updated to ${status}` });
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to update status" }),
    });
  }, [updateBooking, toast, refetch]);

  const handleDelete = useCallback(() => {
    if (!confirmDeleteId) return;
    deleteBooking.mutate(confirmDeleteId, {
      onSuccess: () => {
        toast({ description: "Booking deleted" });
        setConfirmDeleteId(null);
        void refetch();
      },
      onError: () => toast({ variant: "destructive", description: "Failed to delete booking" }),
    });
  }, [confirmDeleteId, deleteBooking, toast, refetch]);

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
      <div className="sticky top-0 z-30 bg-background/70 backdrop-blur border-b border-muted/20 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
                Bookings
              </h1>
              {stats.today !== undefined && stats.today > 0 ? (
                <span className="rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold px-3 py-1">
                  {stats.today} today
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-description">
              Schedule and manage customer appointments across channels
            </p>
          </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-muted/30 bg-card p-1">
            <Button
              size="sm"
              variant={view === "list" ? "default" : "outline"}
              className="rounded-full px-3 text-xs"
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              size="sm"
              variant={view === "calendar" ? "default" : "outline"}
              className="rounded-full px-3 text-xs"
              onClick={() => setView("calendar")}
            >
              Calendar
            </Button>
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
      </div>
      </div>

      {/* ─── Stats Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map((card, i) => {
          const active = card.key !== "total" ? filters.status === card.key : !filters.status;
          return (
            <div
              key={card.key}
              onClick={() => handleStatClick(card.key)}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
                "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
                active && "border-primary/50 shadow-soft",
                "cursor-pointer"
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
          );
        })}
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <Input
          placeholder="Search bookings..."
          value={filters.search || ""}
          onChange={e => updateFilter("search", e.target.value)}
          className="h-9 w-[260px] text-xs bg-card"
        />

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
                <span className="inline-flex items-center gap-2">
                  <ChannelIcon channel={key} size={12} />
                  {CHANNEL_META[key].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Service filter */}
        <Select
          value={filters.service_id || "_all"}
          onValueChange={v => updateFilter("service_id", v === "_all" ? undefined : v)}
        >
          <SelectTrigger className="w-[200px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Services</SelectItem>
            {servicesData?.map(service => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
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

        {/* Sort */}
        <Select
          value={filters.sort || "date_desc"}
          onValueChange={v => updateFilter("sort", v)}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs bg-card">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Date newest</SelectItem>
            <SelectItem value="date_asc">Date oldest</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card">
          <div className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("confirm")}>Confirm</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("complete")}>Complete</Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction("cancel")}>Cancel</Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          </div>
        </div>
      )}

      {view === "calendar" ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="h-9 w-9"
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="text-sm font-semibold text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="h-9 w-9"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    const blob = await bookingsApi.exportCsv({ start_date: calendarStart, end_date: calendarEnd, status: filters.status, service_id: filters.service_id });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "bookings.csv";
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const blob = await bookingsApi.exportIcs({ start_date: calendarStart, end_date: calendarEnd });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "bookings.ics";
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export ICS
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-7 gap-px bg-muted/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
            {buildMonthGrid(currentMonth).map(day => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayBookings = (calendarData?.bookings ?? []).filter(b => bookingDateKey(b) === dayKey);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => {
                    if (dayBookings.length === 1) {
                      navigate(`/dashboard/bookings/${dayBookings[0].id}`);
                    }
                  }}
                  className={cn(
                    "min-h-[100px] p-2 text-left transition-colors",
                    !isCurrentMonth && "opacity-40",
                    isSameDay(day, new Date()) && "bg-primary/10",
                    "hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{format(day, "d")}</span>
                    {isSameDay(day, new Date()) && (
                      <span className="text-[10px] text-primary font-semibold">Today</span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayBookings.slice(0, 3).map(b => (
                      <div
                        key={b.id}
                        className={cn(
                          "rounded-xl px-2 py-1 text-[10px] font-semibold truncate",
                          b.status === 'requested' && 'bg-amber-200/60 text-amber-700 border-l-2 border-amber-500',
                          b.status === 'confirmed' && 'bg-emerald-200/60 text-emerald-700 border-l-2 border-emerald-500',
                          b.status === 'completed' && 'bg-violet-200/60 text-violet-700 border-l-2 border-violet-500',
                          b.status === 'cancelled' && 'bg-gray-200/60 text-gray-600 border-l-2 border-gray-400 line-through',
                        )}
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/dashboard/bookings/${b.id}`);
                        }}
                      >
                        {formatTime(b.booking_time)} {b.service}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayBookings.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3">
                  <Checkbox
                    checked={bookings.length > 0 && selectedCount === bookings.length}
                    onCheckedChange={checked => {
                      if (checked) selectAllOnPage();
                      else clearSelection();
                    }}
                    aria-label="Select all bookings"
                  />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Service</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Contact</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden md:table-cell">Time</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">Value</th>
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
                  onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                  className={cn(
                    "cursor-pointer transition-colors group hover:bg-muted/50",
                    getStatusBorder(booking.status)
                  )}
                >
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(booking.id)}
                      onCheckedChange={() => toggleSelect(booking.id)}
                      aria-label={`Select booking ${booking.id}`}
                    />
                  </td>
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
                        {(booking.service_obj?.duration_minutes || booking.service_details) ? (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {booking.service_obj?.duration_minutes ? `${booking.service_obj.duration_minutes} min` : booking.service_details}
                          </p>
                        ) : null}
                        {/* Show time inline on small screens where the Time column is hidden */}
                        <p className="text-[10px] text-muted-foreground md:hidden flex items-center gap-1 mt-0.5">
                          <Clock size={9} className="shrink-0" />
                          {formatTime(booking.booking_time)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/20 text-[11px] font-semibold text-foreground">
                        {getInitials(booking.contact?.full_name ?? booking.contact_id)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate max-w-[160px]">
                          {booking.contact?.full_name ?? booking.contact_id ?? "Anonymous"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                          {booking.contact?.email || booking.contact?.phone || "No contact info"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-muted-foreground/60 shrink-0" />
                      <span className="text-[12px] text-foreground font-mono">
                        {formatDate(booking.booking_date)}
                      </span>
                      {(() => {
                        const status = getBookingDateStatus(booking);
                        return status.badge ? (
                          <span
                            className={cn(
                              "ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              status.className || "bg-muted/30 text-muted-foreground"
                            )}
                          >
                            {status.badge}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </td>

                  {/* Time — visible on md+ */}
                  <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-muted-foreground/60 shrink-0" />
                      <span className="text-[12px] text-foreground font-mono">
                        {formatTime(booking.booking_time)}
                      </span>
                    </div>
                  </td>

                  {/* Value — editable */}
                  <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-foreground hover:text-primary"
                      onClick={() => handleValueEdit(booking)}
                    >
                      {booking.booking_value != null ? `KSh ${booking.booking_value.toLocaleString()}` : "—"}
                    </button>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
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
                      {getReminderLabel(booking) ? (
                        <span className="text-[10px] text-muted-foreground">
                          {getReminderLabel(booking)}
                        </span>
                      ) : null}
                    </div>
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
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}>
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
            ) : (
              bookings.map(booking => (
                <div
                  key={booking.id}
                  onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                  className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedIds.has(booking.id)}
                        onCheckedChange={() => toggleSelect(booking.id)}
                        aria-label={`Select booking ${booking.id}`}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarCheck size={16} className="text-primary" />
                      </div>
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
                          {formatDate(booking.booking_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(booking.booking_time)}
                        </span>
                      </div>

                      {/* Contact */}
                      <p className="text-[11px] text-muted-foreground mb-2">
                        <span className="font-semibold text-foreground">
                          {booking.contact?.full_name ?? booking.contact_id ?? "Anonymous"}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {booking.contact?.email || booking.contact?.phone || "No contact info"}
                        </span>
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
              ))
            )}
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         CREATE / EDIT DRAWER
         ═══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={formOpen} onOpenChange={open => { if (!open) { setFormOpen(false); setEditingBooking(null); } }}>
        <SheetContent side="right" className="w-[520px] max-w-[95vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-heading text-base">
              {editingBooking ? "Edit Booking" : "New Booking"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 p-4">
            {/* Service */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Service *
              </label>
              <input
                list="booking-services"
                placeholder="Select or type a service"
                value={form.service}
                onChange={e => {
                  const value = e.target.value;
                  const match = servicesData?.find(s => s.name === value);
                  setForm(p => ({ ...p, service: value, service_id: match?.id }));
                }}
                className="h-9 w-full rounded-md border bg-card px-3 text-sm text-foreground"
              />
              <datalist id="booking-services">
                {servicesData?.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
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
                  Date
                </label>
                <input
                  type="date"
                  value={form.booking_date}
                  onChange={e => setForm(p => ({ ...p, booking_date: e.target.value }))}
                  className="h-9 w-full px-2.5 text-sm rounded-md border bg-card text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Time
                </label>
                <input
                  type="time"
                  value={form.booking_time}
                  onChange={e => setForm(p => ({ ...p, booking_time: e.target.value }))}
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
                        <span className="inline-flex items-center gap-2">
                          <ChannelIcon channel={key} size={12} />
                          {CHANNEL_META[key].label}
                        </span>
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

            {/* Special requests */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Special Requests
              </label>
              <Textarea
                placeholder="Anything special the customer asked for..."
                value={form.special_requests ?? ""}
                onChange={e => setForm(p => ({ ...p, special_requests: e.target.value }))}
                rows={2}
                className="text-sm bg-card resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t">
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
          </div>
        </SheetContent>
      </Sheet>

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
