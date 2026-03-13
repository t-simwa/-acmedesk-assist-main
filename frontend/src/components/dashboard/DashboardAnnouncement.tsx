import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  type: "info" | "warning" | "maintenance" | string;
  message: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface Props {
  announcement: Announcement;
  className?: string;
}

export function DashboardAnnouncement({ announcement, className = "" }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const key = `nexachat_banner_dismissed_${announcement.id}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(key)) {
      setVisible(false);
    }
  }, [announcement.id]);

  if (!visible) return null;

  const icon =
    announcement.type === "warning" ? (
      <AlertTriangle className="w-5 h-5" />
    ) : announcement.type === "maintenance" ? (
      <AlertCircle className="w-5 h-5" />
    ) : (
      <Info className="w-5 h-5" />
    );

  const bgClass =
    announcement.type === "warning"
      ? "bg-warning/10"
      : announcement.type === "maintenance"
      ? "bg-destructive/10"
      : "bg-primary/10";

  const borderClass =
    announcement.type === "warning"
      ? "border-warning/25"
      : announcement.type === "maintenance"
      ? "border-destructive/25"
      : "border-primary/25";

  const textClass = "text-foreground";

  const handleClose = () => {
    setVisible(false);
    const key = `nexachat_banner_dismissed_${announcement.id}`;
    try {
      localStorage.setItem(key, "1");
    } catch (_e) {
      // ignore failures (e.g. storage disabled)
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex items-center justify-between",
        bgClass,
        borderClass,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center rounded-full p-2",
            textClass,
          )}
        >
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{announcement.message}</p>
      </div>
      <button
        onClick={handleClose}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
