/**
 * Recent Leads Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Data table patterns with mobile card list
 * - Avatar with gradient
 * - Badge styling for status
 * - Responsive design
 */

import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";
import { Button } from "@/components/ui/button";

interface RecentLeadsProps {
  data: Array<{
    id: string;
    name: string;
    email: string;
    channel: string;
    status: string;
    time_ago: string;
  }>;
  className?: string;
}

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  new:       { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",       label: "New" },
  contacted: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",    label: "Contacted" },
  qualified: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",          label: "Qualified" },
  converted: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Converted" },
  lost:      { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",          label: "Lost" },
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export function RecentLeads({ data, className }: RecentLeadsProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:border-border/80",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold font-heading text-foreground">
            Recent Leads
          </h3>
          {/* New leads indicator */}
          {data.some(lead => lead.status === "new") && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>
        <button
          onClick={() => navigate("/dashboard/leads")}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block">
        {data.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 sm:px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Contact
                </th>
                <th className="px-4 sm:px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
                  Channel
                </th>
                <th className="px-4 sm:px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Status
                </th>
                <th className="px-4 sm:px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => {
                const channel = CHANNEL_META[item.channel] || CHANNEL_META.web;
                const status = STATUS_META[item.status] || STATUS_META.new;

                return (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/leads/${item.id}`)}
                  >
                    {/* Contact */}
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          "h-8 w-8 rounded-full shrink-0",
                          "bg-gradient-to-br from-primary/80 to-violet-600/80",
                          "flex items-center justify-center",
                          "text-[10px] font-bold text-white select-none tracking-wide",
                          "ring-2 ring-background",
                        )}>
                          {getInitials(item.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate font-description text-foreground">
                            {item.name || "Anonymous"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {item.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Channel - hidden on smaller screens */}
                    <td className="px-4 sm:px-5 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <ChannelIcon channel={item.channel} size={12} />
                        <span className="text-xs text-muted-foreground">
                          {channel.label}
                        </span>
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 sm:px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                        "text-[10px] font-semibold font-heading tracking-wide",
                        status.badge,
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                    </td>
                    
                    {/* Time */}
                    <td className="px-4 sm:px-5 py-3 text-right">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {item.time_ago}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No leads captured yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Leads will appear here when your chatbot captures contact info
            </p>
            <Button
              variant="link"
              size="sm"
              className="text-primary text-xs mt-2"
              onClick={() => navigate("/dashboard/chatbot?tab=leadCapture")}
            >
              Configure Lead Capture
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden divide-y divide-border">
        {data.length > 0 ? (
          data.map((item) => {
            const channel = CHANNEL_META[item.channel] || CHANNEL_META.web;
            const status = STATUS_META[item.status] || STATUS_META.new;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/dashboard/leads/${item.id}`)}
              >
                {/* Avatar */}
                <div className={cn(
                  "h-9 w-9 rounded-full shrink-0",
                  "bg-gradient-to-br from-primary/80 to-violet-600/80",
                  "flex items-center justify-center",
                  "text-[10px] font-bold text-white select-none tracking-wide",
                  "ring-2 ring-background",
                )}>
                  {getInitials(item.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium truncate text-foreground">
                        {item.name || "Anonymous"}
                      </span>
                      <ChannelIcon channel={item.channel} size={10} />
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                      "text-[9px] font-semibold font-heading tracking-wide shrink-0",
                      status.badge,
                    )}>
                      <span className={cn("h-1 w-1 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.email || "No email"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      via {channel.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {item.time_ago}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No leads captured yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Configure lead capture to start collecting contacts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
