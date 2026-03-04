import { useState } from "react";
import type { ChannelConfigItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Radio, Settings } from "lucide-react";
import { CHANNEL_META, ChannelIcon } from "@/lib/channelMeta";

// ---------------------------------------------------------------------------
// Mock data & visual config
// ---------------------------------------------------------------------------

const MOCK_CHANNELS: ChannelConfigItem[] = [
  {
    channel: "whatsapp",
    enabled: true,
    connected: true,
    display_name: "WhatsApp Business",
    description: "Send and receive messages via WhatsApp Business API",
  },
  {
    channel: "email",
    enabled: true,
    connected: true,
    display_name: "Email",
    description: "Handle customer emails with IMAP/SMTP integration",
  },
  {
    channel: "sms",
    enabled: false,
    connected: false,
    display_name: "SMS",
    description: "Text messaging via SMS gateway webhooks",
  },
  {
    channel: "messenger",
    enabled: true,
    connected: false,
    display_name: "Facebook Messenger",
    description: "Chat with customers through Facebook Messenger",
  },
  {
    channel: "instagram",
    enabled: false,
    connected: false,
    display_name: "Instagram DMs",
    description: "Respond to Instagram Direct Messages",
  },
];

const CHANNEL_GRADIENT: Record<string, string> = {
  whatsapp: "from-emerald-500/20 to-emerald-500/5",
  email: "from-violet-500/20 to-violet-500/5",
  sms: "from-pink-500/20 to-pink-500/5",
  messenger: "from-blue-500/20 to-blue-500/5",
  instagram: "from-pink-500/20 to-pink-500/5",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Channels() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelConfigItem[]>(MOCK_CHANNELS);

  const enabledCount = channels.filter((c) => c.enabled).length;
  const connectedCount = channels.filter((c) => c.connected).length;

  const handleToggle = (channel: string, nextEnabled: boolean) => {
    setChannels((prev) =>
      prev.map((c) => (c.channel === channel ? { ...c, enabled: nextEnabled } : c)),
    );

    const target = channels.find((c) => c.channel === channel);
    toast({
      title: nextEnabled ? "Channel enabled" : "Channel disabled",
      description: `${target?.display_name ?? channel} has been ${nextEnabled ? "enabled" : "disabled"}.`,
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Radio className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Channels
          </h1>
        </div>
        <p className="max-w-2xl font-description text-sm leading-relaxed text-muted-foreground">
          Configure your communication channels. Enable or disable channels to
          manage how customers reach you.
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Summary pills                                                     */}
      {/* ----------------------------------------------------------------- */}
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

      {/* ----------------------------------------------------------------- */}
      {/* Channel cards grid                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => {
          const gradient = CHANNEL_GRADIENT[ch.channel] ?? "from-gray-500/20 to-gray-500/5";

          return (
            <div
              key={ch.channel}
              className={cn(
                "group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border/60",
                "bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
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

                <Switch
                  checked={ch.enabled}
                  onCheckedChange={(checked) => handleToggle(ch.channel, checked)}
                  aria-label={`Toggle ${ch.display_name}`}
                />
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

              {/* Status badges */}
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Badge variant={ch.enabled ? "success" : "neutral"}>
                  {ch.enabled ? "Enabled" : "Disabled"}
                </Badge>

                <Badge
                  variant={ch.connected ? "info" : "outline"}
                  className="inline-flex items-center gap-1"
                >
                  {ch.connected ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  {ch.connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
