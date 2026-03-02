import { useNavigate } from "react-router-dom";
import { Globe, MessageCircle, Instagram, Facebook, Mail, Smartphone, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  web: Globe,
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  email: Mail,
  sms: Smartphone,
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/20",
  contacted: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  qualified: "bg-violet-500/15 text-violet-500 border-violet-500/20",
  converted: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  lost: "bg-rose-500/15 text-rose-500 border-rose-500/20",
};

export function RecentLeads({ data, className }: RecentLeadsProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("rounded-xl border overflow-hidden", className)} style={{ backgroundColor: "#1C1F26", borderColor: "#2D333B" }}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b" style={{ borderColor: "#2D333B" }}>
        <h3 className="text-sm font-semibold font-heading" style={{ color: "#F9FAFB" }}>
          Recent Leads
        </h3>
        <button
          onClick={() => navigate("/dashboard/leads")}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: "#4F8EF7" }}
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="divide-y" style={{ borderColor: "#2D333B" }}>
        {data.length > 0 ? (
          data.map((item) => {
            const Icon = CHANNEL_ICONS[item.channel] || Globe;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors cursor-pointer"
                style={{ backgroundColor: "#1C1F26" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#252A33"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#1C1F26"}
                onClick={() => navigate(`/dashboard/leads/${item.id}`)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#252A33" }}>
                  <Icon className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate font-description" style={{ color: "#F9FAFB" }}>
                    {item.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#9CA3AF" }}>
                    {item.email || "No email"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 border capitalize",
                      STATUS_COLORS[item.status] || "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {item.status}
                  </Badge>
                  <span className="text-[10px] font-mono" style={{ color: "#9CA3AF" }}>
                    {item.time_ago}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 sm:px-5 py-8 text-center">
            <p className="text-sm font-description" style={{ color: "#9CA3AF" }}>No recent leads</p>
          </div>
        )}
      </div>
    </div>
  );
}
