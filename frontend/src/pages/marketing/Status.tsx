import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, ArrowLeft,
  RefreshCw, Mail, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   STATUS PAGE
   Real-time service status with uptime history and incident log
   
   Design principles:
   - Clear status indicators at a glance
   - Interactive incident timeline
   - Visual uptime history
   - Email subscription for updates
   ═══════════════════════════════════════════════════════════════════════════════ */

// Animation hook for scroll-triggered reveals
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

type ServiceStatus = "operational" | "degraded" | "outage";

interface Service {
  name: string;
  status: ServiceStatus;
  uptime: number;
  uptimeHistory: ServiceStatus[];
}

interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  createdAt: string;
  updatedAt: string;
  updates: {
    time: string;
    status: string;
    message: string;
  }[];
}

// Mock service data
const SERVICES: Service[] = [
  {
    name: "API",
    status: "operational",
    uptime: 99.98,
    uptimeHistory: Array(90).fill("operational"),
  },
  {
    name: "Chat Widget",
    status: "operational",
    uptime: 99.99,
    uptimeHistory: Array(90).fill("operational"),
  },
  {
    name: "WhatsApp",
    status: "operational",
    uptime: 99.95,
    uptimeHistory: [...Array(88).fill("operational"), "degraded", "operational"],
  },
  {
    name: "Instagram",
    status: "operational",
    uptime: 99.92,
    uptimeHistory: [...Array(87).fill("operational"), "degraded", "degraded", "operational"],
  },
  {
    name: "Email",
    status: "operational",
    uptime: 99.99,
    uptimeHistory: Array(90).fill("operational"),
  },
  {
    name: "Dashboard",
    status: "operational",
    uptime: 99.97,
    uptimeHistory: Array(90).fill("operational"),
  },
  {
    name: "Document Processing",
    status: "operational",
    uptime: 99.90,
    uptimeHistory: [...Array(85).fill("operational"), "degraded", ...Array(4).fill("operational")],
  },
];

// Mock incident data
const INCIDENTS: Incident[] = [
  {
    id: "inc-001",
    title: "WhatsApp Message Delays",
    status: "resolved",
    severity: "minor",
    createdAt: "2026-02-28T14:30:00Z",
    updatedAt: "2026-02-28T15:45:00Z",
    updates: [
      {
        time: "2026-02-28T15:45:00Z",
        status: "Resolved",
        message: "The issue has been fully resolved. WhatsApp messages are processing normally.",
      },
      {
        time: "2026-02-28T15:15:00Z",
        status: "Monitoring",
        message: "A fix has been implemented. We are monitoring to ensure stability.",
      },
      {
        time: "2026-02-28T14:45:00Z",
        status: "Identified",
        message: "The issue has been identified as a rate limiting problem with our WhatsApp API connection.",
      },
      {
        time: "2026-02-28T14:30:00Z",
        status: "Investigating",
        message: "We are investigating reports of delayed WhatsApp message delivery.",
      },
    ],
  },
  {
    id: "inc-002",
    title: "Document Processing Slow",
    status: "resolved",
    severity: "minor",
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-02-20T11:30:00Z",
    updates: [
      {
        time: "2026-02-20T11:30:00Z",
        status: "Resolved",
        message: "Document processing speeds have returned to normal.",
      },
      {
        time: "2026-02-20T10:00:00Z",
        status: "Investigating",
        message: "We are seeing slower than normal document processing times.",
      },
    ],
  },
];

const STATUS_CONFIG = {
  operational: {
    label: "Operational",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
  },
  degraded: {
    label: "Degraded Performance",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
  outage: {
    label: "Major Outage",
    icon: XCircle,
    color: "text-rose-400",
    bg: "bg-rose-500",
    borderColor: "border-rose-500/30",
    bgColor: "bg-rose-500/10",
  },
};

export default function Status() {
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const headerRef = useInView();

  // Calculate overall status
  const hasOutage = SERVICES.some((s) => s.status === "outage");
  const hasDegraded = SERVICES.some((s) => s.status === "degraded");
  const overallStatus: ServiceStatus = hasOutage
    ? "outage"
    : hasDegraded
    ? "degraded"
    : "operational";

  const overallConfig = STATUS_CONFIG[overallStatus];
  const OverallIcon = overallConfig.icon;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-8 lg:pt-40 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />

        <div 
          ref={headerRef.ref}
          className={cn(
            "relative max-w-3xl mx-auto px-6 lg:px-8 transition-all duration-700",
            headerRef.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            System Status
          </h1>
          <p className="text-muted-foreground">
            Real-time status of NexaChat services and infrastructure.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          OVERALL STATUS BANNER
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-8">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className={cn(
            "p-6 rounded-xl border flex items-center gap-4",
            overallConfig.borderColor,
            overallConfig.bgColor
          )}>
            <OverallIcon className={cn("h-8 w-8", overallConfig.color)} />
            <div className="flex-1">
              <h2 className="font-heading text-xl font-semibold text-foreground">{overallConfig.label}</h2>
              <p className="text-sm text-muted-foreground">
                {overallStatus === "operational"
                  ? "All systems are operating normally."
                  : overallStatus === "degraded"
                  ? "Some systems are experiencing issues."
                  : "We are experiencing a major outage."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SERVICES TABLE
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Services
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            {SERVICES.map((service, index) => {
              const config = STATUS_CONFIG[service.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={service.name}
                  className={cn(
                    "flex items-center justify-between p-4",
                    index !== SERVICES.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={cn("h-5 w-5", config.color)} />
                    <span className="font-medium text-foreground">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* 30-day uptime bar */}
                    <div className="hidden sm:flex items-center gap-0.5">
                      {service.uptimeHistory.slice(-30).map((status, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-6 rounded-sm",
                            STATUS_CONFIG[status].bg,
                            status === "operational" && "opacity-40"
                          )}
                          title={`Day ${i + 1}: ${STATUS_CONFIG[status].label}`}
                        />
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold text-foreground">{service.uptime}%</p>
                      <p className="text-xs text-muted-foreground">30-day uptime</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          UPTIME HISTORY
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
            90-Day Uptime History
          </p>
          <div className="space-y-4">
            {SERVICES.map((service) => (
              <div key={service.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{service.name}</span>
                  <span className="text-sm font-mono text-muted-foreground">{service.uptime}%</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {service.uptimeHistory.map((status, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-6 rounded-sm transition-all hover:scale-y-110",
                        STATUS_CONFIG[status].bg,
                        status === "operational" && "opacity-30 hover:opacity-50"
                      )}
                      title={`Day ${90 - i}: ${STATUS_CONFIG[status].label}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          INCIDENT HISTORY
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
            Incident History
          </p>
          {INCIDENTS.length > 0 ? (
            <div className="space-y-4">
              {INCIDENTS.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedIncident(
                        expandedIncident === incident.id ? null : incident.id
                      )
                    }
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {incident.status === "resolved" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-400" />
                      )}
                      <div className="text-left">
                        <h3 className="font-medium text-foreground">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(incident.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        incident.status === "resolved"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      )}>
                        {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                      </span>
                      {expandedIncident === incident.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedIncident === incident.id && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="mt-4 space-y-4">
                        {incident.updates.map((update, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-16 flex-shrink-0 text-xs text-muted-foreground font-mono">
                              {formatTime(update.time)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-primary">
                                {update.status}
                              </p>
                              <p className="text-sm text-muted-foreground">{update.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-border bg-card/50">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No incidents reported in the last 90 days.</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SUBSCRIBE TO UPDATES
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="pb-24 lg:pb-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="p-8 rounded-xl border border-border bg-card/50">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <p className="font-heading text-lg font-semibold text-foreground">Subscribe to Updates</p>
            </div>
            <p className="text-muted-foreground mb-6">
              Get notified about service disruptions and scheduled maintenance.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>You're subscribed! We'll notify you of any incidents.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-10"
                />
                <Button type="submit" className="h-10">
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
