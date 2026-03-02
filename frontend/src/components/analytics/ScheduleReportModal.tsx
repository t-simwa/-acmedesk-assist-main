/**
 * ScheduleReportModal — 7.3.1
 * Modal for scheduling automated analytics email reports.
 * Frequency: weekly (day of week) or monthly (day of month).
 */

import { useState } from "react";
import { Clock, Mail, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { analyticsApi, type ScheduleReportRequest } from "@/lib/api";

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md w-full border"
        style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B", color: "#F9FAFB" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold font-heading" style={{ color: "#F9FAFB" }}>
            <Calendar className="h-4 w-4" style={{ color: "#4F8EF7" }} />
            Schedule Automated Report
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: "rgba(16,185,129,0.15)" }}
            >
              <span className="text-xl">✓</span>
            </div>
            <p className="font-semibold font-heading" style={{ color: "#F9FAFB" }}>Report scheduled!</p>
            <p className="text-sm mt-1 font-description" style={{ color: "#9CA3AF" }}>
              You'll receive your report at <span style={{ color: "#4F8EF7" }}>{email}</span>
            </p>
            <Button
              onClick={handleClose}
              className="mt-4"
              style={{ backgroundColor: "#4F8EF7", color: "#fff" }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                Frequency
              </Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}>
                <SelectTrigger
                  className="border text-sm font-description"
                  style={{ backgroundColor: "#111827", borderColor: "#2D333B", color: "#F9FAFB" }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
                  <SelectItem value="weekly" className="text-sm font-description" style={{ color: "#F9FAFB" }}>Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-sm font-description" style={{ color: "#F9FAFB" }}>Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                {frequency === "weekly" ? "Day of Week" : "Day of Month"}
              </Label>
              {frequency === "weekly" ? (
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger
                    className="border text-sm font-description"
                    style={{ backgroundColor: "#111827", borderColor: "#2D333B", color: "#F9FAFB" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-sm font-description" style={{ color: "#F9FAFB" }}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                  <SelectTrigger
                    className="border text-sm font-description"
                    style={{ backgroundColor: "#111827", borderColor: "#2D333B", color: "#F9FAFB" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
                    {DAYS_OF_MONTH.map((d) => (
                      <SelectItem key={d.value} value={d.value} className="text-sm font-description" style={{ color: "#F9FAFB" }}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Send Time
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border text-sm font-mono"
                style={{ backgroundColor: "#111827", borderColor: "#2D333B", color: "#F9FAFB" }}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider font-heading" style={{ color: "#9CA3AF" }}>
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Recipient Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reports@company.com"
                required
                className="border text-sm font-description"
                style={{ backgroundColor: "#111827", borderColor: "#2D333B", color: "#F9FAFB" }}
              />
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-description" style={{ color: "#F9FAFB" }}>Enable schedule</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-description">{errorMsg}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="flex-1 text-sm font-description border"
                style={{ borderColor: "#2D333B", color: "#9CA3AF" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={status === "submitting" || !email.trim()}
                className="flex-1 text-sm font-description"
                style={{ backgroundColor: "#4F8EF7", color: "#fff" }}
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
