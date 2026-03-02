import { Globe, MessageCircle, Instagram, Facebook, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelBreakdownProps {
  data: Array<{ channel: string; count: number; icon: string }>;
  className?: string;
}

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  web: { icon: Globe, color: "#4F8EF7", label: "Web Widget" },
  whatsapp: { icon: MessageCircle, color: "#25D366", label: "WhatsApp" },
  instagram: { icon: Instagram, color: "#E4405F", label: "Instagram" },
  facebook: { icon: Facebook, color: "#1877F2", label: "Facebook" },
  email: { icon: Mail, color: "#EA4335", label: "Email" },
  sms: { icon: Smartphone, color: "#FFB800", label: "SMS" },
};

export function ChannelBreakdown({ data, className }: ChannelBreakdownProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", className)} style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
      <h3 className="text-sm font-semibold font-heading mb-4" style={{ color: "#F9FAFB" }}>
        Channel Breakdown
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.length > 0 ? (
          data.map((item) => {
            const config = CHANNEL_CONFIG[item.channel] || {
              icon: Globe,
              color: "#6B7280",
              label: item.channel,
            };
            const Icon = config.icon;
            const percentage = (item.count / maxCount) * 100;

            return (
              <div
                key={item.channel}
                className="flex flex-col items-center p-3 rounded-lg transition-colors"
                style={{ backgroundColor: "#252A33" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <span className="text-xs font-medium font-description truncate w-full text-center" style={{ color: "#F9FAFB" }}>
                  {config.label}
                </span>
                <span className="text-lg font-bold font-mono mt-1" style={{ color: "#F9FAFB" }}>
                  {item.count}
                </span>
                <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "#1C1F26" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-6 text-center">
            <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>No channel data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
