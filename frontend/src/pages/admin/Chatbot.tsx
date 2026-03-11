import { useState, useEffect, Fragment, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useChatbotConfig, useUpdateChatbotConfig } from "@/hooks/useChatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  User,
  Palette,
  Settings,
  Globe,
  Clock,
  AlertCircle,
  Bell,
  Save,
  RotateCcw,
  MessageSquare,
  Sparkles,
  Monitor,
  Smartphone,
  Tablet,
  Send,
  Bot,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

export type TabType =
  | "personality"
  | "appearance"
  | "behavior"
  | "channels"
  | "business-hours"
  | "escalation"
  | "notifications";

const TABS: { id: TabType; label: string; shortLabel: string; icon: typeof User }[] = [
  { id: "personality", label: "Personality", shortLabel: "Personality", icon: User },
  { id: "appearance", label: "Appearance", shortLabel: "Looks", icon: Palette },
  { id: "behavior", label: "Behavior", shortLabel: "Behavior", icon: Settings },
  { id: "channels", label: "Channels", shortLabel: "Channels", icon: Globe },
  { id: "business-hours", label: "Business Hours", shortLabel: "Hours", icon: Clock },
  { id: "escalation", label: "Escalation", shortLabel: "Escalate", icon: AlertCircle },
  { id: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
];

interface ChatbotConfig extends Record<string, any> {}

type PreviewDevice = "desktop" | "tablet" | "mobile";

/* ═══════════════════════════════════════════════════════════════════════════════
   FORM FIELD COMPONENTS (Styled per STYLE_GUIDE)
   ═══════════════════════════════════════════════════════════════════════════════ */

function FormField({
  label,
  description,
  children,
  required,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold font-heading text-foreground flex items-center gap-1.5">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {description && (
        <p className="text-[11px] text-muted-foreground font-description -mt-1">{description}</p>
      )}
      {children}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
        <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 font-description">{description}</p>
        )}
      </div>
      <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-5">{children}</div>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <p className="text-[13px] font-semibold font-heading text-foreground">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground font-description mt-0.5">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LIVE PREVIEW WIDGET COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

function LivePreviewWidget({
  config,
  device,
  setDevice,
}: {
  config: Partial<ChatbotConfig>;
  device: PreviewDevice;
  setDevice: (d: PreviewDevice) => void;
}) {
  // expansion state currently unused — kept for future collapser
  const [demoMessages, setDemoMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Widget dimensions based on device
  const widgetDimensions = {
    desktop: { width: "380px", height: "520px" },
    tablet: { width: "340px", height: "480px" },
    mobile: { width: "100%", height: "100%" },
  };

  // Brand color with fallback
  const brandColor = config.brand_color || "#3B82F6";
  const userMessageColor = config.user_message_color || brandColor;

  // Greeting message
  const greeting = config.greeting_message || "Hi there! 👋 How can I help you today?";
  const botName = config.name || "AI Assistant";
  const avatarUrl = config.avatar_url;
  const roleText = config.role_text || "Your friendly AI helper";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [demoMessages, isTyping]);

  // Simulate bot response
  const handleSendDemo = () => {
    if (!inputValue.trim()) return;

    const userMsg = { id: `user-${Date.now()}`, role: "user" as const, content: inputValue };
    setDemoMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate response after delay
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "Thanks for your message! I'm here to help with any questions you might have.",
        "Great question! Let me look into that for you.",
        "I'd be happy to assist you with that. Here's what I found...",
        "That's a common question. Here's some helpful information.",
      ];
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: "assistant" as const,
        content: responses[Math.floor(Math.random() * responses.length)]!,
      };
      setDemoMessages((prev) => [...prev, botMsg]);
    }, 1500);
  };

  // Starter questions from config
  const starters = [
    config["suggested_starter_questions.0"] || "What services do you offer?",
    config["suggested_starter_questions.1"] || "How can I get started?",
  ].filter(Boolean);

  return (
    <div className="relative h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold font-heading text-foreground">Live Preview</h3>
            <p className="text-[10px] text-muted-foreground font-description">Real-time updates</p>
          </div>
        </div>

        {/* Device Toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
          {(["desktop", "tablet", "mobile"] as const).map((d) => {
            const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  device === d
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                title={d.charAt(0).toUpperCase() + d.slice(1)}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview Container */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 p-4 overflow-hidden transition-all",
          device === "mobile" && "p-2"
        )}
      >
        {/* Mock Browser/Phone Frame */}
        <div
          className={cn(
            "relative transition-all duration-300 ease-out",
            device === "mobile" && "w-full h-full max-w-[320px]",
            device === "tablet" && "w-full max-w-[360px]",
            device === "desktop" && "w-full max-w-[400px]"
          )}
          style={device !== "mobile" ? { minHeight: widgetDimensions[device].height } : undefined}
        >
          {/* Device Frame */}
          <div
            className={cn(
              "relative bg-background rounded-2xl shadow-strong border border-border overflow-hidden flex flex-col",
              device === "mobile" && "h-full rounded-[2rem] border-[3px] border-gray-800 dark:border-gray-600"
            )}
            style={{
              height: device === "mobile" ? "100%" : widgetDimensions[device].height,
              maxHeight: device === "mobile" ? "580px" : undefined,
            }}
          >
            {/* Mobile Notch */}
            {device === "mobile" && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 dark:bg-gray-600 rounded-b-xl z-10" />
            )}

            {/* Widget Header */}
            <div
              className="relative shrink-0 px-4 py-4 border-b"
              style={{
                background: `linear-gradient(135deg, ${brandColor}15 0%, transparent 100%)`,
              }}
            >
              {device === "mobile" && <div className="h-4" />}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-background shadow-md overflow-hidden"
                  style={{ backgroundColor: brandColor }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={botName} className="h-full w-full object-cover" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-bold text-[14px] text-foreground truncate">
                      {botName}
                    </p>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-description truncate">
                    {roleText}
                  </p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {/* Greeting Message */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="bg-muted border rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <p className="text-[13px] text-foreground leading-relaxed">{greeting}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">Just now</p>
                </div>
              </div>

              {/* Starter Questions */}
              {demoMessages.length === 0 && starters.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {starters.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputValue(q);
                        setTimeout(() => handleSendDemo(), 100);
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent/50 text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Demo Messages */}
              {demoMessages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div
                        className="rounded-2xl rounded-br-md px-3.5 py-2.5 text-white"
                        style={{ backgroundColor: userMessageColor }}
                      >
                        <p className="text-[13px] leading-relaxed">{msg.content}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono text-right">
                        Just now
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-muted border rounded-2xl rounded-bl-md px-3.5 py-2.5">
                        <p className="text-[13px] text-foreground leading-relaxed">{msg.content}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">Just now</p>
                    </div>
                  </div>
                )
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-3 border-t bg-card/50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendDemo()}
                  placeholder="Type a message..."
                  className="flex-1 h-10 px-4 rounded-full border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button
                  onClick={handleSendDemo}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                  style={{ backgroundColor: brandColor }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {config.show_powered_by !== false && (
                <p className="text-[9px] text-muted-foreground/50 text-center mt-2 font-description">
                  Powered by AcmeDesk
                </p>
              )}
            </div>
          </div>

          {/* Floating Button Preview (Desktop/Tablet only) */}
          {device !== "mobile" && (
            <div className="absolute -bottom-2 -right-2 z-10">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-strong cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: brandColor }}
              >
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Actions */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-dashed border-border/50">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span className="font-description">Changes update in real-time</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1.5"
          onClick={() => setDemoMessages([])}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function ChatbotPage() {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState<TabType>("personality");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const { data, isLoading, error } = useChatbotConfig();
  const updateMutation = useUpdateChatbotConfig();

  const { register, handleSubmit, watch, control, formState, reset } = useForm<
    Partial<ChatbotConfig>
  >({
    defaultValues: data || {},
  });

  // When config loads, update form values
  useEffect(() => {
    if (data) {
      // convert certain array/string fields and JSON objects into a form-friendly
      // representation so inputs render nicely and the user doesn't have to
      // re-type values when saving other fields.
      const normalized: any = { ...data };

      if (Array.isArray(normalized.keyword_triggers)) {
        normalized.keyword_triggers = normalized.keyword_triggers.join(", ");
      }
      if (Array.isArray(normalized.escalation_email_addresses)) {
        normalized.escalation_email_addresses = normalized.escalation_email_addresses.join(", ");
      }
      if (Array.isArray(normalized.notification_email_addresses)) {
        normalized.notification_email_addresses = normalized.notification_email_addresses.join(", ");
      }
      if (normalized.suggested_starter_questions && Array.isArray(normalized.suggested_starter_questions)) {
        // map to dotted notation values used by the form fields
        normalized["suggested_starter_questions.0"] = normalized.suggested_starter_questions[0];
        normalized["suggested_starter_questions.1"] = normalized.suggested_starter_questions[1];
      }
      const jsonFields = [
        "notifications_config",
        "lead_capture_fields_config",
        "weekly_schedule",
        "holiday_hours",
      ];
      jsonFields.forEach((f) => {
        if (normalized[f] && typeof normalized[f] === "object") {
          try {
            normalized[f] = JSON.stringify(normalized[f], null, 2);
          } catch (e) {
            // leave as-is if conversion fails
          }
        }
      });

      reset(normalized);
    }
  }, [data, reset]);

  const onSave = (values: Partial<ChatbotConfig>) => {
    const payload: any = { ...values };

    // numeric/string conversions
    if (
      payload.unanswered_questions_threshold != null &&
      typeof payload.unanswered_questions_threshold !== "string"
    ) {
      payload.unanswered_questions_threshold = String(payload.unanswered_questions_threshold);
    }

    // dotted starter questions -> array
    if (
      payload["suggested_starter_questions.0"] !== undefined ||
      payload["suggested_starter_questions.1"] !== undefined
    ) {
      payload.suggested_starter_questions = [];
      if (payload["suggested_starter_questions.0"] !== undefined) {
        payload.suggested_starter_questions.push(payload["suggested_starter_questions.0"]);
        delete payload["suggested_starter_questions.0"];
      }
      if (payload["suggested_starter_questions.1"] !== undefined) {
        payload.suggested_starter_questions.push(payload["suggested_starter_questions.1"]);
        delete payload["suggested_starter_questions.1"];
      }
      // filter out any null/empty
      payload.suggested_starter_questions = payload.suggested_starter_questions.filter(
        (q: any) => q != null && q !== ""
      );
      if (payload.suggested_starter_questions.length === 0) {
        delete payload.suggested_starter_questions;
      }
    }

    // comma-delimited list inputs -> arrays
    [
      "keyword_triggers",
      "escalation_email_addresses",
      "notification_email_addresses",
    ].forEach((field) => {
      if (payload[field] != null && typeof payload[field] === "string") {
        payload[field] = payload[field]
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s);
      }
    });

    // JSON-editable fields may be strings
    [
      "notifications_config",
      "lead_capture_fields_config",
      "weekly_schedule",
      "holiday_hours",
    ].forEach((field) => {
      if (payload[field] != null && typeof payload[field] === "string") {
        try {
          payload[field] = JSON.parse(payload[field]);
        } catch {
          // leave as-is, backend will validate
        }
      }
    });

    console.log("chatbot save payload", payload);
    updateMutation.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: "Changes saved", description: "Your chatbot configuration has been updated." });
        reset(values);
      },
      onError: (err: any) => {
        console.error("chatbot save error", err);
        const message = err?.response?.data?.detail || "Something went wrong. Please try again.";
        toast({ title: "Save failed", description: message, variant: "destructive" });
      },
    });
  };

  // Watch form values for live preview
  const watched = watch();

  /* ─────────────────────────────────────────────────────────────────────────────
     LOADING STATE
     ───────────────────────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-[500px] rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm text-foreground font-medium">Failed to load chatbot settings</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Please refresh the page or try again later.</p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     TAB NAVIGATION (3-Breakpoint Pattern)
     ───────────────────────────────────────────────────────────────────────────── */
  const renderTabNav = () => (
    <>
      {/* Mobile (<sm): 3x3 grid with short labels */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:hidden">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold font-heading transition-all",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Small tablet / half-desktop (sm–lg): 4x2 grid with full labels */}
      <div className="hidden sm:grid lg:hidden grid-cols-4 gap-2">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold font-heading transition-all",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Desktop (lg+): single inline row with dividers */}
      <div className="hidden lg:flex items-center gap-1 w-fit">
        {TABS.map((tab, i) => {
          const isActive = currentTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <Fragment key={tab.id}>
              {i > 0 && <div className="h-5 w-px bg-border mx-0.5" />}
              <button
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-heading transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            </Fragment>
          );
        })}
      </div>
    </>
  );

  /* ─────────────────────────────────────────────────────────────────────────────
     TAB CONTENT
     ───────────────────────────────────────────────────────────────────────────── */
  const renderTabContent = () => {
    switch (currentTab) {
      case "personality":
        return (
          <div className="space-y-6">
            <FormSection
              title="Bot Identity"
              description="Define your chatbot's name and appearance"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Bot Name" required>
                  <Input
                    {...register("name")}
                    placeholder="e.g., Luna, Max, Support Bot"
                    className="h-10 text-sm"
                  />
                </FormField>
                <FormField label="Avatar URL" description="Square image works best">
                  <Input
                    {...register("avatar_url")}
                    placeholder="https://example.com/avatar.png"
                    className="h-10 text-sm"
                  />
                </FormField>
              </div>
              <FormField label="Role / Tagline" description="Shown below the bot name">
                <Input
                  {...register("role_text")}
                  placeholder="e.g., Your friendly AI assistant"
                  className="h-10 text-sm"
                />
              </FormField>
            </FormSection>

            <FormSection title="Communication Style" description="How your bot speaks and responds">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FormField label="Response Tone">
                  <Controller
                    name="response_tone"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "friendly_casual"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly_casual">😊 Friendly & Casual</SelectItem>
                          <SelectItem value="professional_formal">💼 Professional & Formal</SelectItem>
                          <SelectItem value="technical_precise">🔬 Technical & Precise</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Response Length">
                  <Controller
                    name="response_length"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "balanced"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise (1-2 sentences)</SelectItem>
                          <SelectItem value="balanced">Balanced (3-5 sentences)</SelectItem>
                          <SelectItem value="detailed">Detailed (full explanation)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Language">
                  <Controller
                    name="response_language"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "auto"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">🌐 Auto-detect</SelectItem>
                          <SelectItem value="en">🇺🇸 English</SelectItem>
                          <SelectItem value="es">🇪🇸 Español</SelectItem>
                          <SelectItem value="fr">🇫🇷 Français</SelectItem>
                          <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Messages" description="Customize what your bot says in different scenarios">
              <FormField label="Greeting Message" description="First message when a user opens the chat">
                <Textarea
                  {...register("greeting_message")}
                  placeholder="Hi there! 👋 How can I help you today?"
                  className="min-h-[80px] text-sm resize-none"
                />
              </FormField>
              <FormField label="Fallback Message" description="When the bot can't answer a question">
                <Textarea
                  {...register("fallback_message")}
                  placeholder="I'm not sure about that. Would you like to speak with a human?"
                  className="min-h-[80px] text-sm resize-none"
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Escalation Message" description="When handing off to a human">
                  <Textarea
                    {...register("escalation_message")}
                    placeholder="Let me connect you with our team..."
                    className="min-h-[80px] text-sm resize-none"
                  />
                </FormField>
                <FormField label="Farewell Message" description="When closing the conversation">
                  <Textarea
                    {...register("farewell_message")}
                    placeholder="Thanks for chatting! Have a great day! 👋"
                    className="min-h-[80px] text-sm resize-none"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Conversation Starters" description="Quick questions users can click to start chatting">
              <div className="space-y-3">
                <FormField label="Starter Question 1">
                  <Input
                    {...register("suggested_starter_questions.0")}
                    placeholder="What services do you offer?"
                    className="h-10 text-sm"
                  />
                </FormField>
                <FormField label="Starter Question 2">
                  <Input
                    {...register("suggested_starter_questions.1")}
                    placeholder="How can I contact support?"
                    className="h-10 text-sm"
                  />
                </FormField>
              </div>
              <Controller
                name="conversation_starters_display"
                control={control}
                render={({ field }) => (
                  <ToggleField
                    label="Show only on first visit"
                    description="Hide starters after the user sends their first message"
                    checked={field.value === "first_visit"}
                    onCheckedChange={(c) => field.onChange(c ? "first_visit" : "always")}
                  />
                )}
              />
            </FormSection>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <FormSection title="Brand Colors" description="Match your widget to your brand">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Primary Color" description="Used for headers, buttons, and accents">
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      {...register("brand_color")}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      {...register("brand_color")}
                      placeholder="#3B82F6"
                      className="h-10 text-sm flex-1 font-mono"
                    />
                  </div>
                </FormField>
                <FormField label="User Message Color" description="Background color for user messages">
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      {...register("user_message_color")}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <Input
                      {...register("user_message_color")}
                      placeholder="#3B82F6"
                      className="h-10 text-sm flex-1 font-mono"
                    />
                  </div>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Widget Position & Style" description="Where and how the widget appears">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <FormField label="Position">
                  <Controller
                    name="widget_position"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "bottom-right"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">↘️ Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">↙️ Bottom Left</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Launcher Style">
                  <Controller
                    name="launcher_style"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "bubble"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bubble">💬 Chat Bubble</SelectItem>
                          <SelectItem value="phone">📞 Phone Icon</SelectItem>
                          <SelectItem value="custom">✨ Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Launcher Size">
                  <Controller
                    name="launcher_size"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "medium"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (44px)</SelectItem>
                          <SelectItem value="medium">Medium (56px)</SelectItem>
                          <SelectItem value="large">Large (68px)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
              <FormField label="Font Size">
                <Controller
                  name="font_size"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || "medium"} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 text-sm w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </FormSection>

            <FormSection title="Branding" description="Control branding visibility">
              <Controller
                name="show_powered_by"
                control={control}
                render={({ field }) => (
                  <ToggleField
                    label="Show 'Powered by' badge"
                    description="Display AcmeDesk branding in the widget footer"
                    checked={field.value !== false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FormSection>
          </div>
        );

      case "behavior":
        return (
          <div className="space-y-6">
            <FormSection title="Chat Features" description="Enable or disable chat capabilities">
              <div className="space-y-1 divide-y divide-border/50">
                <Controller
                  name="show_typing"
                  control={control}
                  render={({ field }) => (
                    <ToggleField
                      label="Typing Indicator"
                      description="Show animated dots while the bot is thinking"
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="show_citations"
                  control={control}
                  render={({ field }) => (
                    <ToggleField
                      label="Source Citations"
                      description="Show document references in bot responses"
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="read_receipts"
                  control={control}
                  render={({ field }) => (
                    <ToggleField
                      label="Read Receipts"
                      description="Show when messages have been read"
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              title="Lead Capture"
              description="Collect visitor information during conversations"
            >
              <Controller
                name="lead_capture_enabled"
                control={control}
                render={({ field }) => (
                  <ToggleField
                    label="Enable Lead Capture"
                    description="Prompt visitors for their contact information"
                    checked={field.value === true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              {watched.lead_capture_enabled && (
                <div className="space-y-5 pt-4 border-t border-dashed border-border/50 animate-fade-in">
                  <FormField label="Trigger" description="When to show the lead capture form">
                    <Controller
                      name="lead_capture_trigger"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || "first_message"} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never (manual only)</SelectItem>
                            <SelectItem value="first_message">On first user message</SelectItem>
                            <SelectItem value="after_question">After unanswered question</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Capture Message">
                      <Textarea
                        {...register("lead_capture_message")}
                        placeholder="Leave your details so we can follow up:"
                        className="min-h-[70px] text-sm resize-none"
                      />
                    </FormField>
                    <FormField label="Thank You Message">
                      <Textarea
                        {...register("lead_capture_thank_you_message")}
                        placeholder="Thanks! We'll be in touch soon."
                        className="min-h-[70px] text-sm resize-none"
                      />
                    </FormField>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Controller
                      name="lead_capture_skip_enabled"
                      control={control}
                      render={({ field }) => (
                        <ToggleField
                          label="Allow Skip"
                          description="Let users skip the form"
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {watched.lead_capture_skip_enabled && (
                      <FormField label="Skip Button Text">
                        <Input
                          {...register("lead_capture_skip_button_text")}
                          placeholder="Skip for now"
                          className="h-10 text-sm"
                        />
                      </FormField>
                    )}
                  </div>
                </div>
              )}
            </FormSection>
          </div>
        );

      case "channels":
        return (
          <div className="space-y-6">
            <FormSection title="Active Channels" description="Enable the chatbot on different platforms">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "web", label: "Web Widget", icon: "🌐", color: "bg-blue-500/10 border-blue-500/20" },
                  { key: "whatsapp", label: "WhatsApp", icon: "💬", color: "bg-emerald-500/10 border-emerald-500/20" },
                  { key: "email", label: "Email", icon: "✉️", color: "bg-violet-500/10 border-violet-500/20" },
                  { key: "instagram", label: "Instagram", icon: "📷", color: "bg-pink-500/10 border-pink-500/20" },
                  { key: "facebook", label: "Facebook", icon: "📘", color: "bg-blue-600/10 border-blue-600/20" },
                  { key: "sms", label: "SMS", icon: "📱", color: "bg-amber-500/10 border-amber-500/20" },
                ].map((ch) => (
                  <div
                    key={ch.key}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      watched[`channels.${ch.key}.enabled`] ? ch.color : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{ch.icon}</span>
                        <div>
                          <p className="text-[13px] font-semibold font-heading text-foreground">
                            {ch.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-description">
                            {watched[`channels.${ch.key}.enabled`] ? "Active" : "Disabled"}
                          </p>
                        </div>
                      </div>
                      <Controller
                        name={`channels.${ch.key}.enabled`}
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    {watched[`channels.${ch.key}.enabled`] && (
                      <div className="mt-4 pt-4 border-t border-dashed border-border/50 animate-fade-in">
                        <FormField label="Custom Greeting" description="Override the default greeting for this channel">
                          <Input
                            {...register(`channels.${ch.key}.greeting_override`)}
                            placeholder="Use default greeting"
                            className="h-9 text-sm"
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </FormSection>
          </div>
        );

      case "business-hours":
        return (
          <div className="space-y-6">
            <FormSection title="Operating Hours" description="Set when your chatbot is active">
              <Controller
                name="business_hours_enabled"
                control={control}
                render={({ field }) => (
                  <ToggleField
                    label="Enable Business Hours"
                    description="Restrict chatbot availability to specific hours"
                    checked={field.value === true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              {watched.business_hours_enabled && (
                <div className="space-y-5 pt-4 border-t border-dashed border-border/50 animate-fade-in">
                  <FormField label="Timezone">
                    <Input
                      {...register("timezone")}
                      placeholder="e.g., America/New_York"
                      className="h-10 text-sm"
                    />
                  </FormField>

                  <FormField
                    label="Weekly Schedule"
                    description="JSON format defining open/close times for each day"
                  >
                    <Textarea
                      {...register("weekly_schedule")}
                      placeholder='{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {...}}'
                      className="min-h-[120px] text-sm font-mono resize-none"
                    />
                  </FormField>

                  <Controller
                    name="outside_hours_behavior"
                    control={control}
                    render={({ field }) => (
                      <ToggleField
                        label="Continue Answering Outside Hours"
                        description="Bot will still respond but show offline message"
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Offline Message">
                      <Textarea
                        {...register("offline_message")}
                        placeholder="We're currently offline. Leave a message..."
                        className="min-h-[80px] text-sm resize-none"
                      />
                    </FormField>
                    <FormField label="Back Online Message">
                      <Textarea
                        {...register("back_online_message")}
                        placeholder="We're back! How can we help?"
                        className="min-h-[80px] text-sm resize-none"
                      />
                    </FormField>
                  </div>

                  <FormField label="Holiday Hours" description="JSON array of special dates">
                    <Textarea
                      {...register("holiday_hours")}
                      placeholder='[{"date": "2026-12-25", "open": "10:00", "close": "14:00"}]'
                      className="min-h-[80px] text-sm font-mono resize-none"
                    />
                  </FormField>
                </div>
              )}
            </FormSection>
          </div>
        );

      case "escalation":
        return (
          <div className="space-y-6">
            <FormSection
              title="Auto-Escalation"
              description="Automatically transfer conversations to human agents"
            >
              <Controller
                name="auto_escalation_enabled"
                control={control}
                render={({ field }) => (
                  <ToggleField
                    label="Enable Auto-Escalation"
                    description="Automatically escalate based on rules below"
                    checked={field.value === true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />

              {watched.auto_escalation_enabled && (
                <div className="space-y-5 pt-4 border-t border-dashed border-border/50 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Confidence Threshold (%)" description="Escalate when confidence drops below">
                      <Input
                        type="number"
                        {...register("confidence_threshold")}
                        min={0}
                        max={100}
                        placeholder="50"
                        className="h-10 text-sm"
                      />
                    </FormField>
                    <FormField label="Unanswered Questions" description="Escalate after this many failures">
                      <Input
                        type="number"
                        {...register("unanswered_questions_threshold", { setValueAs: v => v != null ? String(v) : v })}
                        min={1}
                        placeholder="3"
                        className="h-10 text-sm"
                      />
                    </FormField>
                  </div>

                  <Controller
                    name="sentiment_escalation_enabled"
                    control={control}
                    render={({ field }) => (
                      <ToggleField
                        label="Sentiment-Based Escalation"
                        description="Escalate when frustration or anger is detected"
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  <FormField label="Keyword Triggers" description="Comma-separated words that trigger escalation">
                    <Input
                      {...register("keyword_triggers")}
                      placeholder="urgent, angry, frustrated, speak to human"
                      className="h-10 text-sm"
                    />
                  </FormField>
                </div>
              )}
            </FormSection>

            <FormSection title="Escalation Notifications" description="Where to send escalation alerts">
              <div className="space-y-5">
                <FormField label="Email Addresses" description="Comma-separated list">
                  <Input
                    {...register("escalation_email_addresses")}
                    placeholder="support@example.com, team@example.com"
                    className="h-10 text-sm"
                  />
                </FormField>
                <FormField label="Slack Webhook URL">
                  <Input
                    {...register("escalation_slack_webhook")}
                    placeholder="https://hooks.slack.com/services/..."
                    className="h-10 text-sm font-mono"
                  />
                </FormField>
                <Controller
                  name="escalation_whatsapp_notification"
                  control={control}
                  render={({ field }) => (
                    <ToggleField
                      label="WhatsApp Notifications"
                      description="Send escalation alerts via WhatsApp"
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </FormSection>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <FormSection title="Notification Settings" description="Configure how you receive alerts">
              <FormField label="Notification Email Addresses" description="Comma-separated list">
                <Input
                  {...register("notification_email_addresses")}
                  placeholder="admin@example.com, alerts@example.com"
                  className="h-10 text-sm"
                />
              </FormField>
              <FormField
                label="Advanced Config"
                description="JSON configuration for additional notification channels"
              >
                <Textarea
                  {...register("notifications_config")}
                  placeholder='{"slack": "#support-channel", "sms": "+1234567890"}'
                  className="min-h-[120px] text-sm font-mono resize-none"
                />
              </FormField>
            </FormSection>
          </div>
        );

      default:
        return null;
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════════ */

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className={cn(
        "flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full",
        formState.isDirty ? "pb-24" : "pb-8"
      )}
    >
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Chatbot Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Customize your AI assistant's personality, appearance, and behavior
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => reset(data || {})}
            disabled={!formState.isDirty}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-9 text-xs gap-1.5"
            disabled={!formState.isDirty || updateMutation.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────────────── */}
      {renderTabNav()}

      {/* ─── Main Content Area ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column: Form Fields */}
        <div className="min-w-0">{renderTabContent()}</div>

        {/* Right Column: Live Preview */}
        <div className="hidden xl:block sticky top-6 self-start">
          <div className="rounded-xl border bg-card p-5 h-[calc(100vh-180px)] min-h-[600px] flex flex-col">
            <LivePreviewWidget config={watched} device={previewDevice} setDevice={setPreviewDevice} />
          </div>
        </div>
      </div>

      {/* ─── Mobile Preview Toggle ──────────────────────────────────────────── */}
      <div className="xl:hidden">
        <details className="group">
          <summary className="flex items-center justify-between gap-2 p-4 rounded-xl border bg-card cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold font-heading text-foreground">Live Preview</p>
                <p className="text-[11px] text-muted-foreground font-description">
                  See how your chatbot looks
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-open:rotate-90 transition-transform" />
          </summary>
          <div className="mt-4 rounded-xl border bg-card p-4 min-h-[500px]">
            <LivePreviewWidget config={watched} device={previewDevice} setDevice={setPreviewDevice} />
          </div>
        </details>
      </div>

      {/* ─── Sticky Save Bar ────────────────────────────────────────────────── */}
      {formState.isDirty && (
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 mt-6 bg-card/95 backdrop-blur-sm border-t px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 z-10 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs text-muted-foreground font-description">You have unsaved changes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => reset(data || {})}
            >
              Discard
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={updateMutation.isPending}
            >
              <Save className="h-3 w-3" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
