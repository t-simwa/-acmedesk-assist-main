import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  type: string;
  message: string;
  start_date?: string;
  end_date?: string;
}

interface Props {
  announcement: Announcement;
  className?: string;
}

export function DashboardAnnouncement({ announcement, className = "" }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const key = `nexachat_banner_dismissed_${announcement.id}`;
    if (localStorage.getItem(key)) {
      setVisible(false);
    }
  }, [announcement.id]);

  if (!visible) return null;

  let icon = <Info className="w-5 h-5" />;
  if (announcement.type === "warning") icon = <AlertTriangle className="w-5 h-5" />;
  if (announcement.type === "maintenance") icon = <AlertCircle className="w-5 h-5" />;

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
        "rounded-xl border border-border bg-card p-4 flex items-center justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
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
