/**
 * Bookings Page — World-Class SaaS Implementation
 *
 * Matches Dashboard (KPI cards), Leads (table), and Conversations (patterns) exactly.
 * Elite mobile-first responsive design with world-class filters and tabs.
 * Follows STYLE_GUIDE.md specifications precisely.
 * Reference: NEXACHAT-BOOKINGS-SPEC.md for complete flow specification.
 */

import { useState, useCallback, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck, Search, Plus, Calendar, Clock,
  CheckCircle2, AlertCircle, X, MoreHorizontal,
  Eye, Trash2, Edit, ChevronLeft, ChevronRight,
  Download, FileText, LayoutList, CalendarDays,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Star, XCircle, Filter, SlidersHorizontal,
  Send, Bell, CalendarClock,
} from "lucide-react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, format, isSameDay, parseISO,
  isToday, isTomorrow, isPast, addHours,
} from "date-fns";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const STATUS_META: Record<string, { dot: string; badge: string; label: string; borderColor: string }> = {
  requested: { dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Requested", borderColor: "border-l-amber-500" },
  confirmed: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Confirmed", borderColor: "border-l-emerald-500" },
  completed: { dot: "bg-violet-400", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Completed", borderColor: "border-l-violet-500" },
  cancelled: { dot: "bg-rose-400", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "Cancelled", borderColor: "border-l-rose-500" },
  no_show: { dot: "bg-gray-400", badge: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "No-show", borderColor: "border-l-gray-500" },
};

// KPI cards matching Dashboard and Leads exactly
const KPI_CARDS = [
  {
    key: "today" as const,
    label: "Today's Bookings",
    icon: <CalendarClock className="h-4 w-4" />,
    accent: "from-primary/5 to-transparent",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    subtext: "Scheduled today",
    pulse: true,
  },
  {
    key: "requested" as const,
    label: "Awaiting Confirmation",
    icon: <AlertCircle className="h-4 w-4" />,
    accent: "from-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    filterStatus: "requested",
    subtext: "Needs action",
    pulse: true,
  },
  {
    key: "confirmed" as const,
    label: "Confirmed",
    icon: <CheckCircle2 className="h-4 w-4" />,
    accent: "from-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    filterStatus: "confirmed",
    subtext: "Ready to complete",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: <Star className="h-4 w-4" />,
    accent: "from-violet-500/5 to-transparent",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    filterStatus: "completed",
    subtext: "Revenue tracked",
    showRevenue: true,
  },
  {
    key: "cancelled" as const,
    label: "Cancelled",
    icon: <XCircle className="h-4 w-4" />,
    accent: "from-rose-500/5 to-transparent",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    filterStatus: "cancelled",
    subtext: "Cancellation rate",
  },
];

// View toggle tabs with responsive labels
const VIEW_TABS = [
  { id: "list" as const, label: "List View", shortLabel: "List", icon: LayoutList },
  { id: "calendar" as const, label: "Calendar View", shortLabel: "Calendar", icon: CalendarDays },
];

const ALL_CHANNELS = ["all", "web", "whatsapp", "instagram", "facebook", "email", "sms"] as const;

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
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = parseISO(dateStr);
    return format(d, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = parseISO(dateStr);
    return format(d, "EEE, MMM d");
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

function getBookingTimeBadge(booking: BookingItem): { badge: string; className: string } | null {
  if (!booking.booking_date) return null;
  const now = new Date();
  const bookingDate = parseISO(booking.booking_date);
  
  // Today badge
  if (isToday(bookingDate)) {
    // Check if within 2 hours
    if (booking.booking_time) {
      const [h, m] = booking.booking_time.split(":");
      const dt = new Date(bookingDate);
      dt.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      const diff = dt.getTime() - now.getTime();
      if (diff > 0 && diff <= 2 * 60 * 60 * 1000) {
        return { badge: "In 2h", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      }
    }
    return { badge: "Today", className: "bg-primary/10 text-primary border-primary/20" };
  }
  
  // Tomorrow badge
  if (isTomorrow(bookingDate)) {
    return { badge: "Tomorrow", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  }
  
  // Overdue badge (past + not confirmed/completed/cancelled)
  if (isPast(bookingDate) && booking.status === "requested") {
    return { badge: "Overdue", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  }
  
  return null;
}

function getReminderLabel(booking: BookingItem): string | null {
  if (booking.status !== "confirmed") return null;
  const hasReminder = Boolean(
    booking.reminder_manual_sent_at || booking.reminder_24h_sent_at || booking.reminder_2h_sent_at
  );
  return hasReminder ? "Reminder sent" : "No reminder";
}

function bookingDateKey(booking: BookingItem): string {
  if (!booking.booking_date) return "";
  try {
    return format(parseISO(booking.booking_date), "yyyy-MM-dd");
  } catch {
    return booking.booking_date as string;
  }
}

function buildMonthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function BookingAvatar({ name, size = "md" }: { name: string | null; size?: "sm" | "md" | "lg" }) {
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

function StatusBadge({ status, interactive, showDot = true }: { status: string; interactive?: boolean; showDot?: boolean }) {
  const meta = STATUS_META[status] ?? STATUS_META.requested;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
      "text-[11px] font-semibold font-heading tracking-wide transition-colors",
      meta.badge,
      interactive && "cursor-pointer hover:brightness-125",
      status === "requested" && "animate-pulse",
    )}>
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />}
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

function ServiceBadge({ service }: { service: string }) {
  return (
    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold font-heading bg-violet-500/10 text-violet-400 border-violet-500/20">
      {service}
    </span>
  );
}

function TimeBadge({ booking }: { booking: BookingItem }) {
  const badgeInfo = getBookingTimeBadge(booking);
  if (!badgeInfo) return null;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
      badgeInfo.className,
    )}>
      {badgeInfo.badge}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MOBILE FILTER BAR (World-class, matches Conversations/Leads mobile filters)
   ═══════════════════════════════════════════════════════════════════════════════ */

function MobileFilterBar({
  channelFilter,
  statusFilter,
  onChannelChange,
  onStatusChange,
  onClearAll,
  activeCount,
}: {
  channelFilter: string | undefined;
  statusFilter: string | undefined;
  onChannelChange: (channel: string | undefined) => void;
  onStatusChange: (status: string | undefined) => void;
  onClearAll: () => void;
  activeCount: number;
}) {
  return (
    <div className="space-y-2.5">
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
              {isAll ? "All Channels" : (
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
          All Status
        </button>
        {BOOKING_STATUSES.map(s => (
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
  booking_value: string;
  duration_minutes: string;
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
  booking_value: "",
  duration_minutes: "60",
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
    ...(form.booking_value ? { booking_value: parseFloat(form.booking_value) } : {}),
    ...(form.duration_minutes ? { duration_minutes: parseInt(form.duration_minutes, 10) } : {}),
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
  const [form, setForm] = useState<BookingFormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
  const stats = statsData ?? { total: 0, requested: 0, confirmed: 0, completed: 0, cancelled: 0, today: 0, revenue: 0 };

  useEffect(() => {
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
    setFilters({ page: 1, per_page: 20, sort: "date_desc" });
  }, []);

  const handleStatClick = useCallback((key: string) => {
    if (key === "today") {
      // Filter to today's date
      const today = format(new Date(), "yyyy-MM-dd");
      setFilters(prev => ({ ...prev, page: 1, start_date: today, end_date: today }));
    } else if (key === "total") {
      clearFilters();
    } else {
      setFilters({ page: 1, per_page: filters.per_page ?? 20, sort: "date_desc", status: key });
    }
  }, [filters.per_page, clearFilters]);

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
      booking_value: booking.booking_value != null ? String(booking.booking_value) : "",
      duration_minutes: booking.duration_minutes ? String(booking.duration_minutes) : "60",
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
          ...(form.booking_value ? { booking_value: parseFloat(form.booking_value) } : {}),
          ...(form.duration_minutes ? { duration_minutes: parseInt(form.duration_minutes, 10) } : {}),
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

      {/* ─── Page Header (STYLE_GUIDE.md section 9) ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
              Bookings
            </h1>
            {stats.today > 0 && (
              <span className="rounded-full bg-primary/15 text-primary text-xs font-semibold px-2.5 py-0.5">
                {stats.today} today
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Schedule and manage customer appointments across channels
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle (STYLE_GUIDE.md section 14) */}
          <div className="flex rounded-lg border bg-card overflow-hidden">
            {VIEW_TABS.map((tab, i) => (
              <Fragment key={tab.id}>
                {i > 0 && <div className="w-px bg-border" />}
                <button
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold font-heading transition-all",
                    view === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  )}
                >
                  <tab.icon className="h-[13px] w-[13px]" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              </Fragment>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="gap-1.5 h-9 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={openCreateForm}
            className="gap-1.5 h-9 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Booking</span>
          </Button>
        </div>
      </div>

      {/* ─── KPI Stats Grid (STYLE_GUIDE.md section 11) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {KPI_CARDS.map((card, i) => {
          const value = stats[card.key] ?? 0;
          const filterActive = card.filterStatus && filters.status === card.filterStatus;

          return (
            <button
              key={card.key}
              onClick={() => handleStatClick(card.key)}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 text-left",
                "transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group",
                "cursor-pointer",
                filterActive && "border-primary/30 bg-primary/5",
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Gradient accent on hover */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                card.accent,
              )} />

              <div className="relative">
                {/* Icon box with colored background (Dashboard pattern) */}
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center mb-2",
                  card.iconBg,
                )}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>

                {/* Label */}
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
                  {card.label}
                </p>

                {/* Value + Trend */}
                <div className="flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
                    {value.toLocaleString()}
                  </p>
                  {card.pulse && value > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  )}
                </div>

                {/* Subtext with revenue if applicable */}
                <p className="text-[10px] mt-1.5 font-description text-muted-foreground">
                  {card.showRevenue && stats.revenue > 0 
                    ? `KSh ${stats.revenue.toLocaleString()} revenue`
                    : card.subtext
                  }
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Filter Bar (STYLE_GUIDE.md section 10) ────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Desktop filters */}
        <div className="hidden lg:flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search bookings..."
              value={filters.search || ""}
              onChange={e => updateFilter("search", e.target.value || undefined)}
              className="h-9 pl-8 text-xs"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter("search", undefined)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select
            value={filters.status || "_all"}
            onValueChange={v => updateFilter("status", v === "_all" ? undefined : v)}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Status</SelectItem>
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
            <SelectTrigger className="w-[140px] h-9 text-xs">
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
            <SelectTrigger className="w-[160px] h-9 text-xs">
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

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button variant="link" size="sm" onClick={clearFilters} className="text-primary text-xs">
              Clear filters
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort dropdown */}
          <Select
            value={filters.sort || "date_desc"}
            onValueChange={v => updateFilter("sort", v)}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date (newest)</SelectItem>
              <SelectItem value="date_asc">Date (oldest)</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          {/* Export button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Export</span>
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
                Export Calendar (ICS)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile/Tablet filter controls */}
        <div className="lg:hidden flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search bookings..."
              value={filters.search || ""}
              onChange={e => updateFilter("search", e.target.value || undefined)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Filter button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen(true)}
            className={cn(
              "gap-1.5 h-9 text-xs shrink-0",
              activeFilterCount > 0 && "border-primary/30 text-primary",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 h-4 min-w-[16px] rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center px-1">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="font-heading text-base">Filters</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <MobileFilterBar
                channelFilter={filters.channel}
                statusFilter={filters.status}
                onChannelChange={v => updateFilter("channel", v)}
                onStatusChange={v => updateFilter("status", v)}
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

      {/* ─── Bulk Action Bar ────────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card">
          <div className="text-sm font-medium text-foreground">
            {selectedCount} booking{selectedCount > 1 ? "s" : ""} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleBulkAction("confirm")}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleBulkAction("complete")}>
              <Star className="h-3.5 w-3.5" />
              Complete
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => handleBulkAction("cancel")}>
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         CALENDAR VIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      {view === "calendar" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="h-7 text-xs"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="h-7 w-7"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h2>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Download className="h-3 w-3" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    const blob = await bookingsApi.exportCsv({ start_date: calendarStart, end_date: calendarEnd });
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

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 border-b bg-muted/20">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground border-r last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {buildMonthGrid(currentMonth).map((day, idx) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayBookings = (calendarData?.bookings ?? []).filter(b => bookingDateKey(b) === dayKey);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isCurrentDay = isToday(day);
              
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => {
                    if (dayBookings.length === 1) {
                      navigate(`/dashboard/bookings/${dayBookings[0].id}`);
                    } else if (dayBookings.length === 0) {
                      // Open create form with date pre-filled
                      setForm(prev => ({ ...prev, booking_date: dayKey }));
                      openCreateForm();
                    }
                  }}
                  className={cn(
                    "min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 text-left transition-colors border-r border-b",
                    "last:border-r-0",
                    !isCurrentMonth && "bg-muted/5 opacity-40",
                    isCurrentDay && "bg-primary/5",
                    "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-semibold",
                      isCurrentDay 
                        ? "h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center" 
                        : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map(b => (
                      <div
                        key={b.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold truncate cursor-pointer",
                          "border-l-2 transition-colors hover:brightness-110",
                          b.status === 'requested' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500',
                          b.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500',
                          b.status === 'completed' && 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500',
                          b.status === 'cancelled' && 'bg-gray-500/10 text-gray-500 border-gray-400 line-through',
                        )}
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/dashboard/bookings/${b.id}`);
                        }}
                      >
                        <span className="hidden sm:inline">{formatTime(b.booking_time)} </span>
                        {b.service}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[9px] text-muted-foreground font-medium px-1.5">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
         LIST VIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      {view === "list" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* ── DESKTOP TABLE (sm+) ─────────────────────────────────────────── */}
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 p-3 pl-4">
                  <Checkbox
                    checked={bookings.length > 0 && selectedCount === bookings.length}
                    onCheckedChange={checked => {
                      if (checked) selectAllOnPage();
                      else clearSelection();
                    }}
                    aria-label="Select all bookings"
                  />
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date & Time</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Contact</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">Service</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">Channel</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">Value</th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden 2xl:table-cell">Created</th>
                <th className="w-10 p-3 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3 pl-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="p-3"><Skeleton className="h-10 w-full" /></td>
                    <td className="p-3"><Skeleton className="h-10 w-full" /></td>
                    <td className="p-3 hidden lg:table-cell"><Skeleton className="h-6 w-24" /></td>
                    <td className="p-3 hidden xl:table-cell"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="p-3 hidden xl:table-cell"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3 hidden 2xl:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3 pr-4"><Skeleton className="h-4 w-4" /></td>
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">No bookings found</p>
                      <p className="text-xs text-muted-foreground/60">Try adjusting your filters or search terms.</p>
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
                    "border-l-4",
                    STATUS_META[booking.status]?.borderColor || "border-l-transparent",
                    booking.status === "requested" && isPast(parseISO(booking.booking_date || "")) && "bg-rose-500/5",
                  )}
                >
                  {/* Checkbox */}
                  <td className="p-3 pl-4" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(booking.id)}
                      onCheckedChange={() => toggleSelect(booking.id)}
                      aria-label={`Select booking ${booking.id}`}
                    />
                  </td>

                  {/* Date & Time */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-[13px] text-foreground">
                          {formatShortDate(booking.booking_date)}
                        </span>
                        <TimeBadge booking={booking} />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTime(booking.booking_time)}
                        {booking.duration_minutes && ` · ${booking.duration_minutes}min`}
                      </span>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <BookingAvatar name={booking.contact?.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-heading font-semibold text-[12px] text-foreground truncate max-w-[140px]">
                          {booking.contact?.full_name ?? "Anonymous"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {booking.contact?.email || booking.contact?.phone || "No contact info"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Service - hidden below lg */}
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <ServiceBadge service={booking.service} />
                    {booking.service_details && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[160px] mt-0.5">
                        {booking.service_details}
                      </p>
                    )}
                  </td>

                  {/* Channel - hidden below xl */}
                  <td className="px-3 py-3 hidden xl:table-cell">
                    <ChannelPill channel={booking.source_channel} />
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col gap-0.5">
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
                      {getReminderLabel(booking) && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <Bell className="h-2.5 w-2.5" />
                          {getReminderLabel(booking)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Value - hidden below xl */}
                  <td className="px-3 py-3 hidden xl:table-cell" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="text-[12px] font-semibold font-mono text-emerald-500 hover:text-emerald-400 transition-colors"
                      onClick={() => handleValueEdit(booking)}
                    >
                      {booking.booking_value != null ? `KSh ${booking.booking_value.toLocaleString()}` : "—"}
                    </button>
                  </td>

                  {/* Created - hidden below 2xl */}
                  <td className="px-3 py-3 hidden 2xl:table-cell">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {relativeTime(booking.created_at)}
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
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px]">
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}>
                          <Eye className="h-3.5 w-3.5" /> View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => openEditForm(booking)}>
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        {booking.status === "requested" && (
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => handleStatusChange(booking.id, "confirmed")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </DropdownMenuItem>
                        )}
                        {booking.status === "confirmed" && (
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => handleStatusChange(booking.id, "completed")}>
                            <Star className="h-3.5 w-3.5" /> Mark Complete
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                          onClick={() => setConfirmDeleteId(booking.id)}
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
                    <CalendarCheck className="h-5 w-5 text-muted-foreground" />
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
                  className={cn(
                    "p-3 active:bg-muted/50 transition-colors cursor-pointer",
                    "border-l-4",
                    STATUS_META[booking.status]?.borderColor || "border-l-transparent",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedIds.has(booking.id)}
                        onCheckedChange={() => toggleSelect(booking.id)}
                        aria-label={`Select booking ${booking.id}`}
                        onClick={e => e.stopPropagation()}
                        className="mt-1"
                      />
                      <BookingAvatar name={booking.contact?.full_name} size="sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-heading font-semibold text-[13px] text-foreground truncate">
                          {booking.service}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {relativeTime(booking.created_at)}
                        </span>
                      </div>

                      {/* Contact name */}
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        {booking.contact?.full_name ?? "Anonymous"}
                      </p>

                      {/* Date & Time row */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatShortDate(booking.booking_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(booking.booking_time)}
                        </span>
                        <TimeBadge booking={booking} />
                      </div>

                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={booking.status} />
                        <ChannelPill channel={booking.source_channel} />
                        {booking.booking_value != null && (
                          <span className="text-[10px] font-semibold font-mono text-emerald-500">
                            KSh {booking.booking_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Pagination ────────────────────────────────────────────────────── */}
          {!isLoading && bookings.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-[11px] text-muted-foreground font-mono">
                Showing {fromIdx}-{toIdx} of {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setFilters(p => ({ ...p, page: (p.page || 1) - 1 }))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setFilters(p => ({ ...p, page: (p.page || 1) + 1 }))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
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
        <SheetContent side="right" className="w-[480px] max-w-[95vw] p-0 overflow-y-auto">
          <SheetHeader className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b z-10">
            <SheetTitle className="font-heading text-base font-semibold">
              {editingBooking ? "Edit Booking" : "New Booking"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 p-4">
            {/* Service */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
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
                className="h-9 w-full rounded-md border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <datalist id="booking-services">
                {servicesData?.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            {/* Contact ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Contact ID
              </label>
              <Input
                placeholder="Contact identifier"
                value={form.contact_id}
                onChange={e => setForm(p => ({ ...p, contact_id: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.booking_date}
                  onChange={e => setForm(p => ({ ...p, booking_date: e.target.value }))}
                  className="h-9 w-full px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Time *
                </label>
                <input
                  type="time"
                  value={form.booking_time}
                  onChange={e => setForm(p => ({ ...p, booking_time: e.target.value }))}
                  className="h-9 w-full px-3 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Duration & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Duration (min)
                </label>
                <Select
                  value={form.duration_minutes || "60"}
                  onValueChange={v => setForm(p => ({ ...p, duration_minutes: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Value (KSh)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.booking_value}
                  onChange={e => setForm(p => ({ ...p, booking_value: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Source Channel */}
            {!editingBooking && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Source Channel
                </label>
                <Select
                  value={form.source_channel || "_none"}
                  onValueChange={v => setForm(p => ({ ...p, source_channel: v === "_none" ? "" : v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Manual Entry</SelectItem>
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

            {/* Special Requests */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Special Requests
              </label>
              <Textarea
                placeholder="Any special requirements from the customer..."
                value={form.special_requests}
                onChange={e => setForm(p => ({ ...p, special_requests: e.target.value }))}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Internal Notes
              </label>
              <Textarea
                placeholder="Additional notes (internal only)..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-2 p-4 border-t bg-card/95 backdrop-blur-sm">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => { setFormOpen(false); setEditingBooking(null); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs gap-1.5"
              disabled={!form.service.trim() || createBooking.isPending || updateBooking.isPending}
              onClick={handleFormSubmit}
            >
              {(createBooking.isPending || updateBooking.isPending) ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : editingBooking ? "Save Changes" : "Create Booking"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════════
         DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-semibold">Delete Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete this booking? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 text-xs"
              variant="destructive"
              disabled={deleteBooking.isPending}
              onClick={handleDelete}
            >
              {deleteBooking.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
