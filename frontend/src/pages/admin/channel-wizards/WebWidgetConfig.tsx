import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  MessageCircle,
  Globe,
  Copy,
  Check,
  Loader2,
  Smartphone,
  Tablet,
  Monitor,
  X,
  Plus,
  Eye,
  Code,
} from "lucide-react";
import { channelsApi, channelSettingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface WebWidgetConfigProps {
  channel: "widget" | "whatsapp" | "email" | "sms" | "messenger" | "instagram";
  onSave?: () => void;
  onCancel?: () => void;
}

type WidgetTab = "appearance" | "behavior" | "domains";

export default function WebWidgetConfig({ channel, onSave, onCancel }: WebWidgetConfigProps) {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<WidgetTab>("appearance");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Appearance Tab
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [buttonColor, setButtonColor] = useState("#0F172A");
  const [buttonTextColor, setButtonTextColor] = useState("#FFFFFF");
  const [headerColor, setHeaderColor] = useState("#0F172A");
  const [headerTextColor, setHeaderTextColor] = useState("#FFFFFF");
  const [customGreeting, setCustomGreeting] = useState(
    "Hi! How can I help you today?"
  );
  const [showBadge, setShowBadge] = useState(true);
  const [badgeText, setBadgeText] = useState("New!");
  const [customLauncherIcon, setCustomLauncherIcon] = useState(false);
  const [borderRadius, setBorderRadius] = useState(24);
  const [primaryColor, setPrimaryColor] = useState("#0F172A");
  
  // Behavior Tab
  const [autoOpenDelay, setAutoOpenDelay] = useState(0);
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [minimizeOnClose, setMinimizeOnClose] = useState(true);
  const [persistSession, setPersistSession] = useState(true);
  const [showGetStarted, setShowGetStarted] = useState(true);
  const [getStartedMessage, setGetStartedMessage] = useState(
    "Hi there! 👋 What can I help you with?"
  );
  const [quickReplies, setQuickReplies] = useState([
    "I have a question",
    "I need support",
    "Talk to a person",
  ]);
  const [responseDelay, setResponseDelay] = useState(2);
  const [enableFileUpload, setEnableFileUpload] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [enableScreenshot, setEnableScreenshot] = useState(false);
  
  // Domains Tab
  const [allowedDomains, setAllowedDomains] = useState<string[]>([
    "yourdomain.com",
  ]);
  const [newDomain, setNewDomain] = useState("");
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [restrictByDomain, setRestrictByDomain] = useState(false);
  
  const handleAddDomain = () => {
    if (newDomain && !allowedDomains.includes(newDomain)) {
      setAllowedDomains([...allowedDomains, newDomain]);
      setNewDomain("");
    }
  };
  
  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };
  
  const handleCopyCode = () => {
    const embedCode = `<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = 'https://cdn.nexachat.com/widget.js';
    s.async = true;
    d.head.appendChild(s);
  })();
</script>
<script>
  window.nexaChatConfig = {
    widgetId: 'YOUR_WIDGET_ID',
    position: '${position}',
    primaryColor: '${primaryColor}'
  };
</script>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({ title: "Embed code copied!" });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSave = async () => {
    try {
      setLoading(true);
      // persist appearance/behavior/domains
      await channelSettingsApi.saveWidgetAppearance({
        position,
        launcher_label: customLauncherIcon ? undefined : undefined, // placeholder, we don't expose custom icon yet
        primary_color: primaryColor,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        header_color: headerColor,
        header_text_color: headerTextColor,
        show_powered_by: showBadge,
      });
      await channelSettingsApi.saveWidgetBehavior({
        auto_open_delay: autoOpenDelay,
        show_typing_indicator: showTypingIndicator,
        sound_enabled: soundEnabled,
        minimize_on_close: minimizeOnClose,
        persist_session: persistSession,
        show_get_started: showGetStarted,
        get_started_message: getStartedMessage,
        quick_replies: quickReplies,
        response_delay: responseDelay,
        enable_file_upload: enableFileUpload,
        max_file_size: maxFileSize,
        enable_screenshot: enableScreenshot,
      });
      await channelSettingsApi.saveWidgetDomains({
        domains: allowedDomains,
        include_subdomains: includeSubdomains,
        restrict: restrictByDomain,
      });
      await channelsApi.toggle("widget", true);
      toast({
        title: "Widget configuration saved!",
        description: "Your chat widget is now active.",
      });
      onSave?.();
    } catch (error) {
      toast({
        title: "Save failed",
        description: "There was an error saving your configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const channelConfig = {
    widget: { name: "Web Widget", icon: MessageCircle },
    whatsapp: { name: "WhatsApp", icon: Smartphone },
    email: { name: "Email", icon: Globe },
    sms: { name: "SMS", icon: MessageCircle },
    messenger: { name: "Messenger", icon: Globe },
    instagram: { name: "Instagram", icon: Globe },
  };
  
  const { name: channelName, icon: ChannelIcon } = channelConfig[channel];
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9">
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ChannelIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-heading text-lg font-semibold text-foreground">
                    Configure {channelName}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Customize how your {channelName} channel works
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Code className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy Embed Code"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WidgetTab)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="domains" className="gap-2">
              <Globe className="h-4 w-4" />
              Domains
            </TabsTrigger>
          </TabsList>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview */}
              <Card className="lg:sticky lg:top-24 h-fit">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-80 bg-muted/30 rounded-lg overflow-hidden border">
                    {/* Mock website background */}
                    <div className="absolute inset-0 p-4">
                      <div className="h-6 w-32 bg-muted rounded mb-4" />
                      <div className="h-3 w-full bg-muted/50 rounded mb-2" />
                      <div className="h-3 w-3/4 bg-muted/50 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted/50 rounded" />
                    </div>
                    
                    {/* Widget Launcher */}
                    <div
                      className={cn(
                        "absolute bottom-4 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-105",
                        position === "bottom-right" ? "right-4" : "left-4"
                      )}
                      style={{ backgroundColor: buttonColor }}
                    >
                      <MessageCircle className="h-5 w-5" style={{ color: buttonTextColor }} />
                      <span className="text-sm font-medium" style={{ color: buttonTextColor }}>
                        Chat
                      </span>
                      {showBadge && (
                        <Badge
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                          style={{ backgroundColor: buttonColor }}
                        >
                          {badgeText}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Position</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setPosition("bottom-left")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                          position === "bottom-left"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="h-8 w-12 rounded bg-muted flex items-end justify-start p-1">
                          <div className="h-4 w-4 rounded-full bg-primary" />
                        </div>
                        <span className="text-xs">Bottom Left</span>
                      </button>
                      <button
                        onClick={() => setPosition("bottom-right")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                          position === "bottom-right"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="h-8 w-12 rounded bg-muted flex items-end justify-end p-1">
                          <div className="h-4 w-4 rounded-full bg-primary" />
                        </div>
                        <span className="text-xs">Bottom Right</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Button Color</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={buttonColor}
                            onChange={(e) => setButtonColor(e.target.value)}
                            className="h-8 w-8 rounded cursor-pointer"
                          />
                          <Input
                            value={buttonColor}
                            onChange={(e) => setButtonColor(e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Button Text</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            value={buttonTextColor}
                            onChange={(e) => setButtonTextColor(e.target.value)}
                            className="h-8 w-8 rounded cursor-pointer"
                          />
                          <Input
                            value={buttonTextColor}
                            onChange={(e) => setButtonTextColor(e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Primary Color (Chat Window)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-8 w-8 rounded cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Border Radius</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[borderRadius]}
                          onValueChange={([value]) => setBorderRadius(value)}
                          max={50}
                          step={2}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">{borderRadius}px</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Launcher</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Show unread badge</Label>
                      <Switch checked={showBadge} onCheckedChange={setShowBadge} />
                    </div>
                    {showBadge && (
                      <div>
                        <Label className="text-xs">Badge text</Label>
                        <Input
                          value={badgeText}
                          onChange={(e) => setBadgeText(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Custom launcher icon</Label>
                      <Switch checked={customLauncherIcon} onCheckedChange={setCustomLauncherIcon} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Chat Window</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Auto-open delay (seconds)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Widget opens automatically after visitor is on page
                    </p>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[autoOpenDelay]}
                        onValueChange={([value]) => setAutoOpenDelay(value)}
                        max={60}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12">
                        {autoOpenDelay === 0 ? "Off" : `${autoOpenDelay}s`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show typing indicator</Label>
                    <Switch checked={showTypingIndicator} onCheckedChange={setShowTypingIndicator} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable sound notifications</Label>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Minimize on close</Label>
                    <Switch checked={minimizeOnClose} onCheckedChange={setMinimizeOnClose} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Persist session</Label>
                    <Switch checked={persistSession} onCheckedChange={setPersistSession} />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Get Started</CardTitle>
                  <CardDescription>
                    Initial message and quick reply buttons
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show get started message</Label>
                    <Switch checked={showGetStarted} onCheckedChange={setShowGetStarted} />
                  </div>
                  
                  {showGetStarted && (
                    <>
                      <div>
                        <Label className="text-xs">Welcome message</Label>
                        <Textarea
                          value={getStartedMessage}
                          onChange={(e) => setGetStartedMessage(e.target.value)}
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">Quick replies</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {quickReplies.map((reply, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => {
                                const newReplies = quickReplies.filter((_, i) => i !== index);
                                setQuickReplies(newReplies);
                              }}
                            >
                              {reply} <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => setQuickReplies([...quickReplies, "New option"])}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Response Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Response delay</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[responseDelay]}
                        onValueChange={([value]) => setResponseDelay(value)}
                        max={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12">{responseDelay}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">File Handling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Allow file uploads</Label>
                    <Switch checked={enableFileUpload} onCheckedChange={setEnableFileUpload} />
                  </div>
                  
                  {enableFileUpload && (
                    <div>
                      <Label className="text-xs">Max file size (MB)</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[maxFileSize]}
                          onValueChange={([value]) => setMaxFileSize(value)}
                          max={50}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">{maxFileSize}MB</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Domain Restrictions</CardTitle>
                <CardDescription>
                  Control where your widget can be embedded
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Restrict by domain</Label>
                    <p className="text-xs text-muted-foreground">
                      Only load widget on allowed domains
                    </p>
                  </div>
                  <Switch checked={restrictByDomain} onCheckedChange={setRestrictByDomain} />
                </div>
                
                {restrictByDomain && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="example.com"
                        onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                      />
                      <Button onClick={handleAddDomain}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="subdomains"
                        checked={includeSubdomains}
                        onChange={(e) => setIncludeSubdomains(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="subdomains" className="text-sm">
                        Include subdomains
                      </Label>
                    </div>
                    
                    <div className="space-y-2">
                      {allowedDomains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-mono">{domain}</span>
                            {includeSubdomains && (
                              <Badge variant="outline" className="text-[10px]">
                                *. {domain}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveDomain(domain)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Embed Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
{`<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = 'https://cdn.nexachat.com/widget.js';
    s.async = true;
    d.head.appendChild(s);
  })();
</script>
<script>
  window.nexaChatConfig = {
    widgetId: 'YOUR_WIDGET_ID',
    position: '${position}',
    primaryColor: '${primaryColor}'
  };
</script>`}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
