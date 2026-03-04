import { cn } from "@/lib/utils";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

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
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 sm:p-5",
      className
    )}>
      <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
        Channel Breakdown
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.length > 0 ? (
          data.map((item) => {
            const config = CHANNEL_CONFIG[item.channel] || {
              label: item.channel,
              colorClass: "text-muted-foreground",
              bgClass: "bg-muted",
              barClass: "bg-muted-foreground",
            };
            const percentage = (item.count / maxCount) * 100;

            return (
              <div
                key={item.channel}
                className={cn(
                  "group flex flex-col items-center p-3 rounded-lg",
                  "bg-muted/50 transition-colors duration-200",
                  "hover:bg-muted",
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                  config.bgClass,
                )}>
                  <ChannelIcon channel={item.channel} size={20} />
                </div>
                <span className="text-xs font-medium font-description truncate w-full text-center text-foreground">
                  {config.label}
                </span>
                <span className="text-lg font-bold font-mono mt-1 text-foreground">
                  {item.count}
                </span>
                <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      config.barClass,
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-6 text-center">
            <p className="text-sm font-description text-muted-foreground">
              No channel data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
