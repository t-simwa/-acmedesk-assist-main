/**
 * ScheduleReportModal -- 7.3.1
 *
 * Modal for scheduling automated analytics email reports.
 * Frequency: weekly (day of week) or monthly (day of month).
 * Redesigned with proper Tailwind design tokens, no hardcoded hex.
 */

import { useEffect, useState } from "react";
import { Clock, Mail, Calendar, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { analyticsApi, type ScheduleReportRequest, type ScheduleReportResponse } from "@/lib/api";

interface ScheduleReportModalProps {
  open: boolean;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${["st", "nd", "rd"][i] || "th"}`,
}));

type Status = "idle" | "submitting" | "success" | "error";

export function ScheduleReportModal({ open, onClose }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("0");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [time, setTime] = useState("09:00");
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [schedules, setSchedules] = useState<ScheduleReportResponse[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const items = await analyticsApi.getScheduledReports();
      setSchedules(items);
    } catch {
      // ignore failures; user can retry by reopening modal
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await analyticsApi.deleteScheduledReport(id);
      await loadSchedules();
    } catch {
      // ignore; it may already be deleted
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    const payload: ScheduleReportRequest = {
      frequency,
      time,
      recipient_email: email.trim(),
      enabled,
      ...(frequency === "weekly" ? { day_of_week: parseInt(dayOfWeek) } : { day_of_month: parseInt(dayOfMonth) }),
    };

    try {
      await analyticsApi.scheduleReport(payload);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Failed to schedule report. Please try again.");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setErrorMsg("");
    onClose();
  };

  useEffect(() => {
    if (open) {
      loadSchedules();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full border border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold font-heading text-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            Schedule Automated Report
          </DialogTitle>
        </DialogHeader>

        {loadingSchedules ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">Loading scheduled reports...</div>
        ) : schedules.length > 0 ? (
          <div className="px-4 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
              Existing schedules
            </p>
            <div className="mt-2 space-y-2">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {schedule.frequency === "weekly" ? "Weekly" : "Monthly"} at {schedule.time}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.recipient_email} • {schedule.enabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 border-b border-border text-sm text-muted-foreground">
            No scheduled reports yet. Create one below.
          </div>
        )}

        {status === "success" ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-emerald-500/15">
              <span className="text-xl">&#10003;</span>
            </div>
            <p className="font-semibold font-heading text-foreground">Report scheduled!</p>
            <p className="text-sm mt-1 font-description text-muted-foreground">
              You'll receive your report at <span className="text-primary">{email}</span>
            </p>
            <Button
              onClick={handleClose}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                Frequency
              </Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}>
                <SelectTrigger className="border border-border bg-muted text-sm font-description text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="weekly" className="text-sm font-description text-foreground">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-sm font-description text-foreground">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                {frequency === "weekly" ? "Day of Week" : "Day of Month"}
              </Label>
              {frequency === "weekly" ? (
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger className="border border-border bg-muted text-sm font-description text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-sm font-description text-foreground">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                  <SelectTrigger className="border border-border bg-muted text-sm font-description text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {DAYS_OF_MONTH.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-sm font-description text-foreground">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Send Time
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border border-border bg-muted text-sm font-mono text-foreground"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Recipient Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reports@company.com"
                required
                className="border border-border bg-muted text-sm font-description text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-description text-foreground">Enable schedule</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {errorMsg && (
              <p className="text-xs text-destructive font-description">{errorMsg}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="flex-1 text-sm font-description border border-border text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={status === "submitting" || !email.trim()}
                className="flex-1 text-sm font-description bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {status === "submitting" ? "Scheduling..." : "Schedule Report"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
