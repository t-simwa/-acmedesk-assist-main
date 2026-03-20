/**
 * Booking Detail Page — World-Class SaaS Implementation
 *
 * Full detail view for a single booking with timeline, notes, and actions.
 * Matches STYLE_GUIDE.md specifications precisely.
 * Reference: NEXACHAT-BOOKINGS-SPEC.md Part 6.
 */

import { useMemo, useState, useCallback, Fragment } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Calendar, Clock, CheckCircle2,
  MapPin, Send, Bell, Star,
  MessageSquare,
  AlertCircle, XCircle, UserX, HourglassIcon, CalendarCheck,
  Phone, Mail, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useBookingDetail, useBookingActivity, useBookingNotes, useBookingRealtime,
  useConfirmBooking, useCancelBooking, useCompleteBooking, useRescheduleBooking,
  useCreateBookingNote, useSendReminder,
} from "@/hooks/useBookings";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";
import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = parseISO(dateStr);
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = parseISO(dateStr);
    return format(d, "EEE, MMM d");
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr?: string | null) {
  if (!timeStr) return "—";
  try {
    const parts = timeStr.split(":");
    const h: string = parts[0] ?? "0";
    const m: string = parts[1] ?? "00";
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return "—";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return format(new Date(isoDate), "MMM d");
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STATUS STYLING
   ═══════════════════════════════════════════════════════════════════════════════ */

const STATUS_META: Record<string, { 
  dot: string; 
  badge: string; 
  label: string; 
  icon: React.ReactNode;
  bgColor: string;
}> = {
  requested: { 
    dot: "bg-amber-400", 
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", 
    label: "Requested",
    icon: <HourglassIcon className="h-6 w-6" />,
    bgColor: "bg-amber-500/10",
  },
  confirmed: { 
    dot: "bg-emerald-400", 
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", 
    label: "Confirmed",
    icon: <CalendarCheck className="h-6 w-6" />,
    bgColor: "bg-emerald-500/10",
  },
  completed: { 
    dot: "bg-violet-400", 
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", 
    label: "Completed",
    icon: <CheckCircle2 className="h-6 w-6" />,
    bgColor: "bg-violet-500/10",
  },
  cancelled: { 
    dot: "bg-rose-400", 
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/20", 
    label: "Cancelled",
    icon: <XCircle className="h-6 w-6" />,
    bgColor: "bg-rose-500/10",
  },
  no_show: { 
    dot: "bg-gray-400", 
    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20", 
    label: "No-show",
    icon: <UserX className="h-6 w-6" />,
    bgColor: "bg-gray-500/10",
  },
};

const STATUS_PIPELINE = ["requested", "confirmed", "completed"] as const;

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function BookingAvatar({ name, size = "lg" }: { name: string | null | undefined; size?: "sm" | "md" | "lg" }) {
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

function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const defaultMeta = STATUS_META.requested!;
  const meta = STATUS_META[status] ?? defaultMeta;
  const badge = meta!.badge;
  const dot = meta!.dot;
  const label = meta!.label;
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-[11px]",
    lg: "px-3 py-1 text-xs",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-semibold font-heading tracking-wide uppercase",
      sizeClasses[size],
      badge,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

function ChannelPill({ channel, showLabel = true }: { channel: string | null | undefined; showLabel?: boolean }) {
  if (!channel) return <span className="text-muted-foreground text-xs">—</span>;
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  const className = meta?.className ?? "";
  const label = meta?.label ?? channel;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
      "text-[11px] font-medium",
      className,
    )}>
      <ChannelIcon channel={channel} size={12} />
      {showLabel && label}
    </span>
  );
}

function TimeBadge({ dateStr }: { dateStr: string | null | undefined }) {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    
    if (isToday(date)) {
      return (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
          Today
        </span>
      );
    }
    if (isTomorrow(date)) {
      return (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Tomorrow
        </span>
      );
    }
  } catch {
    // Invalid date
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PIPELINE STEPPER
   ═══════════════════════════════════════════════════════════════════════════════ */

function PipelineStepper({ currentStatus, onChangeStatus }: {
  currentStatus: string;
  onChangeStatus: (status: string) => void;
}) {
  const currentIdx = STATUS_PIPELINE.indexOf(currentStatus as typeof STATUS_PIPELINE[number]);
  const isCancelled = currentStatus === "cancelled";
  const isNoShow = currentStatus === "no_show";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {STATUS_PIPELINE.map((step, i) => {
          const isPastStep = i < currentIdx && !isCancelled && !isNoShow;
          const isCurrent = i === currentIdx && !isCancelled && !isNoShow;
          const isLast = i === STATUS_PIPELINE.length - 1;
          const defaultMeta = STATUS_META.requested!;
          const stepMeta = STATUS_META[step] ?? defaultMeta;
          const stepLabel = stepMeta!.label;

          return (
            <Fragment key={step}>
              <button
                onClick={() => onChangeStatus(step)}
                disabled={isCancelled || isNoShow}
                className={cn(
                  "flex flex-col items-center gap-1.5 group transition-all",
                  (isCancelled || isNoShow) && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center transition-all border-2",
                  isCurrent && "border-primary bg-primary text-white scale-110 shadow-lg",
                  isPastStep && "border-emerald-500 bg-emerald-500/10 text-emerald-500",
                  !isCurrent && !isPastStep && "border-border bg-card text-muted-foreground",
                  !isCancelled && !isNoShow && "group-hover:border-primary/50",
                )}>
                  {isPastStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isCurrent ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold font-heading capitalize transition-colors",
                  isCurrent && "text-primary",
                  isPastStep && "text-emerald-500",
                  !isCurrent && !isPastStep && "text-muted-foreground",
                )}>
                  {stepLabel}
                </span>
              </button>
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                  isPastStep ? "bg-emerald-500/40" : "bg-border",
                )} />
              )}
            </Fragment>
          );
        })}
      </div>
      
      {/* Branching statuses */}
      {(isCancelled || isNoShow) && (
        <div className="flex items-center justify-center gap-3 pt-2 border-t">
          <button
            onClick={() => onChangeStatus("cancelled")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              isCancelled ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancelled
          </button>
          <button
            onClick={() => onChangeStatus("no_show")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              isNoShow ? "bg-gray-500/10 text-gray-400 border border-gray-500/20" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserX className="h-3.5 w-3.5" />
            No-show
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function BookingDetail() {
  const { id } = useParams<{ id?: string }>();
  const bookingId: string = id ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: booking, isLoading, refetch } = useBookingDetail(bookingId);
  const { data: activityData } = useBookingActivity(bookingId);
  const { data: notesData, refetch: refetchNotes } = useBookingNotes(bookingId);
  const createNote = useCreateBookingNote();

  useBookingRealtime();

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [newNote, setNewNote] = useState("");

  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();
  const completeBooking = useCompleteBooking();
  const rescheduleBooking = useRescheduleBooking();
  const sendReminder = useSendReminder();

  const defaultStatusMeta = STATUS_META.requested!;
  const statusMeta = useMemo(() => {
    if (!booking) return defaultStatusMeta;
    return STATUS_META[booking.status] ?? defaultStatusMeta;
  }, [booking, defaultStatusMeta]);
  
  // Extract properties for use in JSX (avoids "possibly undefined" errors)
  const statusBgColor = statusMeta!.bgColor;
  const statusBadge = statusMeta!.badge;
  const statusIcon = statusMeta!.icon;

  /* ── Action handlers ──────────────────────────────────────────────────────── */

  const openConfirmDialog = useCallback(() => {
    if (!booking) return;
    const defaultMsg = `Hi! Your booking for ${booking.service} on ${formatShortDate(booking.booking_date)} at ${formatTime(booking.booking_time)} is confirmed. See you then!`;
    setConfirmMessage(defaultMsg);
    setSendNotification(true);
    setConfirmOpen(true);
  }, [booking]);

  const handleConfirm = useCallback(async () => {
    if (!booking) return;
    try {
      const data: { send_notification?: boolean; message?: string; channel?: string } = {
        send_notification: sendNotification,
      };
      if (sendNotification && confirmMessage) {
        data.message = confirmMessage;
      }
      if (booking.source_channel) {
        data.channel = booking.source_channel;
      }
      await confirmBooking.mutateAsync({
        id: booking.id,
        data,
      });
      toast({ description: "Booking confirmed successfully" });
      setConfirmOpen(false);
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to confirm booking" });
    }
  }, [booking, confirmBooking, sendNotification, confirmMessage, toast, refetch]);

  const openCompleteDialog = useCallback(() => {
    if (!booking) return;
    setActualValue(booking.booking_value != null ? String(booking.booking_value) : "");
    setCompleteOpen(true);
  }, [booking]);

  const handleComplete = useCallback(async () => {
    if (!booking) return;
    try {
      const data: { actual_value?: number; satisfaction_note?: string } = {};
      if (actualValue) {
        data.actual_value = parseFloat(actualValue);
      }
      await completeBooking.mutateAsync({
        id: booking.id,
        data,
      });
      toast({ description: "Booking marked as completed" });
      setCompleteOpen(false);
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to complete booking" });
    }
  }, [booking, completeBooking, actualValue, toast, refetch]);

  const openCancelSheet = useCallback(() => {
    setCancelReason("");
    setSendNotification(true);
    setCancelOpen(true);
  }, []);

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    try {
      const data: { reason: string; send_notification?: boolean; channel?: string; message?: string; internal_note?: string } = {
        reason: cancelReason || "Cancelled by user",
        send_notification: sendNotification,
      };
      if (booking.source_channel) {
        data.channel = booking.source_channel;
      }
      await cancelBooking.mutateAsync({
        id: booking.id,
        data,
      });
      toast({ description: "Booking cancelled" });
      setCancelOpen(false);
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to cancel booking" });
    }
  }, [booking, cancelBooking, cancelReason, sendNotification, toast, refetch]);

  const openRescheduleSheet = useCallback(() => {
    setRescheduleDate(booking?.booking_date ?? "");
    setRescheduleTime(booking?.booking_time ?? "09:00");
    setSendNotification(true);
    setRescheduleOpen(true);
  }, [booking]);

  const handleReschedule = useCallback(async () => {
    if (!booking) return;
    try {
      const data: { new_date: string; new_time: string; send_notification?: boolean; channel?: string; reason?: string; message?: string } = {
        new_date: rescheduleDate,
        new_time: rescheduleTime,
        send_notification: sendNotification,
      };
      if (booking.source_channel) {
        data.channel = booking.source_channel;
      }
      await rescheduleBooking.mutateAsync({
        id: booking.id,
        data,
      });
      toast({ description: "Booking rescheduled" });
      setRescheduleOpen(false);
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to reschedule booking" });
    }
  }, [booking, rescheduleBooking, rescheduleDate, rescheduleTime, sendNotification, toast, refetch]);

  const openReminderSheet = useCallback(() => {
    if (!booking) return;
    const defaultMsg = `Reminder: Your booking for ${booking.service} is scheduled for ${formatShortDate(booking.booking_date)} at ${formatTime(booking.booking_time)}.`;
    setReminderMessage(defaultMsg);
    setReminderOpen(true);
  }, [booking]);

  const handleSendReminder = useCallback(async () => {
    if (!booking) return;
    try {
      const data: { message?: string; channel?: string } = {};
      if (reminderMessage) {
        data.message = reminderMessage;
      }
      if (booking.source_channel) {
        data.channel = booking.source_channel;
      }
      await sendReminder.mutateAsync({
        id: booking.id,
        data,
      });
      toast({ description: "Reminder sent" });
      setReminderOpen(false);
      void refetch();
    } catch {
      toast({ variant: "destructive", description: "Failed to send reminder" });
    }
  }, [booking, sendReminder, reminderMessage, toast, refetch]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!booking) return;
    if (newStatus === "confirmed" && booking.status === "requested") {
      openConfirmDialog();
    } else if (newStatus === "completed" && booking.status === "confirmed") {
      openCompleteDialog();
    } else if (newStatus === "cancelled") {
      openCancelSheet();
    }
  }, [booking, openConfirmDialog, openCompleteDialog, openCancelSheet]);

  const handleAddNote = useCallback(async () => {
    if (!booking || !newNote.trim()) return;
    try {
      await createNote.mutateAsync({ id: booking.id, data: { content: newNote.trim() } });
      setNewNote("");
      toast({ description: "Note added" });
      void refetchNotes();
    } catch {
      toast({ variant: "destructive", description: "Failed to add note" });
    }
  }, [booking, createNote, newNote, toast, refetchNotes]);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════ */

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[200px] rounded-xl" />
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[150px] rounded-xl" />
            <Skeleton className="h-[200px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-4">Booking not found</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/bookings")}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  const contact = booking.contact;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1400px] mx-auto w-full">
      {/* ─── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/bookings")} className="gap-1.5 h-9 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Bookings
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {booking.service}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {booking.status === "requested" && (
            <Button size="sm" onClick={openConfirmDialog} className="gap-1.5 h-9 text-xs bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Booking
            </Button>
          )}
          {booking.status === "confirmed" && (
            <>
              <Button variant="outline" size="sm" onClick={openReminderSheet} className="gap-1.5 h-9 text-xs">
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send Reminder</span>
              </Button>
              <Button size="sm" onClick={openCompleteDialog} className="gap-1.5 h-9 text-xs">
                <Star className="h-3.5 w-3.5" />
                Mark Complete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={openRescheduleSheet} className="gap-1.5 h-9 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reschedule</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openCancelSheet} className="text-destructive focus:text-destructive">
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Cancel Booking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Main Content Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Header Card */}
          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className={cn(
                "h-14 w-14 rounded-xl flex items-center justify-center shrink-0",
                statusBgColor,
              )}>
                <span className={cn(
                  statusBadge.includes("amber") ? "text-amber-400" :
                  statusBadge.includes("emerald") ? "text-emerald-400" :
                  statusBadge.includes("violet") ? "text-violet-400" :
                  statusBadge.includes("rose") ? "text-rose-400" :
                  "text-gray-400"
                )}>
                  {statusIcon}
                </span>
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight mb-2">
                  {booking.service}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <StatusBadge status={booking.status} />
                  <TimeBadge dateStr={booking.booking_date} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(booking.booking_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(booking.booking_time)}
                    {booking.duration_minutes && ` · ${booking.duration_minutes}min`}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                  ID: {booking.id.slice(0, 8)}... · Via {booking.source_channel || "Manual"} · Created {relativeTime(booking.created_at)}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="hidden sm:grid grid-cols-2 gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Value</p>
                  <p className="text-lg font-bold font-mono text-emerald-500">
                    {booking.booking_value != null ? `KSh ${booking.booking_value.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channel</p>
                  <ChannelPill channel={booking.source_channel} />
                </div>
              </div>
            </div>
          </div>

          {/* Service Details Card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Service Details</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Service</p>
                <p className="text-sm text-foreground">{booking.service}</p>
              </div>
              {booking.service_details && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Details</p>
                  <p className="text-sm text-foreground">{booking.service_details}</p>
                </div>
              )}
              {booking.location && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {booking.location}
                  </p>
                </div>
              )}
              {booking.special_requests && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Special Requests</p>
                  <p className="text-sm text-foreground">{booking.special_requests}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Activity Timeline</h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              {activityData?.events && activityData.events.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {activityData.events.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-3 relative">
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 bg-card z-10 shrink-0 mt-0.5",
                          event.type.includes("confirmed") && "border-emerald-500 bg-emerald-500/20",
                          event.type.includes("cancelled") && "border-rose-500 bg-rose-500/20",
                          event.type.includes("completed") && "border-violet-500 bg-violet-500/20",
                          event.type.includes("created") && "border-primary bg-primary/20",
                          event.type.includes("reminder") && "border-amber-500 bg-amber-500/20",
                          event.type.includes("rescheduled") && "border-blue-500 bg-blue-500/20",
                          !event.type.match(/confirmed|cancelled|completed|created|reminder|rescheduled/) && "border-muted-foreground",
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{event.message || event.type.replace("booking.", "").replace(/_/g, " ")}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {format(new Date(event.timestamp), "MMM d, yyyy · h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
              )}
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Internal Notes</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {notesData?.notes && notesData.notes.length > 0 ? (
                <div className="space-y-3">
                  {notesData.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm text-foreground">{note.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                        {note.created_at ? format(new Date(note.created_at), "MMM d, yyyy · h:mm a") : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No notes yet</p>
              )}
              
              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  placeholder="Add an internal note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" className="h-8 text-xs" onClick={handleAddNote} disabled={!newNote.trim() || createNote.isPending}>
                    {createNote.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Status Management Card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Booking Status</h2>
            </div>
            <div className="px-4 sm:px-6 py-5">
              <PipelineStepper
                currentStatus={booking.status}
                onChangeStatus={handleStatusChange}
              />
            </div>
          </div>

          {/* Contact Panel */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Contact</h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3 mb-4">
                <BookingAvatar name={contact?.full_name} size="lg" />
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-foreground truncate">
                    {contact?.full_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </div>
              </div>
              {contact && (
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Value Card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Booking Value</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 text-center">
              <p className="text-2xl font-bold font-mono text-emerald-500">
                {booking.booking_value != null ? `KSh ${booking.booking_value.toLocaleString()}` : "—"}
              </p>
              {booking.actual_value != null && booking.actual_value !== booking.booking_value && (
                <p className="text-sm text-muted-foreground mt-1">
                  Actual: KSh {booking.actual_value.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {booking.currency || "KES"}
              </p>
            </div>
          </div>

          {/* Reminders Card */}
          {booking.status === "confirmed" && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold font-heading text-foreground">Reminders</h2>
              </div>
              <div className="px-4 sm:px-6 py-4 space-y-3">
                {booking.reminder_24h_sent_at ? (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">24h reminder sent</span>
                    <span className="text-muted-foreground/60 font-mono ml-auto">
                      {relativeTime(booking.reminder_24h_sent_at)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">24h reminder pending</span>
                  </div>
                )}
                {booking.reminder_2h_sent_at ? (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">2h reminder sent</span>
                    <span className="text-muted-foreground/60 font-mono ml-auto">
                      {relativeTime(booking.reminder_2h_sent_at)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">2h reminder pending</span>
                  </div>
                )}
                {booking.reminder_manual_sent_at && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">Manual reminder sent</span>
                    <span className="text-muted-foreground/60 font-mono ml-auto">
                      {relativeTime(booking.reminder_manual_sent_at)}
                    </span>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-2" onClick={openReminderSheet}>
                  <Send className="h-3 w-3 mr-1.5" />
                  Send Reminder Now
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm font-semibold font-heading text-foreground">Quick Actions</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-2">
              {booking.status === "requested" && (
                <Button className="w-full h-9 text-xs gap-1.5" onClick={openConfirmDialog}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm Booking
                </Button>
              )}
              {booking.status === "confirmed" && (
                <Button className="w-full h-9 text-xs gap-1.5" onClick={openCompleteDialog}>
                  <Star className="h-3.5 w-3.5" />
                  Mark Completed
                </Button>
              )}
              <Button variant="outline" className="w-full h-9 text-xs gap-1.5" onClick={openRescheduleSheet}>
                <Calendar className="h-3.5 w-3.5" />
                Reschedule
              </Button>
              {booking.conversation_id && (
                <Button variant="outline" className="w-full h-9 text-xs gap-1.5" asChild>
                  <Link to={`/dashboard/inbox?conversation=${booking.conversation_id}`}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    View Conversation
                  </Link>
                </Button>
              )}
              <Button 
                variant="outline" 
                className="w-full h-9 text-xs gap-1.5 text-destructive hover:text-destructive" 
                onClick={openCancelSheet}
                disabled={booking.status === "cancelled"}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel Booking
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         SHEETS / DIALOGS
         ═══════════════════════════════════════════════════════════════════════ */}

      {/* Confirm Booking Sheet */}
      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[95vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-heading text-base">Confirm Booking</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm this booking and optionally send a notification to the customer.
            </p>
            <div className="flex items-center gap-2">
              <input
                id="confirm-notify"
                type="checkbox"
                checked={sendNotification}
                onChange={e => setSendNotification(e.target.checked)}
                className="h-4 w-4 rounded border-muted bg-card"
              />
              <label htmlFor="confirm-notify" className="text-sm text-foreground">
                Send confirmation message
              </label>
            </div>
            {sendNotification && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Message Preview
                </label>
                <Textarea
                  value={confirmMessage}
                  onChange={e => setConfirmMessage(e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 p-4 border-t">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirm} disabled={confirmBooking.isPending}>
              {confirmBooking.isPending ? "Confirming..." : "Confirm Booking"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Complete Booking Sheet */}
      <Sheet open={completeOpen} onOpenChange={setCompleteOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[95vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-heading text-base">Mark as Completed</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark this booking as completed and record the actual revenue.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actual Revenue (KSh)
              </label>
              <Input
                type="number"
                value={actualValue}
                onChange={e => setActualValue(e.target.value)}
                placeholder={booking.booking_value?.toString() || "0"}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border-t">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleComplete} disabled={completeBooking.isPending}>
              {completeBooking.isPending ? "Completing..." : "Mark Completed"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reschedule Sheet */}
      <Sheet open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[95vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-heading text-base">Reschedule Booking</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current</p>
              <p className="text-sm text-foreground">
                {formatShortDate(booking.booking_date)} at {formatTime(booking.booking_time)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="h-9 w-full px-3 text-sm rounded-md border bg-card text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  New Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="h-9 w-full px-3 text-sm rounded-md border bg-card text-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="reschedule-notify"
                type="checkbox"
                checked={sendNotification}
                onChange={e => setSendNotification(e.target.checked)}
                className="h-4 w-4 rounded border-muted bg-card"
              />
              <label htmlFor="reschedule-notify" className="text-sm text-foreground">
                Send notification to customer
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border-t">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleReschedule} disabled={!rescheduleDate || !rescheduleTime || rescheduleBooking.isPending}>
              {rescheduleBooking.isPending ? "Rescheduling..." : "Reschedule"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Booking Sheet */}
      <Sheet open={cancelOpen} onOpenChange={setCancelOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[95vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-heading text-base">Cancel Booking</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <p className="text-sm text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                This will permanently cancel this booking.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cancellation Reason
              </label>
              <Input
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g., Customer requested"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cancel-notify"
                type="checkbox"
                checked={sendNotification}
                onChange={e => setSendNotification(e.target.checked)}
                className="h-4 w-4 rounded border-muted bg-card"
              />
              <label htmlFor="cancel-notify" className="text-sm text-foreground">
                Send cancellation notification
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border-t">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setCancelOpen(false)}>
              Go Back
            </Button>
            <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={handleCancel} disabled={cancelBooking.isPending}>
              {cancelBooking.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Send Reminder Sheet */}
      <Sheet open={reminderOpen} onOpenChange={setReminderOpen}>
        <SheetContent side="right" className="w-[400px] max-w-[95vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="font-heading text-base">Send Reminder</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a manual reminder to the customer via {booking.source_channel || "their preferred channel"}.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Message
              </label>
              <Textarea
                value={reminderMessage}
                onChange={e => setReminderMessage(e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border-t">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleSendReminder} disabled={!reminderMessage.trim() || sendReminder.isPending}>
              {sendReminder.isPending ? "Sending..." : "Send Reminder"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
