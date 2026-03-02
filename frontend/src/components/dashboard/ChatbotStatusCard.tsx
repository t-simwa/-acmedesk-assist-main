import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Play,
  Pause,
  Edit,
  Code,
  AlertCircle,
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
    label: "Live",
    labelClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  paused: {
    icon: Pause,
    iconClass: "text-amber-500",
    label: "Paused",
    labelClass: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
  not_installed: {
    icon: AlertCircle,
    iconClass: "text-rose-500",
    label: "Not Installed",
    labelClass: "text-rose-500",
    bgClass: "bg-rose-500/10 border-rose-500/20",
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
        "rounded-xl border overflow-hidden",
        className
      )}
      style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}
    >
      <div className="flex items-center justify-between px-4 sm:px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bgClass }}>
            <StatusIcon className={cn("w-5 h-5", config.iconClass)} />
          </div>
          <div>
            <p className="text-sm font-semibold font-heading" style={{ color: "#F9FAFB" }}>
              {chatbotName || "Chatbot"}
            </p>
            <p className={cn("text-xs font-medium flex items-center gap-1.5", config.labelClass)}>
              <Circle className={cn("w-2 h-2 fill-current", status === "live" && "animate-pulse")} />
              {config.label}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Last active</p>
          <p className="text-xs font-mono" style={{ color: "#F9FAFB" }}>{formatLastActive(lastActive)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 sm:px-5 pb-4 flex-wrap">
        {status === "live" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/dashboard/chatbot")}
            className="h-8 text-xs"
          >
            <Pause className="w-3.5 h-3.5 mr-1.5" />
            Pause
          </Button>
        )}
        {status === "paused" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/dashboard/chatbot")}
            className="h-8 text-xs"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Go Live
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/dashboard/chatbot")}
          className="h-8 text-xs"
        >
          <Edit className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/dashboard/install")}
          className="h-8 text-xs"
        >
          <Code className="w-3.5 h-3.5 mr-1.5" />
          Embed Code
        </Button>
      </div>
    </div>
  );
}
