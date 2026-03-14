/**
 * Chatbot Status Card Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Card styling with proper borders
 * - Status indicators with pulse animation
 * - Action buttons with proper sizing
 * - Responsive layout
 */

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Play,
  Pause,
  Settings,
  Code,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface ChatbotStatusCardProps {
  status: "live" | "paused" | "not_installed";
  lastActive?: string | null;
  chatbotName?: string | null;
  className?: string;
}

const STATUS_CONFIG = {
  live: {
    icon: Circle,
    iconClass: "text-emerald-500 fill-emerald-500",
    label: "Live & Active",
    labelClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    pulseClass: "animate-pulse",
    description: "Your chatbot is responding to messages",
  },
  paused: {
    icon: Pause,
    iconClass: "text-amber-500",
    label: "Paused",
    labelClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    pulseClass: "",
    description: "Your chatbot is not responding to messages",
  },
  not_installed: {
    icon: AlertCircle,
    iconClass: "text-rose-500",
    label: "Not Installed",
    labelClass: "text-rose-500",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    pulseClass: "",
    description: "Install your chatbot to start receiving messages",
  },
};

export function ChatbotStatusCard({
  status,
  lastActive,
  chatbotName,
  className,
}: ChatbotStatusCardProps) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_installed;
  const StatusIcon = config.icon;

  const formatLastActive = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:border-border/80",
        className
      )}
    >
      {/* Main content */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left side: Status info */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Status icon */}
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
              config.bgClass,
            )}>
              <StatusIcon className={cn("h-6 w-6", config.iconClass)} />
            </div>
            
            {/* Status text */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                  {chatbotName || "Your Chatbot"}
                </h3>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
                  "text-[10px] sm:text-[11px] font-semibold font-heading tracking-wide",
                  config.labelClass,
                  config.borderClass,
                  config.bgClass,
                )}>
                  <Circle className={cn(
                    "h-1.5 w-1.5 fill-current",
                    config.pulseClass,
                  )} />
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-description">
                {config.description}
              </p>
            </div>
          </div>
          
          {/* Right side: Last active */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading">
                Last Active
              </p>
              <p className="text-xs font-mono text-foreground mt-0.5">
                {formatLastActive(lastActive)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-border bg-muted/20 flex-wrap">
        {status === "live" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard/chatbot")}
            className="h-8 text-xs gap-1.5"
          >
            <Pause className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pause Chatbot</span>
            <span className="sm:hidden">Pause</span>
          </Button>
        )}
        {status === "paused" && (
          <Button
            size="sm"
            onClick={() => navigate("/dashboard/chatbot")}
            className="h-8 text-xs gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resume Chatbot</span>
            <span className="sm:hidden">Resume</span>
          </Button>
        )}
        {status === "not_installed" && (
          <Button
            size="sm"
            onClick={() => navigate("/dashboard/install")}
            className="h-8 text-xs gap-1.5"
          >
            <Code className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Install Guide</span>
            <span className="sm:hidden">Install</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/chatbot")}
          className="h-8 text-xs gap-1.5"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Configure</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/install")}
          className="h-8 text-xs gap-1.5"
        >
          <Code className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Embed Code</span>
        </Button>
        
        {/* Mobile: Last active info */}
        <div className="sm:hidden flex-1 text-right">
          <span className="text-[10px] text-muted-foreground">
            Last active: {formatLastActive(lastActive)}
          </span>
        </div>
      </div>
    </div>
  );
}
