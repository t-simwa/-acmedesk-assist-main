/**
 * Channel Breakdown Component
 * 
 * Follows STYLE_GUIDE.md specifications:
 * - Responsive 6-column grid
 * - Channel cards with percentage bars
 * - Proper hover states
 */

import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";
import { Radio } from "lucide-react";

interface ChannelBreakdownProps {
  data: Array<{ channel: string; count: number; icon: string }>;
  className?: string;
}

const CHANNEL_CONFIG: Record<string, {
  label: string;
  colorClass: string;
  bgClass: string;
  barClass: string;
}> = {
  web:       { label: "Web Widget", colorClass: "text-blue-400",    bgClass: "bg-blue-500/10",    barClass: "bg-blue-500" },
  whatsapp:  { label: "WhatsApp",   colorClass: "text-emerald-400", bgClass: "bg-emerald-500/10", barClass: "bg-emerald-500" },
  instagram: { label: "Instagram",  colorClass: "text-pink-400",    bgClass: "bg-pink-500/10",    barClass: "bg-pink-500" },
  facebook:  { label: "Facebook",   colorClass: "text-blue-400",    bgClass: "bg-blue-500/10",    barClass: "bg-blue-500" },
  email:     { label: "Email",      colorClass: "text-violet-400",  bgClass: "bg-violet-500/10",  barClass: "bg-violet-500" },
  sms:       { label: "SMS",        colorClass: "text-amber-400",   bgClass: "bg-amber-500/10",   barClass: "bg-amber-500" },
};

export function ChannelBreakdown({ data, className }: ChannelBreakdownProps) {
  const navigate = useNavigate();
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:border-border/80",
      className
    )}>
      {/* Card content - no header, integrated into section */}
      <div className="p-4 sm:p-5">
        {data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.map((item) => {
              const config = CHANNEL_CONFIG[item.channel] || {
                label: item.channel,
                colorClass: "text-muted-foreground",
                bgClass: "bg-muted",
                barClass: "bg-muted-foreground",
              };
              const percentage = totalCount > 0 
                ? Math.round((item.count / totalCount) * 100) 
                : 0;
              const barWidth = (item.count / maxCount) * 100;

              return (
                <div
                  key={item.channel}
                  onClick={() => navigate(`/dashboard/channels/${item.channel}`)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4",
                    "cursor-pointer transition-all duration-200",
                    "hover:border-primary/20 hover:shadow-soft-sm",
                  )}
                >
                  {/* Gradient accent on hover */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    config.bgClass.replace('/10', '/5'),
                  )} />
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Channel icon */}
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3",
                      config.bgClass,
                    )}>
                      <ChannelIcon channel={item.channel} size={20} />
                    </div>
                    
                    {/* Channel name */}
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1 truncate w-full">
                      {config.label}
                    </span>
                    
                    {/* Count */}
                    <span className="text-lg sm:text-xl font-bold font-mono text-foreground">
                      {item.count.toLocaleString()}
                    </span>
                    
                    {/* Percentage bar */}
                    <div className="w-full mt-2 sm:mt-3">
                      <div className="h-1 sm:h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out",
                            config.barClass,
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground mt-1 block">
                        {percentage}% of total
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Radio className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              No channel data available
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Connect channels to see performance breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
