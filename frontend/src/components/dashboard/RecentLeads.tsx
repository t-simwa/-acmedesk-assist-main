import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

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
  contacted: { dot: "bg-violet-400",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",     label: "Contacted" },
  qualified: { dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",           label: "Qualified" },
  converted: { dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",  label: "Converted" },
  lost:      { dot: "bg-gray-400",    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",           label: "Lost" },
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export function RecentLeads({ data, className }: RecentLeadsProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold font-heading text-foreground">
          Recent Leads
        </h3>
        <button
          onClick={() => navigate("/dashboard/leads")}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {data.length > 0 ? (
          data.map((item) => {
            const channel = CHANNEL_META[item.channel] || CHANNEL_META.web;
            const status = STATUS_META[item.status] || STATUS_META.new;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/dashboard/leads/${item.id}`)}
              >
                {/* Avatar */}
                <div className={cn(
                  "h-8 w-8 rounded-full shrink-0",
                  "bg-gradient-to-br from-primary/80 to-violet-600/80",
                  "flex items-center justify-center",
                  "text-[10px] font-bold text-white select-none tracking-wide",
                )}>
                  {getInitials(item.name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate font-description text-foreground">
                      {item.name || "Anonymous"}
                    </p>
                    <ChannelIcon channel={item.channel} size={10} />
                  </div>
                  <p className="text-xs truncate text-muted-foreground">
                    {item.email || "No email"}
                  </p>
                </div>

                {/* Status & time */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                    "text-[10px] font-semibold font-heading tracking-wide",
                    status.badge,
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {item.time_ago}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 sm:px-5 py-8 text-center">
            <p className="text-sm font-description text-muted-foreground">
              No recent leads
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
