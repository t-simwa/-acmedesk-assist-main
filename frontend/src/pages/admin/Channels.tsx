import { useEffect, useState, lazy, Suspense } from "react";
import type { ChannelConfigItem } from "@/lib/api";
import { metaApi, channelsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wifi, WifiOff, Settings, Loader2, MoreVertical, Unplug, Activity, Lock, Crown, AlertTriangle, Check } from "lucide-react";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";
import { DisconnectChannelModal } from "@/components/admin/channel/DisconnectChannelModal";
import { ChannelSuccessScreen } from "@/components/admin/channel/ChannelSuccessScreen";
import { useNavigate } from "react-router-dom";

const WhatsAppSetupWizard = lazy(() => import("./channel-wizards/WhatsAppSetupWizard"));
const EmailSetupWizard = lazy(() => import("./channel-wizards/EmailSetupWizard"));
const SmsSetupWizard = lazy(() => import("./channel-wizards/SmsSetupWizard"));
const InstagramSetupWizard = lazy(() => import("./channel-wizards/InstagramSetupWizard"));
const MessengerSetupWizard = lazy(() => import("./channel-wizards/MessengerSetupWizard"));
const WebWidgetConfig = lazy(() => import("./channel-wizards/WebWidgetConfig"));

const CHANNEL_GRADIENT: Record<string, string> = {
  whatsapp: "from-emerald-500/20 to-emerald-500/5",
  email: "from-violet-500/20 to-violet-500/5",
  sms: "from-pink-500/20 to-pink-500/5",
  messenger: "from-blue-500/20 to-blue-500/5",
  instagram: "from-pink-500/20 to-pink-500/5",
  widget: "from-slate-500/20 to-slate-500/5",
};

const CHANNEL_FEATURES: Record<string, string[]> = {
  whatsapp: [
    "Handle text, voice, images",
    "Send interactive menus & buttons",
    "Works 24/7 with your AI",
  ],
  email: [
    "Auto-reply or draft for review",
    "Full thread continuity",
    "Smart confidence routing",
  ],
  sms: [
    "Two-way SMS conversations",
    "Ultra-concise AI responses",
    "STOP/HELP compliance built-in",
  ],
  messenger: [
    "Persistent menu in Messenger",
    "Welcome message + Get Started",
    "Rich cards and carousels",
  ],
  instagram: [
    "Respond to direct messages",
    "Auto-reply to story mentions",
    "Quick reply chips in DMs",
  ],
  widget: [
    "Embed on your website",
    "Real-time chat with customers",
    "Customizable appearance",
  ],
};

type WizardScreen = 
  | null 
  | "whatsapp-setup" 
  | "email-setup" 
  | "sms-setup" 
  | "instagram-setup" 
  | "messenger-setup"
  | "widget-config";

interface ChannelWithConfig extends ChannelConfigItem {
  config?: {
    page_id?: string;
    phone_number_id?: string;
    whatsapp_business_account_id?: string;
    [key: string]: string | undefined;
  };
  locked?: boolean;
  lockReason?: string;
}

export default function Channels() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<ChannelWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  
  const [activeWizard, setActiveWizard] = useState<WizardScreen>(null);
  const [showConfigFor, setShowConfigFor] = useState<null | string>(null);
  const [pages, setPages] = useState<Array<{id: string; name: string}>>([]);
  const [wbas, setWbas] = useState<Array<any>>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<{ wba?: string; phone_id?: string; display?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState<{ open: boolean; channel: ChannelWithConfig | null }>({ open: false, channel: null });
  const [successScreen, setSuccessScreen] = useState<{ show: boolean; channel: ChannelWithConfig | null }>({ show: false, channel: null });

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await channelsApi.list();
      if (response.channels) {
        setChannels(response.channels.map((c: ChannelConfigItem) => ({
          ...c,
          config: {},
        })));
      }
    } catch (error) {
      toast({
        title: "Failed to load channels",
        description: "Could not fetch channel configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const handleToggle = async (channel: string, nextEnabled: boolean) => {
    const previousChannels = [...channels];
    
    setChannels((prev) => prev.map((c) => 
      c.channel === channel ? { ...c, enabled: nextEnabled } : c
    ));

    const target = channels.find((c) => c.channel === channel);
    toast({
      title: nextEnabled ? "Channel enabled" : "Channel disabled",
      description: `${target?.display_name ?? channel} has been ${nextEnabled ? "enabled" : "disabled"}.`,
    });

    setToggling(channel);
    try {
      await channelsApi.toggle(channel, nextEnabled);
    } catch (err) {
      setChannels(previousChannels);
      toast({ 
        title: "Update failed", 
        description: `Could not update ${channel}`,
        variant: "destructive"
      });
    } finally {
      setToggling(null);
    }
  };

  const openMetaConnectPopup = async () => {
    try {
      setConnecting(true);
      const res = await metaApi.getAuthUrl();
      const url = res.url;
      const pop = window.open(url, "meta_oauth", "width=900,height=700");

      const onMessage = async (evt: MessageEvent) => {
        if (!evt.data || evt.data.type !== "meta_oauth") return;
        if (evt.data.status === "connected") {
          await loadChannels();
        }
      };

      window.addEventListener("message", onMessage);

      const timer = setInterval(() => {
        if (!pop || pop.closed) {
          clearInterval(timer);
          window.removeEventListener("message", onMessage);
          setConnecting(false);
        }
      }, 1000);
    } catch (e) {
      setConnecting(false);
      toast({ title: "Connect failed", description: "Could not initiate Meta OAuth", variant: "destructive" });
    }
  };

  const openConfigure = async (channel: string) => {
    setShowConfigFor(channel);
    try {
      setLoading(true);
      if (channel === "messenger") {
        const p = await metaApi.listPages();
        setPages(p.pages || []);
      } else if (channel === "whatsapp") {
        const w = await metaApi.listWhatsappAccounts();
        setWbas(w.whatsapp_business_accounts || []);
      }
    } catch (e) {
      toast({ title: "Failed to load providers", description: "Make sure Meta is connected", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveMessengerConfig = async () => {
    if (!selectedPage) return toast({ title: "Select a Page" });
    try {
      setLoading(true);
      const res = await fetch(`/api/channels/messenger/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: selectedPage }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Saved", description: "Messenger configuration saved" });
      setShowConfigFor(null);
      await loadChannels();
    } catch (e) {
      toast({ title: "Save failed", description: "Could not save configuration", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsappConfig = async () => {
    if (!selectedPhone) return toast({ title: "Select a phone" });
    try {
      setLoading(true);
      const res = await fetch(`/api/channels/whatsapp/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_business_account_id: selectedPhone.wba,
          phone_number_id: selectedPhone.phone_id,
          display_phone_number: selectedPhone.display,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Saved", description: "WhatsApp configuration saved" });
      setShowConfigFor(null);
      await loadChannels();
    } catch (e) {
      toast({ title: "Save failed", description: "Could not save configuration", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = async () => {
    setActiveWizard(null);
    await loadChannels();
    const connectedChannel = channels.find(c => c.channel === getChannelFromWizard(activeWizard));
    if (connectedChannel) {
      setSuccessScreen({ 
        show: true, 
        channel: { ...connectedChannel, connected: true } 
      });
    } else {
      toast({
        title: "Channel connected!",
        description: "Your channel has been set up successfully.",
      });
    }
  };

  const getChannelFromWizard = (wizard: WizardScreen): string => {
    const wizardToChannel: Record<WizardScreen, string> = {
      "whatsapp-setup": "whatsapp",
      "email-setup": "email",
      "sms-setup": "sms",
      "instagram-setup": "instagram",
      "messenger-setup": "messenger",
      "widget-config": "widget",
    };
    return wizardToChannel[wizard] || "";
  };

  const handleDisconnect = async (channel: ChannelWithConfig) => {
    try {
      await channelsApi.disconnect(channel.channel);
      await loadChannels();
      toast({
        title: `${channel.display_name} disconnected`,
        description: "You can reconnect anytime from the Channels page.",
      });
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: "There was an error disconnecting the channel.",
        variant: "destructive",
      });
    }
  };

  const handleStartSetup = (channel: string) => {
    const wizardMap: Record<string, WizardScreen> = {
      whatsapp: "whatsapp-setup",
      email: "email-setup",
      sms: "sms-setup",
      instagram: "instagram-setup",
      messenger: "messenger-setup",
      widget: "widget-config",
    };
    setActiveWizard(wizardMap[channel] || null);
  };

  const enabledCount = channels.filter((c) => c.enabled).length;
  const connectedCount = channels.filter((c) => c.connected).length;

  if (activeWizard) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        {activeWizard === "whatsapp-setup" && (
          <WhatsAppSetupWizard onComplete={handleWizardComplete} onCancel={() => setActiveWizard(null)} />
        )}
        {activeWizard === "email-setup" && (
          <EmailSetupWizard onComplete={handleWizardComplete} onCancel={() => setActiveWizard(null)} />
        )}
        {activeWizard === "sms-setup" && (
          <SmsSetupWizard onComplete={handleWizardComplete} onCancel={() => setActiveWizard(null)} />
        )}
        {activeWizard === "instagram-setup" && (
          <InstagramSetupWizard onComplete={handleWizardComplete} onCancel={() => setActiveWizard(null)} />
        )}
        {activeWizard === "messenger-setup" && (
          <MessengerSetupWizard onComplete={handleWizardComplete} onCancel={() => setActiveWizard(null)} />
        )}
        {activeWizard === "widget-config" && (
          <WebWidgetConfig channel="widget" onSave={handleWizardComplete} onCancel={() => setActiveWizard(null)} />
        )}
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Channels
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Configure your communication channels. Enable or disable channels to
            manage how customers reach you.
          </p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border/60",
            "bg-card px-4 py-1.5 font-description text-sm text-foreground shadow-sm",
          )}
        >
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{enabledCount}</span>
          <span className="text-muted-foreground">of {channels.length} channels enabled</span>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border/60",
            "bg-card px-4 py-1.5 font-description text-sm text-foreground shadow-sm",
          )}
        >
          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{connectedCount}</span>
          <span className="text-muted-foreground">connected</span>
        </div>
      </div>

      {/* Channel cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-32 mt-4" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-6 w-24 mt-4" />
            </div>
          ))
        ) : (
          channels.map((ch) => {
            const gradient = CHANNEL_GRADIENT[ch.channel] ?? "from-gray-500/20 to-gray-500/5";
            const isLocked = ch.locked ?? false;

            return (
              <div
                key={ch.channel}
                className={cn(
                  "group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border/60",
                  "bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
                  isLocked && "opacity-75",
                )}
              >
                {/* Gradient accent strip at top */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                    gradient,
                  )}
                  aria-hidden
                />

                {/* Lock overlay */}
                {isLocked && (
                  <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 p-4 bg-card/95 rounded-lg border shadow-lg">
                      <Lock className="h-6 w-6 text-amber-500" />
                      <p className="text-sm font-medium text-foreground text-center">
                        {ch.lock_reason || "Available on Growth plan"}
                      </p>
                      <Button 
                        size="sm" 
                        className="h-8 text-xs gap-1.5"
                        onClick={() => navigate("/dashboard/upgrade?feature=channels")}
                      >
                        <Crown className="h-3.5 w-3.5" />
                        Upgrade to Unlock
                      </Button>
                    </div>
                  </div>
                )}

                {/* Top row: icon + toggle */}
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br",
                      gradient,
                    )}
                    aria-hidden
                  >
                    <ChannelIcon channel={ch.channel} size={20} />
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ch.enabled}
                        onCheckedChange={(checked) => handleToggle(ch.channel, checked)}
                        disabled={toggling === ch.channel}
                        aria-label={`Toggle ${ch.display_name}`}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartSetup(ch.channel)}>
                            {ch.connected ? "Configure" : "Connect"}
                          </DropdownMenuItem>
                          {ch.connected && (
                            <>
                              <DropdownMenuItem onClick={() => navigate("/dashboard/channel-health")}>
                                <Activity className="h-4 w-4 mr-2" />
                                Channel Health
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDisconnectModal({ open: true, channel: ch })}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Unplug className="h-4 w-4 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Name & description */}
                <div className="space-y-1">
                  <h3 className="font-heading text-sm font-semibold leading-snug text-foreground">
                    {ch.display_name}
                  </h3>
                  <p className="font-description text-xs leading-relaxed text-muted-foreground">
                    {ch.description}
                  </p>
                </div>

                {/* Feature bullets - shown when NOT connected */}
                {!ch.connected && !isLocked && CHANNEL_FEATURES[ch.channel] && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      What you can do:
                    </p>
                    <ul className="space-y-0.5">
                      {CHANNEL_FEATURES[ch.channel].map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Connected info - shown when connected */}
                {ch.connected && ch.config && (
                  <div className="text-xs text-muted-foreground">
                    {ch.channel === "whatsapp" && ch.config.phone_number_id && (
                      <p className="font-mono">{ch.config.display_phone_number || ch.config.phone_number_id}</p>
                    )}
                    {ch.channel === "messenger" && ch.config.page_id && (
                      <p>{ch.config.page_name || ch.config.page_id}</p>
                    )}
                    {ch.channel === "instagram" && ch.config.account_name && (
                      <p>{ch.config.account_name}</p>
                    )}
                    {ch.channel === "email" && ch.config.email_address && (
                      <p>{ch.config.email_address}</p>
                    )}
                    {ch.channel === "sms" && ch.config.phone_number && (
                      <p className="font-mono">{ch.config.phone_number}</p>
                    )}
                    {ch.config.connected_at && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Active since {new Date(ch.config.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}

                {/* Status badges */}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {ch.enabled ? (
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                      Disabled
                    </Badge>
                  )}

                  {ch.connected ? (
                    <Badge variant="info" className="bg-blue-500/10 text-blue-500 border-blue-500/20 inline-flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : ch.enabled ? (
                    <Badge variant="warning" className="bg-amber-500/10 text-amber-500 border-amber-500/20 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Needs attention
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="inline-flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />
                      Not connected
                    </Badge>
                  )}
                </div>

                {/* Inline small config preview */}
                {showConfigFor === ch.channel && (
                  <div className="mt-3">
                    {ch.channel === "messenger" && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Choose a Page to use for Messenger</div>
                        <select 
                          className="w-full p-2 border rounded" 
                          onChange={(e) => setSelectedPage(e.target.value)} 
                          value={selectedPage || ""}
                        >
                          <option value="">Select a Page</option>
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                          ))}
                        </select>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={saveMessengerConfig} disabled={loading}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowConfigFor(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {ch.channel === "whatsapp" && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Choose a WhatsApp phone number</div>
                        <select 
                          className="w-full p-2 border rounded" 
                          onChange={(e) => {
                            const [wba, phone_id, display] = e.target.value.split("||");
                            setSelectedPhone({ wba, phone_id, display });
                          }}
                          value={selectedPhone?.phone_id ? `${selectedPhone.wba}||${selectedPhone.phone_id}||${selectedPhone.display}` : ""}
                        >
                          <option value="">Select a phone</option>
                          {wbas.flatMap((w: any) => w.phone_numbers.map((pn: any) => ({ wba: w.id, phone_id: pn.id, display: pn.display_phone_number }))).map((opt: any) => (
                            <option key={opt.phone_id} value={`${opt.wba}||${opt.phone_id}||${opt.display}`}>{opt.display}</option>
                          ))}
                        </select>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={saveWhatsappConfig} disabled={loading}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowConfigFor(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Disconnect Modal */}
      <DisconnectChannelModal
        open={disconnectModal.open}
        onOpenChange={(open) => setDisconnectModal({ open, channel: disconnectModal.channel })}
        channel={disconnectModal.channel ? {
          id: disconnectModal.channel.channel,
          name: disconnectModal.channel.display_name,
          icon: <ChannelIcon channel={disconnectModal.channel.channel} size={20} />,
          connectedInfo: disconnectModal.channel.config?.phone_number_id || disconnectModal.channel.config?.page_id || "Connected",
        } : { id: "", name: "", icon: null, connectedInfo: "" }}
        onConfirm={() => disconnectModal.channel ? handleDisconnect(disconnectModal.channel) : Promise.resolve()}
      />

      {/* Success Screen */}
      {successScreen.show && successScreen.channel && (
        <ChannelSuccessScreen
          channel={{
            id: successScreen.channel.channel,
            name: successScreen.channel.display_name,
            icon: successScreen.channel.channel as "whatsapp" | "email" | "sms" | "instagram" | "messenger" | "widget",
            connectedInfo: successScreen.channel.config?.phone_number_id || successScreen.channel.config?.page_id || "Connected",
            summary: {
              status: "Active",
              messages: "0 today",
            },
            features: ["AI Responses", "Automated Routing"],
          }}
          onConfigure={() => {
            setSuccessScreen({ show: false, channel: null });
            navigate("/dashboard/channel-health");
          }}
          onTestChatbot={() => {
            setSuccessScreen({ show: false, channel: null });
            navigate("/dashboard/inbox");
          }}
        />
      )}
    </div>
  );
}
