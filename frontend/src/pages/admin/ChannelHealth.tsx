import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  MessageCircle, 
  Mail, 
  Phone, 
  Instagram, 
  Globe,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChannelIcon } from "@/lib/channelMeta";
import { channelsApi, type ChannelHealthItem, type ChannelHealthResponse } from "@/lib/api";

interface ChannelMessageLog {
  id: string;
  direction: "inbound" | "outbound";
  status: "delivered" | "failed" | "pending";
  timestamp: string;
  preview: string;
  error?: string;
}

// Sample health data used for local development when API is not available
const MOCK_HEALTH_DATA: ChannelHealthItem[] = [
  {
    channel: "whatsapp",
    status: "active",
    messages_today: 127,
    messages_change: 12.5,
    delivery_rate: 98.4,
    connected_at: "2026-01-12T10:30:00Z",
    phone_number: "+254 700 000 001",
  },
  {
    channel: "email",
    status: "active",
    messages_today: 12,
    messages_change: -8.3,
    delivery_rate: 100,
    connected_at: "2026-01-10T08:00:00Z",
  },
  {
    channel: "sms",
    status: "warning",
    messages_today: 41,
    messages_change: 0,
    delivery_rate: 72.1,
    last_error: "Token expired",
    last_error_at: "2026-03-09T14:30:00Z",
    connected_at: "2026-02-01T12:00:00Z",
    phone_number: "21606",
  },
  {
    channel: "messenger",
    status: "active",
    messages_today: 23,
    messages_change: 45.2,
    delivery_rate: 95.2,
    connected_at: "2026-01-28T16:45:00Z",
    account_name: "Simca Cleaning KE",
  },
  {
    channel: "instagram",
    status: "active",
    messages_today: 8,
    messages_change: 15.0,
    delivery_rate: 100,
    connected_at: "2026-02-05T09:15:00Z",
    account_name: "@simcacleaning",
  },
  {
    channel: "widget",
    status: "active",
    messages_today: 34,
    messages_change: -3.2,
    delivery_rate: 100,
    connected_at: "2025-12-15T00:00:00Z",
  },
];

const EMPTY_HEALTH_DATA: ChannelHealthItem[] = [];

const MOCK_MESSAGE_LOGS: Record<string, ChannelMessageLog[]> = {
  whatsapp: [
    { id: "1", direction: "inbound", status: "delivered", timestamp: "2026-03-10T14:30:00Z", preview: "Hi, I need your cleaning services" },
    { id: "2", direction: "outbound", status: "delivered", timestamp: "2026-03-10T14:31:00Z", preview: "Hi! Thanks for reaching out..." },
    { id: "3", direction: "inbound", status: "delivered", timestamp: "2026-03-10T14:25:00Z", preview: "What's your pricing?" },
    { id: "4", direction: "outbound", status: "failed", timestamp: "2026-03-10T14:20:00Z", preview: "Here's our price list...", error: "Rate limit exceeded" },
    { id: "5", direction: "inbound", status: "delivered", timestamp: "2026-03-10T14:15:00Z", preview: "Do you service my area?" },
  ],
  sms: [
    { id: "1", direction: "inbound", status: "delivered", timestamp: "2026-03-10T14:28:00Z", preview: "INFO" },
    { id: "2", direction: "outbound", status: "failed", timestamp: "2026-03-10T14:27:00Z", preview: "Your booking is confirmed...", error: "Token expired" },
    { id: "3", direction: "inbound", status: "delivered", timestamp: "2026-03-10T14:20:00Z", preview: "STOP" },
  ],
};

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { status: ChannelHealthItem["status"] }) {
  const config = {
    active: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Active" },
    warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Needs attention" },
    error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Error" },
    disconnected: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted", label: "Disconnected" },
  };
  
  const { icon: Icon, color, bg, label } = config[status];
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", bg, color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function ChannelRow({ 
  channel, 
  onClick,
  selected 
}: { 
  channel: ChannelHealth; 
  onClick: () => void;
  selected?: boolean;
}) {
  const trendIcon = channel.messages_change >= 0 ? TrendingUp : TrendingDown;
  const trendColor = channel.messages_change >= 0 ? "text-emerald-500" : "text-red-500";
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
        selected 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <div className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center",
        channel.status === "active" && "bg-emerald-500/10",
        channel.status === "warning" && "bg-amber-500/10",
        channel.status === "error" && "bg-red-500/10",
      )}>
        <ChannelIcon channel={channel.channel} size={24} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground capitalize">
            {channel.channel === "widget" ? "Web Widget" : channel.channel}
          </span>
          <StatusBadge status={channel.status} />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {channel.phone_number || channel.account_name || "Connected"}
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-lg font-semibold text-foreground">
            {channel.messages_today}
          </span>
          <trendIcon className={cn("h-4 w-4", trendColor)} />
        </div>
        <div className="text-xs text-muted-foreground">
          {channel.delivery_rate}% delivery
        </div>
      </div>
    </button>
  );
}

function MessageLogList({ logs }: { logs: ChannelMessageLog[] }) {
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            log.status === "failed" && "border-red-200 bg-red-500/5",
            log.status === "delivered" && "border-border",
            log.status === "pending" && "border-amber-200 bg-amber-500/5",
          )}
        >
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
            log.direction === "inbound" ? "bg-muted" : "bg-primary/10",
          )}>
            {log.direction === "inbound" ? (
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-180" />
            ) : (
              <ArrowRight className="h-4 w-4 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground capitalize">
                {log.direction}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(log.timestamp)}
              </span>
              <Badge 
                variant={log.status === "delivered" ? "success" : log.status === "failed" ? "destructive" : "warning"}
                className="text-[10px]"
              >
                {log.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {log.preview}
            </p>
            {log.error && (
              <p className="text-xs text-red-500 mt-1">
                Error: {log.error}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChannelHealthDashboard() {
  const { toast } = useToast();
  const [healthData, setHealthData] = useState<ChannelHealthItem[]>(EMPTY_HEALTH_DATA);
  const [selectedChannel, setSelectedChannel] = useState<string>("whatsapp");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "details">("overview");
  
  const loadHealthData = async () => {
    setLoading(true);
    try {
      const response = await channelsApi.getHealth();
      setHealthData(response.channels);
    } catch (error) {
      toast({
        title: "Failed to load health data",
        description: "Could not fetch channel health metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadHealthData();
  }, []);
  
  const selectedChannelData = healthData.find(c => c.channel === selectedChannel);
  const messageLogs = MOCK_MESSAGE_LOGS[selectedChannel] || [];
  
  const totalMessages = healthData.reduce((sum, c) => sum + c.messages_today, 0);
  const avgDelivery = healthData.reduce((sum, c) => sum + c.delivery_rate, 0) / healthData.filter(c => c.status !== "disconnected").length;
  
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Channel Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Monitor your channel performance and troubleshoot issues
          </p>
        </div>
        
        <Button variant="outline" onClick={loadHealthData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
                <p className="text-sm text-muted-foreground">Messages Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgDelivery.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Avg Delivery Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-violet-500/5 to-violet-500/10 border-violet-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{healthData.filter(c => c.status === "active").length}/{healthData.length}</p>
                <p className="text-sm text-muted-foreground">Active Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthData.map((channel) => (
              <ChannelRow
                key={channel.channel}
                channel={channel}
                selected={selectedChannel === channel.channel}
                onClick={() => setSelectedChannel(channel.channel)}
              />
            ))}
          </CardContent>
        </Card>
        
        {/* Channel Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ChannelIcon channel={selectedChannel} size={20} />
                <span className="capitalize">
                  {selectedChannel === "widget" ? "Web Widget" : selectedChannel}
                </span>
              </CardTitle>
              {selectedChannelData && (
                <StatusBadge status={selectedChannelData.status} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Message Log</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                {selectedChannelData && (
                  <>
                    {/* Connection Info */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">CONNECTION DETAILS</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Status</span>
                          <p className="font-medium text-foreground flex items-center gap-1.5">
                            {selectedChannelData.status === "active" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            {selectedChannelData.status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            {selectedChannelData.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                            {selectedChannelData.status === "disconnected" && <XCircle className="h-4 w-4 text-muted-foreground" />}
                            <span className="capitalize">{selectedChannelData.status}</span>
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Connected Since</span>
                          <p className="font-medium text-foreground">
                            {selectedChannelData.connected_at 
                              ? new Date(selectedChannelData.connected_at).toLocaleDateString()
                              : "—"
                            }
                          </p>
                        </div>
                        {selectedChannelData.phone_number && (
                          <div>
                            <span className="text-muted-foreground">Phone Number</span>
                            <p className="font-medium text-foreground font-mono">
                              {selectedChannelData.phone_number}
                            </p>
                          </div>
                        )}
                        {selectedChannelData.account_name && (
                          <div>
                            <span className="text-muted-foreground">Account</span>
                            <p className="font-medium text-foreground">
                              {selectedChannelData.account_name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Error Alert */}
                    {selectedChannelData.last_error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-700 dark:text-red-300">
                              {selectedChannelData.last_error}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedChannelData.last_error_at && formatRelativeTime(selectedChannelData.last_error_at)}
                            </p>
                            <Button variant="outline" size="sm" className="mt-3">
                              Fix Issue
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {selectedChannelData.messages_today}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Messages Today</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className={cn(
                          "text-2xl font-bold",
                          selectedChannelData.messages_change >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          {selectedChannelData.messages_change >= 0 ? "+" : ""}
                          {selectedChannelData.messages_change}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">vs Yesterday</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className={cn(
                          "text-2xl font-bold",
                          selectedChannelData.delivery_rate >= 95 ? "text-emerald-500" : 
                          selectedChannelData.delivery_rate >= 70 ? "text-amber-500" : "text-red-500"
                        )}>
                          {selectedChannelData.delivery_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Delivery Rate</p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="details">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">RECENT MESSAGES</h4>
                {messageLogs.length > 0 ? (
                  <MessageLogList logs={messageLogs} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent messages</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
