import { useState, Fragment } from "react";
import {
  Search, Check, X, ExternalLink, Settings2, Activity,
  AlertCircle, RefreshCw, Power, ChevronRight, Zap,
  BarChart3, ShoppingCart, Mail, Calendar, GitBranch,
} from "lucide-react";
import {
  SiHubspot, SiZoho, SiSalesforce,
  SiMailchimp,
  SiCalendly, SiGooglecalendar,
  SiGoogleanalytics, SiMixpanel,
  SiShopify, SiWoocommerce, SiStripe,
  SiZapier, SiMake, SiN8N
} from "react-icons/si";
import { FaRegEnvelope, FaCalendarAlt } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

type IntegrationStatus = "connected" | "not_connected" | "error";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  brandColor: string;
  status: IntegrationStatus;
  category: string;
  authMethod: "oauth" | "api_key";
  lastSync?: string;
  syncCount?: number;
  errorMessage?: string;
}

interface SyncEvent {
  id: string;
  type: "success" | "error";
  message: string;
  timestamp: string;
  details?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   INTEGRATION DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: "crm", label: "CRM", icon: <BarChart3 size={14} /> },
  { id: "email", label: "Email Marketing", icon: <Mail size={14} /> },
  { id: "scheduling", label: "Scheduling", icon: <Calendar size={14} /> },
  { id: "analytics", label: "Analytics", icon: <Activity size={14} /> },
  { id: "ecommerce", label: "Ecommerce", icon: <ShoppingCart size={14} /> },
  { id: "automation", label: "Automation", icon: <Zap size={14} /> },
] as const;

const INTEGRATIONS: Integration[] = [
  // CRM
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync leads automatically to HubSpot when captured",
    icon: <SiHubspot size={24} />,
    brandColor: "#FF7A59",
    status: "connected",
    category: "crm",
    authMethod: "oauth",
    lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    syncCount: 147,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Create deals from leads",
    icon: <BarChart3 size={24} />,
    brandColor: "#25292C",
    status: "not_connected",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Push contacts",
    icon: <SiZoho size={24} />,
    brandColor: "#C8202B",
    status: "not_connected",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise clients",
    icon: <SiSalesforce size={24} />,
    brandColor: "#00A1E0",
    status: "not_connected",
    category: "crm",
    authMethod: "oauth",
  },
  // Email Marketing
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Add leads to lists",
    icon: <SiMailchimp size={24} />,
    brandColor: "#FFE01B",
    status: "connected",
    category: "email",
    authMethod: "oauth",
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    syncCount: 89,
  },
  {
    id: "convertkit",
    name: "ConvertKit",
    description: "Tag and segment",
    icon: <FaRegEnvelope size={24} />,
    brandColor: "#FB6970",
    status: "not_connected",
    category: "email",
    authMethod: "api_key",
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    description: "Trigger automations",
    icon: <Mail size={24} />,
    brandColor: "#356AE6",
    status: "error",
    category: "email",
    authMethod: "api_key",
    errorMessage: "API key expired. Please reconnect.",
  },
  // Scheduling
  {
    id: "calendly",
    name: "Calendly",
    description: "Book meetings from chat",
    icon: <SiCalendly size={24} />,
    brandColor: "#006BFF",
    status: "connected",
    category: "scheduling",
    authMethod: "oauth",
    lastSync: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    syncCount: 23,
  },
  {
    id: "calcom",
    name: "Cal.com",
    description: "Open source alternative",
    icon: <FaCalendarAlt size={24} />,
    brandColor: "#292929",
    status: "not_connected",
    category: "scheduling",
    authMethod: "api_key",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Booking requests",
    icon: <SiGooglecalendar size={24} />,
    brandColor: "#4285F4",
    status: "not_connected",
    category: "scheduling",
    authMethod: "oauth",
  },
  // Analytics
  {
    id: "google_analytics",
    name: "Google Analytics",
    description: "Track chat events",
    icon: <SiGoogleanalytics size={24} />,
    brandColor: "#E37400",
    status: "connected",
    category: "analytics",
    authMethod: "oauth",
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    syncCount: 1247,
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    description: "User behavior",
    icon: <SiMixpanel size={24} />,
    brandColor: "#7856FF",
    status: "not_connected",
    category: "analytics",
    authMethod: "api_key",
  },
  {
    id: "segment",
    name: "Segment",
    description: "Data pipeline",
    icon: <GitBranch size={24} />,
    brandColor: "#52BD94",
    status: "not_connected",
    category: "analytics",
    authMethod: "api_key",
  },
  // Ecommerce
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync product catalog for chatbot knowledge",
    icon: <SiShopify size={24} />,
    brandColor: "#96BF48",
    status: "not_connected",
    category: "ecommerce",
    authMethod: "oauth",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Sync product catalog for chatbot knowledge",
    icon: <SiWoocommerce size={24} />,
    brandColor: "#96588A",
    status: "not_connected",
    category: "ecommerce",
    authMethod: "api_key",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment status queries",
    icon: <SiStripe size={24} />,
    brandColor: "#635BFF",
    status: "not_connected",
    category: "ecommerce",
    authMethod: "api_key",
  },
  // Automation
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 5000+ apps. When lead captured, do anything",
    icon: <SiZapier size={24} />,
    brandColor: "#FF4F00",
    status: "connected",
    category: "automation",
    authMethod: "oauth",
    lastSync: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    syncCount: 312,
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Visual automations",
    icon: <SiMake size={24} />,
    brandColor: "#6D00CC",
    status: "not_connected",
    category: "automation",
    authMethod: "api_key",
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Self-hosted option",
    icon: <SiN8N size={24} />,
    brandColor: "#EA4B71",
    status: "not_connected",
    category: "automation",
    authMethod: "api_key",
  },
];

const MOCK_SYNC_EVENTS: SyncEvent[] = [
  { id: "1", type: "success", message: "Lead synced to HubSpot", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), details: "Contact: sarah@acme.com" },
  { id: "2", type: "success", message: "Lead synced to HubSpot", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), details: "Contact: marcus@tech.io" },
  { id: "3", type: "error", message: "Failed to sync to ActiveCampaign", timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), details: "API key invalid" },
  { id: "4", type: "success", message: "Meeting booked via Calendly", timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), details: "Demo call with Emily Chen" },
  { id: "5", type: "success", message: "Event tracked in Google Analytics", timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), details: "chat_started" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function StatusIndicator({ status }: { status: IntegrationStatus }) {
  const config = {
    connected: {
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      label: "Connected",
    },
    not_connected: {
      dot: "bg-gray-400",
      text: "text-muted-foreground",
      label: "Not connected",
    },
    error: {
      dot: "bg-rose-400",
      text: "text-rose-400",
      label: "Error",
    },
  };
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", c.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

function IntegrationCard({
  integration,
  onConnect,
  onConfigure,
}: {
  integration: Integration;
  onConnect: () => void;
  onConfigure: () => void;
}) {
  const isConnected = integration.status === "connected";
  const hasError = integration.status === "error";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5 transition-all duration-200",
        "hover:border-primary/20 hover:shadow-soft-sm group",
        hasError && "border-rose-500/30"
      )}
    >
      {/* Gradient accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative flex flex-col h-full">
        {/* Header: Icon + Name + Status */}
        <div className="flex items-start gap-3 mb-3">
          {/* Logo container */}
          <div
            className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 border bg-card"
            style={{ color: integration.brandColor }}
          >
            {integration.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-sm text-foreground leading-tight">
              {integration.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-description">
              {integration.description}
            </p>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          <StatusIndicator status={integration.status} />

          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {integration.lastSync && relativeTime(integration.lastSync)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onConfigure}
              >
                <Settings2 size={14} className="text-muted-foreground" />
              </Button>
            </div>
          ) : hasError ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              onClick={onConnect}
            >
              <RefreshCw size={12} />
              Reconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={onConnect}
            >
              Connect
            </Button>
          )}
        </div>

        {/* Error message */}
        {hasError && integration.errorMessage && (
          <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-[10px] text-rose-400 flex items-center gap-1">
              <AlertCircle size={10} />
              {integration.errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DETAIL DIALOG
   ═══════════════════════════════════════════════════════════════════════════════ */

function IntegrationDetailDialog({
  integration,
  open,
  onOpenChange,
}: {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<"config" | "activity" | "errors">("config");

  if (!integration) return null;

  const isConnected = integration.status === "connected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 z-10">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center border bg-card"
              style={{ color: integration.brandColor }}
            >
              {integration.icon}
            </div>
            <div>
              <DialogTitle className="font-heading text-base font-semibold text-foreground">
                {integration.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {integration.description}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex items-center gap-1">
            {(["config", "activity", "errors"] as const).map((tab, i) => (
              <Fragment key={tab}>
                {i > 0 && <div className="h-4 w-px bg-border mx-1" />}
                <button
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold font-heading transition-all capitalize",
                    activeTab === tab
                      ? "text-primary border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "config" && <Settings2 size={13} />}
                  {tab === "activity" && <Activity size={13} />}
                  {tab === "errors" && <AlertCircle size={13} />}
                  {tab === "config" ? "Configuration" : tab === "activity" ? "Activity Log" : "Error Log"}
                </button>
              </Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {activeTab === "config" && (
            <>
              {/* Connection status */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    isConnected ? "bg-emerald-500/10" : "bg-gray-500/10"
                  )}>
                    {isConnected ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <X size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isConnected ? "Connected" : "Not Connected"}
                    </p>
                    {isConnected && integration.lastSync && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Last sync: {relativeTime(integration.lastSync)}
                      </p>
                    )}
                  </div>
                </div>
                {isConnected ? (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/10">
                    <Power size={12} />
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" className="h-8 text-xs gap-1.5">
                    <ExternalLink size={12} />
                    {integration.authMethod === "oauth" ? "Connect with OAuth" : "Enter API Key"}
                  </Button>
                )}
              </div>

              {/* Data flow diagram placeholder */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                  Data Flow
                </h4>
                <div className="p-4 rounded-xl border bg-muted/20 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="px-3 py-2 rounded-lg border bg-card text-xs font-medium">
                      AcmeDesk
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                    <div className="px-3 py-2 rounded-lg border bg-card text-xs font-medium" style={{ color: integration.brandColor }}>
                      {integration.name}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Leads captured in AcmeDesk are synced to {integration.name}
                  </p>
                </div>
              </div>

              {/* Sync settings */}
              {isConnected && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-3">
                    Sync Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Sync Frequency</p>
                        <p className="text-[11px] text-muted-foreground">How often to sync data</p>
                      </div>
                      <Select defaultValue="realtime">
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Real-time</SelectItem>
                          <SelectItem value="5min">Every 5 minutes</SelectItem>
                          <SelectItem value="15min">Every 15 minutes</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Field Mapping</p>
                        <p className="text-[11px] text-muted-foreground">Map AcmeDesk fields to {integration.name}</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "activity" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground mb-3">Last 50 sync events</p>
              {MOCK_SYNC_EVENTS.filter(e => e.type === "success").slice(0, 5).map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{event.message}</p>
                    {event.details && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{event.details}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "errors" && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground mb-3">Failed syncs with reason</p>
              {MOCK_SYNC_EVENTS.filter(e => e.type === "error").map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                  <div className="h-6 w-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <X size={12} className="text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{event.message}</p>
                    {event.details && (
                      <p className="text-[11px] text-rose-400 mt-0.5">{event.details}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              ))}
              {MOCK_SYNC_EVENTS.filter(e => e.type === "error").length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Check size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No errors</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">All syncs completed successfully</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Integrations() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isLoading] = useState(false);

  // Filter integrations
  const filteredIntegrations = INTEGRATIONS.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(search.toLowerCase()) ||
      integration.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || integration.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || integration.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group by category
  const groupedIntegrations = CATEGORIES.map(cat => ({
    ...cat,
    integrations: filteredIntegrations.filter(i => i.category === cat.id),
  })).filter(cat => cat.integrations.length > 0);

  // Stats
  const connectedCount = INTEGRATIONS.filter(i => i.status === "connected").length;
  const errorCount = INTEGRATIONS.filter(i => i.status === "error").length;

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDetailOpen(true);
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">

      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Connect your favorite tools
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Sync All</span>
          </Button>
        </div>
      </div>

      {/* ─── Stats Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
              Total Integrations
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
              {INTEGRATIONS.length}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
              Connected
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-emerald-400">
              {connectedCount}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
              Available
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
              {INTEGRATIONS.length - connectedCount}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
              Needs Attention
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-rose-400">
              {errorCount}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Category Tabs ──────────────────────────────────────────────────── */}
      {/* Mobile: 3-column grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:hidden">
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold font-heading transition-all",
            categoryFilter === "all"
              ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          All
        </button>
        {CATEGORIES.slice(0, 5).map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold font-heading transition-all",
              categoryFilter === cat.id
                ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
            )}
          >
            {cat.icon}
            {cat.label.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Tablet: 3-column grid with full labels */}
      <div className="hidden sm:grid lg:hidden grid-cols-4 gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold font-heading transition-all",
            categoryFilter === "all"
              ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold font-heading transition-all",
              categoryFilter === cat.id
                ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
            )}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Desktop: inline row with dividers */}
      <div className="hidden lg:flex items-center gap-1 w-fit">
        <button
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-heading transition-all whitespace-nowrap",
            categoryFilter === "all"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          All
        </button>
        {CATEGORIES.map((cat) => (
          <Fragment key={cat.id}>
            <div className="h-5 w-px bg-border mx-0.5" />
            <button
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-heading transition-all whitespace-nowrap",
                categoryFilter === cat.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          </Fragment>
        ))}
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search integrations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-xs bg-card">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="connected">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Connected
              </span>
            </SelectItem>
            <SelectItem value="not_connected">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Not Connected
              </span>
            </SelectItem>
            <SelectItem value="error">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Error
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {(search || categoryFilter !== "all" || statusFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ─── Integrations Grid ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i}>
              <Skeleton className="h-4 w-32 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(j => (
                  <Skeleton key={j} className="h-[140px] rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filteredIntegrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No integrations found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
          <Button
            variant="link"
            size="sm"
            className="text-primary text-xs mt-2"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : categoryFilter === "all" ? (
        // Grouped by category view
        <div className="space-y-8">
          {groupedIntegrations.map(category => (
            <div key={category.id}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">{category.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap">
                  {category.label}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.integrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConnect={() => handleConnect(integration)}
                    onConfigure={() => handleConfigure(integration)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Single category grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredIntegrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={() => handleConnect(integration)}
              onConfigure={() => handleConfigure(integration)}
            />
          ))}
        </div>
      )}

      {/* ─── Integration Detail Dialog ──────────────────────────────────────── */}
      <IntegrationDetailDialog
        integration={selectedIntegration}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
