import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, MessageCircle, Facebook, Send } from "lucide-react";
import EmailChannel from "./EmailChannel";
import SmsChannel from "./SmsChannel";
import WhatsAppChannel from "./WhatsAppChannel";
import MessengerChannel from "./MessengerChannel";
import TwitterChannel from "./TwitterChannel";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { id: "email", label: "Email", icon: Mail, component: EmailChannel },
  { id: "sms", label: "SMS", icon: MessageSquare, component: SmsChannel },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, component: WhatsAppChannel },
  { id: "messenger", label: "Messenger", icon: Facebook, component: MessengerChannel },
  { id: "twitter", label: "Twitter / X", icon: Send, component: TwitterChannel },
] as const;

function PlaceholderChannel({ channelLabel, icon: Icon }: { channelLabel: string; icon: React.ElementType }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60",
        "bg-muted/20 py-12 px-6 sm:py-16 sm:px-8 text-center",
        "min-h-[280px] sm:min-h-[320px]"
      )}
    >
      <div className="rounded-full bg-muted/50 p-4 mb-4" aria-hidden>
        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/70" />
      </div>
      <p className="text-sm font-medium text-foreground/90">{channelLabel}</p>
      <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[280px] leading-relaxed">
        This channel will be available once integration is implemented. Use the Email tab for now.
      </p>
    </div>
  );
}

export default function Inbox() {
  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Header: minimal, responsive */}
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Inbox</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground sm:text-sm max-w-xl">
          Conversations from all channels in one place. Switch tabs to filter by channel.
        </p>
      </header>

      <Tabs defaultValue="email" className="w-full min-w-0">
        {/* Scrollable tab list on small screens, touch-friendly */}
        <TabsList
          className={cn(
            "inline-flex h-auto w-full min-w-0 sm:w-auto",
            "flex-nowrap sm:flex-wrap overflow-x-auto overflow-y-hidden",
            "gap-1 rounded-xl bg-muted/40 p-1.5",
            "[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          )}
        >
          {CHANNELS.map((ch) => (
            <TabsTrigger
              key={ch.id}
              value={ch.id}
              className={cn(
                "flex items-center gap-2 shrink-0 min-h-[44px] px-4 py-2.5",
                "rounded-lg text-[13px] font-medium sm:text-sm",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "transition-colors duration-150"
              )}
            >
              <ch.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{ch.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CHANNELS.map((ch) => (
          <TabsContent
            key={ch.id}
            value={ch.id}
            className={cn(
              "mt-4 sm:mt-6 focus-visible:outline-none min-w-0",
              "data-[state=inactive]:hidden"
            )}
          >
            {ch.component ? (
              <ch.component />
            ) : (
              <PlaceholderChannel channelLabel={ch.label} icon={ch.icon} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
