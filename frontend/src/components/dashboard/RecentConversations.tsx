/**
 * Recent Conversations Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Data table patterns with mobile card list
 * - Badge styling for status
 * - Proper hover states
 * - Responsive design
 */

import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquare, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";
import { Button } from "@/components/ui/button";

interface RecentConversationsProps {
  data: Array<{
    id: string;
    channel: string;
    contact_name: string;
    first_message: string;
    status: string;
    time_ago: string;
  }>;
  className?: string;
}

const STATUS_META: Record<string, { dot: string; badge: string }> = {
  active:    { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  resolved:  { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  escalated: { dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  abandoned: { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

export function RecentConversations({ data, className }: RecentConversationsProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:border-border/80",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold font-heading text-foreground">
            Recent Conversations
          </h3>
        </div>
        <button
          onClick={() => navigate("/dashboard/conversations")}
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
                  Preview
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
                const status = STATUS_META[item.status] || STATUS_META.active;

                return (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/conversations/${item.id}`)}
                  >
                    {/* Contact */}
                    <td className="px-4 sm:px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                          <ChannelIcon channel={item.channel} size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate font-description text-foreground">
                            {item.contact_name || "Anonymous"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            via {channel.label}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Preview - hidden on smaller screens */}
                    <td className="px-4 sm:px-5 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px] italic">
                        "{item.first_message}"
                      </p>
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 sm:px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
                        "text-[10px] font-semibold font-heading tracking-wide capitalize",
                        status.badge,
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {item.status}
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
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No conversations yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Conversations will appear here once your chatbot starts chatting
            </p>
            <Button
              variant="link"
              size="sm"
              className="text-primary text-xs mt-2"
              onClick={() => navigate("/dashboard/install")}
            >
              Install on Website
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden divide-y divide-border">
        {data.length > 0 ? (
          data.map((item) => {
            const channel = CHANNEL_META[item.channel] || CHANNEL_META.web;
            const status = STATUS_META[item.status] || STATUS_META.active;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/dashboard/conversations/${item.id}`)}
              >
                {/* Channel icon */}
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                  <ChannelIcon channel={item.channel} size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate text-foreground">
                      {item.contact_name || "Anonymous"}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                      "text-[9px] font-semibold font-heading tracking-wide capitalize shrink-0",
                      status.badge,
                    )}>
                      <span className={cn("h-1 w-1 rounded-full", status.dot)} />
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.first_message}
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
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No conversations yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Start chatting to see conversations here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
