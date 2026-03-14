/**
 * Dashboard Announcement Banner Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Alert card styling
 * - Proper dismiss behavior with localStorage
 * - Responsive design
 */

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, Wrench } from "lucide-react";
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

const ANNOUNCEMENT_CONFIG = {
  info: {
    icon: Info,
    bgClass: "bg-blue-500/5",
    borderClass: "border-blue-500/20",
    iconBgClass: "bg-blue-500/10",
    iconClass: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-500/20",
    iconBgClass: "bg-amber-500/10",
    iconClass: "text-amber-500",
  },
  maintenance: {
    icon: Wrench,
    bgClass: "bg-rose-500/5",
    borderClass: "border-rose-500/20",
    iconBgClass: "bg-rose-500/10",
    iconClass: "text-rose-500",
  },
};

export function DashboardAnnouncement({ announcement, className }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const key = `nexachat_banner_dismissed_${announcement.id}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(key)) {
      setVisible(false);
    }
  }, [announcement.id]);

  if (!visible) return null;

  const config = ANNOUNCEMENT_CONFIG[announcement.type as keyof typeof ANNOUNCEMENT_CONFIG] 
    || ANNOUNCEMENT_CONFIG.info;
  const Icon = config.icon;

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
        "rounded-xl border p-3 sm:p-4 flex items-start sm:items-center gap-3",
        "transition-all duration-200",
        config.bgClass,
        config.borderClass,
        className,
      )}
    >
      {/* Icon */}
      <div className={cn(
        "h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0",
        config.iconBgClass,
      )}>
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", config.iconClass)} />
      </div>
      
      {/* Message */}
      <p className="flex-1 text-xs sm:text-sm font-medium font-description text-foreground">
        {announcement.message}
      </p>
      
      {/* Close button */}
      <button
        onClick={handleClose}
        className={cn(
          "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
          "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          "transition-colors",
        )}
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
