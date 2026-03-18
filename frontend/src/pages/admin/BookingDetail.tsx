import { useMemo, useState, useCallback, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CheckCircle2, X, Truck, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useBookingDetail, useBookingActivity, useBookingNotes, useBookingRealtime, useConfirmBooking, useCancelBooking, useCompleteBooking, useRescheduleBooking, useCreateBookingNote } from "@/hooks/useBookings";
import type { BookingActivityItem, BookingNoteItem } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr as any);
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr?: string | null) {
  if (!timeStr) return "—";
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

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-violet-100 text-violet-700",
  cancelled: "bg-rose-100 text-rose-700",
  no_show: "bg-gray-100 text-gray-700",
};

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = id ?? "";
  const navigate = useNavigate();

  const { data: booking, isLoading } = useBookingDetail(bookingId);
  const { data: activityData } = useBookingActivity(bookingId);
  const { data: notesData } = useBookingNotes(bookingId);
  const createNote = useCreateBookingNote();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading booking...</p>
      </div>
    );
  }

  useBookingRealtime();

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();
  const completeBooking = useCompleteBooking();
  const rescheduleBooking = useRescheduleBooking();

  const statusClass = useMemo(() => {
    if (!booking) return "bg-muted text-muted-foreground";
    return STATUS_STYLES[booking.status] ?? "bg-muted text-muted-foreground";
  }, [booking]);

  const handleConfirm = async () => {
    if (!booking) return;
    await confirmBooking.mutateAsync({ id: booking.id, data: { send_notification: false } });
  };

  const openCancelSheet = useCallback(() => {
    setCancelReason(booking?.cancellation_reason ?? "");
    setSendNotification(true);
    setCancelOpen(true);
  }, [booking]);

  const submitCancel = useCallback(async () => {
    if (!booking) return;
    await cancelBooking.mutateAsync({
      id: booking.id,
      data: { reason: cancelReason || "Cancelled by user", send_notification: sendNotification },
    });
    setCancelOpen(false);
  }, [booking, cancelBooking, cancelReason, sendNotification]);

  const handleComplete = async () => {
    if (!booking) return;
    const payload: { actual_value?: number } = {};
    if (booking.booking_value != null) payload.actual_value = booking.booking_value;
    await completeBooking.mutateAsync({ id: booking.id, data: payload });
  };

  const openRescheduleSheet = useCallback(() => {
    setRescheduleDate(booking?.booking_date ?? "");
    setRescheduleTime(booking?.booking_time ?? "09:00");
    setSendNotification(true);
    setRescheduleOpen(true);
  }, [booking]);

  const [newNote, setNewNote] = useState("");

  const submitReschedule = useCallback(async () => {
    if (!booking) return;
    await rescheduleBooking.mutateAsync({
      id: booking.id,
      data: { new_date: rescheduleDate, new_time: rescheduleTime, send_notification: sendNotification },
    });
    setRescheduleOpen(false);
  }, [booking, rescheduleBooking, rescheduleDate, rescheduleTime, sendNotification]);

  const submitNote = useCallback(async () => {
    if (!booking || !newNote.trim()) return;
    await createNote.mutateAsync({ id: booking.id, data: { content: newNote.trim() } });
    setNewNote("");
  }, [booking, createNote, newNote]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleConfirm} disabled={!booking || booking.status === "confirmed"}>
            <CheckCircle2 size={14} /> Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={handleComplete} disabled={!booking || booking.status === "completed"}>
            <CheckCircle2 size={14} /> Complete
          </Button>
          <Button size="sm" variant="outline" onClick={openRescheduleSheet} disabled={!booking}>
            <Calendar size={14} /> Reschedule
          </Button>
          <Button size="sm" variant="destructive" onClick={openCancelSheet} disabled={!booking}>
            <X size={14} /> Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-heading font-bold text-foreground">
                {booking?.service ?? "Loading..."}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", statusClass)}>
                  {booking?.status?.toUpperCase() ?? "—"}
                </span>
                {booking?.booking_date && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar size={14} /> {formatDate(booking.booking_date)}
                  </span>
                )}
                {booking?.booking_time && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock size={14} /> {formatTime(booking.booking_time)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                Booking Info
              </p>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} />
                  <span>Value:</span>
                  <span className="font-semibold">
                    {booking?.booking_value ? `KSh ${booking.booking_value}` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={14} />
                  <span>Assigned to:</span>
                  <span className="font-semibold">{booking?.assigned_to ?? "Unassigned"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
                Contact
              </p>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">ID:</span>
                  <span>{booking?.contact_id ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Conversation:</span>
                  <span>{booking?.conversation_id ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
              Notes
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="space-y-2">
                {notesData?.notes?.length ? (
                  notesData.notes.map((note: BookingNoteItem) => (
                    <div key={note.id} className="rounded-md border bg-card p-3">
                      <p className="text-sm text-foreground">{note.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.created_at ? format(new Date(note.created_at), "PPpp") : ""}
                        {note.user_id ? ` — ${note.user_id}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                  rows={3}
                  className="text-sm bg-card"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={submitNote} disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
              Activity
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              {activityData?.events?.length ? (
                activityData.events.map((event: BookingActivityItem) => (
                  <div key={event.timestamp} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(Date.parse(event.timestamp), "PPpp")}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {event.type.replace("booking.", "")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-2">
            Quick Actions
          </p>
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleConfirm}
              disabled={!booking || booking.status === "confirmed"}
            >
              Confirm Booking
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleComplete}
              disabled={!booking || booking.status === "completed"}
            >
              Mark Completed
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={openRescheduleSheet}
              disabled={!booking}
            >
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={openCancelSheet}
              disabled={!booking}
            >
              Cancel Booking
            </Button>
          </div>
        </Card>
      </div>

      <Sheet open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <SheetContent side="right" className="w-[320px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Reschedule Booking</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">New date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">New time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="reschedule-notify"
                type="checkbox"
                checked={sendNotification}
                onChange={e => setSendNotification(e.target.checked)}
                className="h-4 w-4 rounded border-muted bg-card"
              />
              <label htmlFor="reschedule-notify" className="text-sm text-muted-foreground">
                Send notification
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                onClick={submitReschedule}
                disabled={!booking || !rescheduleDate || !rescheduleTime}
              >
                Save
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRescheduleOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen}>
        <SheetContent side="right" className="w-[320px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Cancel Booking</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Optional reason"
                className="w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground"
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
              <label htmlFor="cancel-notify" className="text-sm text-muted-foreground">
                Send notification
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                variant="destructive"
                onClick={submitCancel}
                disabled={!booking}
              >
                Cancel booking
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
