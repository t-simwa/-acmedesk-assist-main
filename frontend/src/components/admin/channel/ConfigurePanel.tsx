import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Check,
  Copy,
  ExternalLink,
  Trash2,
  AlertTriangle,
  MessageCircle,
  Mail,
  Phone,
  Instagram,
  Globe,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TemplatesList from "./TemplatesList";
import { ChannelIcon } from "@/lib/channelMeta";
import { whatsappTemplatesApi } from "@/lib/api";

interface ConfigurePanelProps {
  channel: string;
  channelName: string;
  config?: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (config: Record<string, string>) => void;
  onDisconnect?: () => void;
}

const CHANNEL_FEATURES = {
  whatsapp: {
    icon: MessageCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    tabs: ["General", "Templates", "Behavior"],
  },
  messenger: {
    icon: MessageCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tabs: ["General", "Messenger Profile", "Rich Responses", "Behavior"],
  },
  instagram: {
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    tabs: ["General", "Ice Breakers", "Story Settings", "Behavior"],
  },
  email: {
    icon: Mail,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    tabs: ["General", "Behavior", "Appearance", "Blocked Senders"],
  },
  sms: {
    icon: Phone,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    tabs: ["General", "Compliance", "Behavior"],
  },
  widget: {
    icon: Globe,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    tabs: ["Appearance", "Behavior", "Domain Whitelist"],
  },
};

export function ConfigurePanel({
  channel,
  channelName,
  config = {},
  open,
  onOpenChange,
  onSave,
  onDisconnect,
}: ConfigurePanelProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("General");
  
  const channelConfig = CHANNEL_FEATURES[channel as keyof typeof CHANNEL_FEATURES];
  const Icon = channelConfig?.icon || Globe;
  const [createOpen, setCreateOpen] = useState(false);
  
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({
    greeting_message: config.greeting_message || "Hi! Thanks for reaching out. I'm here to help — what can I assist you with today?",
    response_delay: config.response_delay || "2",
    auto_reply: config.auto_reply || "true",
    ...config,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(localConfig);
      toast({
        title: "Settings saved",
        description: "Your channel configuration has been updated.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const tabs = channelConfig?.tabs || ["General"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-lg h-full bg-background border-l overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", channelConfig?.bgColor)}>
              <Icon className={cn("h-5 w-5", channelConfig?.color)} />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold">Configure {channelName}</h2>
              <p className="text-sm text-muted-foreground">Channel settings</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start mb-6 flex flex-wrap h-auto gap-1">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab} 
                  value={tab}
                  className="text-xs px-3 py-1.5"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-0">
                {tab === "General" && channel !== "widget" && (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Connection Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {channel === "whatsapp" && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Connected Number</Label>
                            <p className="text-sm font-medium mt-1">
                              {config.phone_number || "+254 700 000 000"}
                            </p>
                          </div>
                        )}
                        {channel === "messenger" && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Connected Page</Label>
                            <p className="text-sm font-medium mt-1">
                              {config.page_name || "Simca Cleaning KE"}
                            </p>
                          </div>
                        )}
                        {channel === "instagram" && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Instagram Account</Label>
                            <p className="text-sm font-medium mt-1">
                              {config.account_name || "@simcacleaning"}
                            </p>
                          </div>
                        )}
                        {channel === "email" && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Monitored Address</Label>
                            <p className="text-sm font-medium mt-1">
                              {config.email_address || "support@business.com"}
                            </p>
                          </div>
                        )}
                        {channel === "sms" && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Phone Number</Label>
                            <p className="text-sm font-medium mt-1">
                              {config.phone_number || "21606"}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-sm text-emerald-600 font-medium">Active</span>
                          <span className="text-xs text-muted-foreground">
                            Connected {config.connected_at || "Jan 12, 2026"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {(tab === "Behavior" || tab === "General") && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Response Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Greeting Message</Label>
                        <Textarea
                          value={localConfig.greeting_message}
                          onChange={(e) => setLocalConfig({ ...localConfig, greeting_message: e.target.value })}
                          className="mt-1.5 text-sm"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Response Delay (seconds)</Label>
                        <div className="mt-2">
                          <Slider
                            value={[parseInt(localConfig.response_delay) || 2]}
                            onValueChange={([value]) => setLocalConfig({ ...localConfig, response_delay: String(value) })}
                            max={8}
                            min={0}
                            step={1}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {localConfig.response_delay}s delay before responding
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs">Auto-reply</Label>
                          <p className="text-xs text-muted-foreground">Automatically respond to messages</p>
                        </div>
                        <Switch
                          checked={localConfig.auto_reply === "true"}
                          onCheckedChange={(checked) => setLocalConfig({ ...localConfig, auto_reply: String(checked) })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tab === "Appearance" && channel === "widget" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Widget Appearance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Launcher Label</Label>
                        <Input
                          value={localConfig.launcher_label || "Chat with us"}
                          onChange={(e) => setLocalConfig({ ...localConfig, launcher_label: e.target.value })}
                          className="mt-1.5"
                          placeholder="Chat with us"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Primary Color</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="color"
                            value={localConfig.primary_color || "#228B22"}
                            onChange={(e) => setLocalConfig({ ...localConfig, primary_color: e.target.value })}
                            className="h-9 w-14 rounded border cursor-pointer"
                          />
                          <Input
                            value={localConfig.primary_color || "#228B22"}
                            onChange={(e) => setLocalConfig({ ...localConfig, primary_color: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs">Show "Powered by" badge</Label>
                        </div>
                        <Switch
                          checked={localConfig.show_powered_by !== "false"}
                          onCheckedChange={(checked) => setLocalConfig({ ...localConfig, show_powered_by: String(checked) })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tab === "Domain Whitelist" && channel === "widget" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Domain Whitelist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Your widget will only load on domains you add here.
                      </p>
                      <div className="flex gap-2">
                        <Input placeholder="example.com" className="flex-1" />
                        <Button size="sm">Add</Button>
                      </div>
                      <div className="space-y-2">
                        {(config.domains || ["example.com", "mysite.com"]).map((domain: string) => (
                          <div key={domain} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                            <span>{domain}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {tab === "Templates" && channel === "whatsapp" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Message Templates</CardTitle>
                    </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Real templates from backend */}
                        <TemplatesList />
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(true) }>
                            Submit New Template
                          </Button>
                          <Button variant="ghost" onClick={async () => {
                            try {
                              const refreshed = await whatsappTemplatesApi.refresh();
                              // notify templates list to reload
                              const ev = new CustomEvent("whatsapp-templates-reload");
                              window.dispatchEvent(ev);
                              toast({ title: "Templates refreshed" });
                            } catch (e) {
                              toast({ title: "Refresh failed", variant: "destructive" });
                            }
                          }}>
                            Refresh
                          </Button>
                        </div>
                        {/* Create modal */}
                        {createOpen && (
                          // lazy-load modal component to avoid circular imports in tests
                          // eslint-disable-next-line @typescript-eslint/no-var-requires
                          (() => {
                            const CreateTemplateModal = require("./CreateTemplateModal").default;
                            return (
                              <CreateTemplateModal
                                open={createOpen}
                                onOpenChange={setCreateOpen}
                                onSuccess={() => {
                                  // trigger list reload by forcing a remount via key or simple event
                                  // For now, we'll use a small timeout to allow backend to process then reload via a custom event
                                  setTimeout(() => {
                                    const ev = new CustomEvent("whatsapp-templates-reload");
                                    window.dispatchEvent(ev);
                                  }, 1500);
                                }}
                              />
                            );
                          })()
                        )}
                      </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background px-6 py-4 flex items-center justify-between">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onDisconnect}
            className="text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Disconnect
          </Button>
          <Button 
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
