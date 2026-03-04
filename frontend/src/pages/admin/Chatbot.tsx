/**
 * Chatbot Configuration — Milestone 7.6
 * Six tabs: Appearance, Behavior, Business Hours, Escalation, Lead Capture, Notifications
 *
 * Redesigned with:
 * - Proper Tailwind design tokens (no hardcoded hex colors)
 * - CSS variable-based theming for light/dark mode support
 * - Hover states via Tailwind classes (no JS onMouseEnter/Leave)
 * - Radix Checkbox with onCheckedChange (not onChange)
 * - Responsive: mobile-first, tablet, desktop
 * - Consistent aesthetic with Dashboard, Leads, Conversations, Analytics pages
 * - Refined editorial SaaS aesthetic
 */

import { useState, useEffect, useCallback } from "react";
import { useChatbotConfig, useUpdateChatbotConfig } from "@/hooks/useChatbot";
import {
  Eye, EyeOff, Upload, GripVertical, X, Plus, Mail, Bell, Settings,
  Palette, Clock, AlertTriangle, UserPlus, BellRing, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TabType = "appearance" | "behavior" | "business-hours" | "escalation" | "lead-capture" | "notifications";

interface ChatbotConfig {
  id: string;
  name: string;
  avatar_url: string | null;
  brand_color: string;
  secondary_color: string;
  user_message_color: string;
  widget_position: string;
  show_powered_by: boolean;
  font_size: string;
  response_language: string;
  response_tone: string;
  response_length: string;
  greeting_message: string | null;
  farewell_message: string | null;
  fallback_message: string | null;
  escalation_message: string | null;
  show_typing: boolean;
  show_citations: boolean;
  read_receipts: boolean;
  suggested_starter_questions: string[] | null;
  conversation_starters_display: string;
  business_hours_enabled: boolean;
  timezone: string | null;
  weekly_schedule: any;
  outside_hours_behavior: string;
  offline_message: string | null;
  back_online_message: string | null;
  holiday_hours: any;
  auto_escalation_enabled: boolean;
  confidence_threshold: number;
  unanswered_questions_threshold: string;
  sentiment_escalation_enabled: boolean;
  keyword_triggers: string[] | null;
  escalation_email_addresses: string[] | null;
  escalation_slack_webhook: string | null;
  escalation_whatsapp_notification: boolean;
  lead_capture_enabled: boolean;
  lead_capture_trigger: string;
  lead_capture_fields_config: any;
  lead_capture_message: string | null;
  lead_capture_thank_you_message: string | null;
  lead_capture_skip_enabled: boolean;
  lead_capture_skip_button_text: string | null;
  notifications_config: any;
  notification_email_addresses: string[] | null;
}

const AVATAR_PRESETS = [
  "\u{1F916}", "\u{1F60A}", "\u{1F3AF}", "\u{1F4A1}", "\u{1F680}", "\u26A1", "\u{1F31F}", "\u{1F4F1}"
];

const LANGUAGES = [
  { code: "auto", label: "Auto-detect (Recommended)" },
  { code: "en", label: "English" },
  { code: "es", label: "Espa\u00F1ol" },
  { code: "fr", label: "Fran\u00E7ais" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Portugu\u00EAs" },
  { code: "nl", label: "Nederlands" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" },
  { code: "zh", label: "\u4E2D\u6587" },
  { code: "ja", label: "\u65E5\u672C\u8A9E" },
  { code: "ko", label: "\uD55C\uAD6D\uC5B4" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "hi", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Africa/Nairobi", "Asia/Dubai", "America/Toronto", "America/Mexico_City",
];

const KEYWORD_TRIGGER_PRESETS = [
  "speak to someone", "manager", "complaint", "refund", "urgent",
  "lawsuit", "cancel", "terrible", "unacceptable", "disappointed",
  "help", "problem", "issue", "emergency", "angry",
];

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "behavior", label: "Behavior", icon: <Settings size={14} /> },
  { id: "business-hours", label: "Business Hours", icon: <Clock size={14} /> },
  { id: "escalation", label: "Escalation", icon: <AlertTriangle size={14} /> },
  { id: "lead-capture", label: "Lead Capture", icon: <UserPlus size={14} /> },
  { id: "notifications", label: "Notifications", icon: <BellRing size={14} /> },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function ChatbotPage() {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState<TabType>("appearance");
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<Partial<ChatbotConfig>>({});
  const { data, isLoading: queryLoading, error } = useChatbotConfig();
  const [showPreview, setShowPreview] = useState(true);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const updateMutation = useUpdateChatbotConfig();
  const saving = updateMutation.status === "pending";

  useEffect(() => {
    if (data) {
      setConfig(data as any);
    }
  }, [data]);

  useEffect(() => {
    setIsSaving(saving);
  }, [saving]);

  if (error) {
    toast({
      title: "Failed to load configuration",
      variant: "destructive",
    });
  }

  const handleConfigChange = useCallback((key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    const payload = config;
    updateMutation.mutate(payload as any, {
      onSuccess: () => {
        toast({
          title: "Configuration saved",
          description: "Your chatbot settings have been updated successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to save chatbot configuration.",
          variant: "destructive",
        });
      },
    });
  };

  if (queryLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col w-full min-w-0 pb-24">

      {/* ── Page Header ── */}
      <header className="mb-5 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-heading text-foreground">
              Chatbot Configuration
            </h1>
            <p className="mt-1 text-[13px] sm:text-sm font-description text-muted-foreground">
              Customize your AI assistant appearance, behavior, and features
            </p>
          </div>
        </div>
      </header>

      {/* ── Tabs Navigation ── */}
      <div className="mb-6 rounded-xl overflow-hidden border border-border bg-card">
        <div className="flex overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-5 py-3.5 text-xs sm:text-sm font-semibold font-heading",
                  "transition-all duration-150 whitespace-nowrap flex-shrink-0 relative border-b-2",
                  isActive
                    ? "text-primary bg-primary/[0.08] border-primary"
                    : "text-muted-foreground/60 border-transparent hover:text-foreground hover:bg-muted/30"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Main Content */}
        <div className={currentTab === "appearance" ? "lg:col-span-2" : "lg:col-span-3"}>
          {currentTab === "appearance" && (
            <Tab1Appearance config={config} onChange={handleConfigChange} />
          )}
          {currentTab === "behavior" && (
            <Tab2Behavior config={config} onChange={handleConfigChange} />
          )}
          {currentTab === "business-hours" && (
            <Tab3BusinessHours config={config} onChange={handleConfigChange} />
          )}
          {currentTab === "escalation" && (
            <Tab4Escalation config={config} onChange={handleConfigChange} onShowEmailPreview={setShowEmailPreview} />
          )}
          {currentTab === "lead-capture" && (
            <Tab5LeadCapture config={config} onChange={handleConfigChange} />
          )}
          {currentTab === "notifications" && (
            <Tab6Notifications config={config} onChange={handleConfigChange} />
          )}
        </div>

        {/* Right Panel: Live Preview (Appearance tab only) */}
        {currentTab === "appearance" && (
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold font-heading text-foreground">
                  Live Preview
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              {showPreview && <LiveWidgetPreview config={config as ChatbotConfig} />}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Save Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-6 py-3 sm:py-4 bg-background/92 backdrop-blur-md border-t border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-description text-muted-foreground/60 sm:hidden">
            {isSaving ? "Saving changes..." : "Unsaved changes"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              className="text-xs sm:text-sm font-description h-8 sm:h-9 px-3 sm:px-4"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs sm:text-sm font-description h-8 sm:h-9 px-3 sm:px-5 gap-1.5"
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      <EmailPreviewModal config={config} isOpen={showEmailPreview} onClose={() => setShowEmailPreview(false)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable: Section Card wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
        <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
          {title}
        </h2>
      </div>
      <div className="px-4 sm:px-6 py-5 sm:py-6">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable: Styled select
   ═══════════════════════════════════════════════════════════════════════════ */

function StyledSelect({ id, value, onChange, children, className = "" }: {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={cn(
        "w-full px-3 h-9 sm:h-10 rounded-lg text-sm font-description transition-colors duration-150",
        "bg-muted/50 border border-border text-foreground",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        className
      )}
    >
      {children}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable: Toggle row
   ═══════════════════════════════════════════════════════════════════════════ */

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: any) => void }) {
  return (
    <label className="flex items-center justify-between py-3 cursor-pointer group border-b border-border/50">
      <span className="text-xs sm:text-sm font-description text-muted-foreground">{label}</span>
      <Checkbox checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable: Radio option
   ═══════════════════════════════════════════════════════════════════════════ */

function RadioOption({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: () => void; description?: string }) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-150 border",
        checked
          ? "bg-primary/[0.06] border-primary/20"
          : "bg-transparent border-transparent hover:bg-muted/30"
      )}
      onClick={onChange}
    >
      <Checkbox checked={checked} onCheckedChange={() => onChange()} className="mt-0.5" />
      <div>
        <span className={cn(
          "text-xs sm:text-sm font-description capitalize",
          checked ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </span>
        {description && (
          <p className="text-[11px] font-description mt-0.5 text-muted-foreground/60">{description}</p>
        )}
      </div>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab 1 — Appearance
   ═══════════════════════════════════════════════════════════════════════════ */

function Tab1Appearance({ config, onChange }: any) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionCard title="Appearance">
        {/* Chatbot Name */}
        <div className="mb-5 sm:mb-6">
          <Label htmlFor="bot-name" className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">
            Chatbot Name
          </Label>
          <Input
            id="bot-name"
            value={config.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g., Aria Assistant"
            className="h-9 sm:h-10 text-sm font-description bg-muted/50 border-border text-foreground"
          />
        </div>

        {/* Avatar Picker */}
        <div className="mb-5 sm:mb-6">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Avatar</Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
            {AVATAR_PRESETS.map((emoji, idx) => {
              const isSelected = !config.avatar_url || config.avatar_url === emoji;
              return (
                <button
                  key={idx}
                  className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl transition-all duration-150 border-2",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-transparent hover:border-muted-foreground/30"
                  )}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs font-description h-9 gap-2"
          >
            <Upload size={14} />
            Upload Custom Avatar
          </Button>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 sm:mb-6">
          <div>
            <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Brand Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.brand_color || "#4F8EF7"}
                onChange={(e) => onChange("brand_color", e.target.value)}
                className="w-10 h-9 sm:w-12 sm:h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <Input
                value={config.brand_color || "#4F8EF7"}
                onChange={(e) => onChange("brand_color", e.target.value)}
                placeholder="#4F8EF7"
                className="flex-1 h-9 sm:h-10 text-sm font-mono bg-muted/50 border-border text-foreground"
              />
            </div>
          </div>
          <div>
            <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">User Message Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.user_message_color || "#4F8EF7"}
                onChange={(e) => onChange("user_message_color", e.target.value)}
                className="w-10 h-9 sm:w-12 sm:h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <Input
                value={config.user_message_color || "#4F8EF7"}
                onChange={(e) => onChange("user_message_color", e.target.value)}
                placeholder="#4F8EF7"
                className="flex-1 h-9 sm:h-10 text-sm font-mono bg-muted/50 border-border text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Widget Position */}
        <div className="mb-5 sm:mb-6">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Widget Position</Label>
          <div className="flex gap-3 sm:gap-4">
            {["bottom_right", "bottom_left"].map(pos => (
              <label key={pos} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={config.widget_position === pos}
                  onCheckedChange={() => onChange("widget_position", pos)}
                />
                <span className="text-xs sm:text-sm font-description capitalize text-muted-foreground">
                  {pos.replace("_", " ")}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-5 sm:mb-6">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Font Size</Label>
          <div className="flex gap-2">
            {["small", "medium", "large"].map(size => {
              const isSelected = config.font_size === size;
              return (
                <button
                  key={size}
                  onClick={() => onChange("font_size", size)}
                  className={cn(
                    "flex-1 h-9 rounded-lg text-xs sm:text-sm font-description font-semibold transition-all duration-150 border",
                    isSelected
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/30"
                  )}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle: Powered By */}
        <ToggleRow
          label={'Show "Powered by NexaChat" badge'}
          checked={config.show_powered_by}
          onChange={(checked) => onChange("show_powered_by", checked)}
        />
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab 2 — Behavior
   ═══════════════════════════════════════════════════════════════════════════ */

function Tab2Behavior({ config, onChange }: any) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionCard title="Behavior">
        {/* Response Language */}
        <div className="mb-5 sm:mb-6">
          <Label htmlFor="language" className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">
            Response Language
          </Label>
          <StyledSelect
            id="language"
            value={config.response_language || "auto"}
            onChange={(e) => onChange("response_language", e.target.value)}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </StyledSelect>
        </div>

        {/* Response Tone */}
        <div className="mb-5 sm:mb-6">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Response Tone</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {["professional", "friendly", "casual", "formal"].map(tone => (
              <RadioOption
                key={tone}
                label={tone}
                checked={config.response_tone === tone}
                onChange={() => onChange("response_tone", tone)}
              />
            ))}
          </div>
        </div>

        {/* Response Length */}
        <div className="mb-5 sm:mb-6">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Response Length</Label>
          <div className="space-y-2">
            {[
              { value: "short", label: "Concise", description: "1-2 sentences" },
              { value: "medium", label: "Balanced", description: "3-5 sentences (Default)" },
              { value: "long", label: "Detailed", description: "Full explanation" },
            ].map(length => (
              <RadioOption
                key={length.value}
                label={length.label}
                description={length.description}
                checked={config.response_length === length.value}
                onChange={() => onChange("response_length", length.value)}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4 pt-5 sm:pt-6 border-t border-border">
          {[
            { key: "greeting_message", label: "Greeting Message", placeholder: "e.g., Hi! How can I help you today?", rows: 3, hint: "Merge tags: {{business_name}}, {{time_of_day}}" },
            { key: "farewell_message", label: "Farewell Message", placeholder: "e.g., Thanks for chatting with us!", rows: 2 },
            { key: "fallback_message", label: "Fallback Message", placeholder: "Shown when the bot doesn't know the answer", rows: 2 },
            { key: "escalation_message", label: "Escalation Message", placeholder: "Shown when escalating to human", rows: 2 },
          ].map(msg => (
            <div key={msg.key}>
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">{msg.label}</Label>
              <Textarea
                value={(config as any)[msg.key] || ""}
                onChange={(e) => onChange(msg.key, e.target.value)}
                placeholder={msg.placeholder}
                className="text-sm font-description resize-none bg-muted/50 border-border text-foreground"
                style={{ minHeight: msg.rows === 3 ? 80 : 64 }}
                rows={msg.rows}
              />
              {msg.hint && (
                <p className="text-[11px] font-description mt-1 text-muted-foreground/60">{msg.hint}</p>
              )}
            </div>
          ))}
        </div>

        {/* Toggles */}
        <div className="pt-5 sm:pt-6 border-t border-border">
          <ToggleRow label="Show typing indicator" checked={config.show_typing} onChange={(checked) => onChange("show_typing", checked)} />
          <ToggleRow label="Show source citations" checked={config.show_citations} onChange={(checked) => onChange("show_citations", checked)} />
          <ToggleRow label="Show read receipts" checked={config.read_receipts} onChange={(checked) => onChange("read_receipts", checked)} />
        </div>

        {/* Suggested Questions */}
        <div className="pt-5 sm:pt-6 border-t border-border">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Suggested Starter Questions (up to 5)</Label>
          <div className="space-y-2 mb-3">
            {(config.suggested_starter_questions || []).map((q: string, idx: number) => (
              <div key={idx} className="flex gap-2 items-center">
                <GripVertical size={14} className="flex-shrink-0 cursor-grab text-muted-foreground/60" />
                <Input
                  value={q}
                  onChange={(e) => {
                    const qs = [...(config.suggested_starter_questions || [])];
                    qs[idx] = e.target.value;
                    onChange("suggested_starter_questions", qs);
                  }}
                  className="flex-1 h-9 text-sm font-description bg-muted/50 border-border text-foreground"
                />
                <button
                  onClick={() => {
                    const qs = (config.suggested_starter_questions || []).filter((_: any, i: number) => i !== idx);
                    onChange("suggested_starter_questions", qs);
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0 text-destructive hover:bg-destructive/10"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {(config.suggested_starter_questions || []).length < 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const qs = [...(config.suggested_starter_questions || []), ""];
                onChange("suggested_starter_questions", qs);
              }}
              className="w-full text-xs font-description h-9 gap-1.5"
            >
              <Plus size={14} />
              Add question
            </Button>
          )}
        </div>

        {/* Conversation Starters Display */}
        <div className="pt-5 sm:pt-6 border-t border-border">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Show Conversation Starters</Label>
          <div className="space-y-2">
            {["first_visit_only", "every_session"].map(mode => (
              <RadioOption
                key={mode}
                label={mode === "first_visit_only" ? "First visit only" : "Every session"}
                checked={config.conversation_starters_display === mode}
                onChange={() => onChange("conversation_starters_display", mode)}
              />
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab 3 — Business Hours
   ═══════════════════════════════════════════════════════════════════════════ */

function Tab3BusinessHours({ config, onChange }: any) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionCard title="Business Hours">
        <label className="flex items-center gap-3 cursor-pointer mb-5 sm:mb-6">
          <Checkbox
            checked={config.business_hours_enabled || false}
            onCheckedChange={(checked) => onChange("business_hours_enabled", checked)}
          />
          <span className="text-xs sm:text-sm font-description text-muted-foreground">Enable business hours mode</span>
        </label>

        {config.business_hours_enabled && (
          <>
            <div className="mb-5 sm:mb-6">
              <Label htmlFor="timezone" className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">
                Timezone
              </Label>
              <StyledSelect
                id="timezone"
                value={config.timezone || ""}
                onChange={(e) => onChange("timezone", e.target.value)}
              >
                <option value="">Select timezone...</option>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </StyledSelect>
            </div>

            <div className="mb-5 sm:mb-6">
              <Label className="text-xs sm:text-sm font-medium font-description mb-3 block text-muted-foreground">Weekly Schedule</Label>
              <div className="rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 bg-muted/50 border border-border">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, idx) => (
                  <div key={idx} className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                    <Checkbox defaultChecked className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-description w-20 sm:w-24 flex-shrink-0 text-muted-foreground">{day}</span>
                    <Input
                      placeholder="09:00"
                      className="h-8 sm:h-9 text-xs sm:text-sm font-mono w-16 sm:w-20 bg-muted/30 border-border text-foreground"
                    />
                    <span className="text-xs text-muted-foreground/60">&mdash;</span>
                    <Input
                      placeholder="17:00"
                      className="h-8 sm:h-9 text-xs sm:text-sm font-mono w-16 sm:w-20 bg-muted/30 border-border text-foreground"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Outside Business Hours</Label>
              <div className="space-y-2">
                {[
                  { value: "continue_answering", label: "Continue answering", description: "Keep answering from knowledge base" },
                  { value: "ai_offline_collect_details", label: "AI offline", description: "Collect contact details only" },
                  { value: "show_offline_message", label: "Offline message", description: "Show custom offline message" },
                ].map(option => (
                  <RadioOption
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    checked={config.outside_hours_behavior === option.value}
                    onChange={() => onChange("outside_hours_behavior", option.value)}
                  />
                ))}
              </div>
            </div>

            {config.outside_hours_behavior === "show_offline_message" && (
              <div className="mb-5 sm:mb-6">
                <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Offline Message</Label>
                <Textarea
                  value={config.offline_message || ""}
                  onChange={(e) => onChange("offline_message", e.target.value)}
                  placeholder="e.g., We're currently closed. Please leave your details and we'll get back to you."
                  className="text-sm font-description resize-none bg-muted/50 border-border text-foreground"
                  style={{ minHeight: 80 }}
                />
              </div>
            )}

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">&ldquo;Back online at&rdquo; Message Template</Label>
              <Input
                value={config.back_online_message || ""}
                onChange={(e) => onChange("back_online_message", e.target.value)}
                placeholder="e.g., We'll be back at {{next_open_time}}"
                className="h-9 sm:h-10 text-sm font-description bg-muted/50 border-border text-foreground"
              />
            </div>

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Holiday Hours (Optional)</Label>
              <p className="text-[11px] font-description mb-3 text-muted-foreground/60">Add special hours for holidays or closed days</p>
              <div className="rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 bg-muted/50 border border-border">
                {(config.holiday_hours && Array.isArray(config.holiday_hours) && config.holiday_hours.length > 0) ? (
                  <>
                    {config.holiday_hours.map((holiday: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-description font-medium text-foreground">{holiday.date}</div>
                          <div className="text-xs font-mono text-muted-foreground/60">
                            {holiday.open_time && holiday.close_time
                              ? `${holiday.open_time} \u2014 ${holiday.close_time}`
                              : 'Closed'}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = config.holiday_hours.filter((_: any, i: number) => i !== idx);
                            onChange("holiday_hours", updated);
                          }}
                          className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 w-7 h-7 p-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-xs font-description italic py-2 text-muted-foreground/60">No holiday hours configured yet</div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const holidays = Array.isArray(config.holiday_hours) ? config.holiday_hours : [];
                  const newHoliday = { date: new Date().toISOString().split('T')[0], open_time: "09:00", close_time: "17:00" };
                  onChange("holiday_hours", [...holidays, newHoliday]);
                }}
                className="mt-3 w-full text-xs font-description h-9 gap-1.5"
              >
                <Plus size={14} />
                Add Holiday Hours
              </Button>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab 4 — Escalation Triggers
   ═══════════════════════════════════════════════════════════════════════════ */

function Tab4Escalation({ config, onChange, onShowEmailPreview }: any) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionCard title="Escalation Triggers">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={config.auto_escalation_enabled || false}
              onCheckedChange={(checked) => onChange("auto_escalation_enabled", checked)}
            />
            <span className="text-xs sm:text-sm font-description text-muted-foreground">Enable auto-escalation</span>
          </label>
          {config.auto_escalation_enabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onShowEmailPreview(true)}
              className="text-xs font-description h-8 gap-1.5 self-start sm:self-auto"
            >
              <Mail size={14} />
              Preview Email
            </Button>
          )}
        </div>

        {config.auto_escalation_enabled && (
          <>
            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">
                Confidence Threshold: <span className="font-mono text-primary">{config.confidence_threshold || 50}%</span>
              </Label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.confidence_threshold || 50}
                onChange={(e) => onChange("confidence_threshold", parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5"
              />
              <p className="text-[11px] font-description mt-2 text-muted-foreground/60">Escalate if response confidence is below this threshold</p>
            </div>

            <div className="mb-5 sm:mb-6">
              <Label htmlFor="unanswered" className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">
                After X unanswered questions
              </Label>
              <Input
                id="unanswered"
                type="number"
                value={config.unanswered_questions_threshold || 3}
                onChange={(e) => onChange("unanswered_questions_threshold", e.target.value)}
                className="h-9 sm:h-10 text-sm font-mono w-20 sm:w-24 bg-muted/50 border-border text-foreground"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer mb-5 sm:mb-6">
              <Checkbox
                checked={config.sentiment_escalation_enabled || false}
                onCheckedChange={(checked) => onChange("sentiment_escalation_enabled", checked)}
              />
              <span className="text-xs sm:text-sm font-description text-muted-foreground">Escalate on negative sentiment</span>
            </label>

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Keyword Triggers</Label>
              <p className="text-[11px] font-description mb-3 text-muted-foreground/60">Add keywords that will trigger escalation. Click presets or type custom keywords.</p>

              {/* Tag Display and Input */}
              <div className="rounded-lg p-3 mb-3 bg-muted/50 border border-border">
                <div className="flex flex-wrap gap-2 mb-3">
                  {(config.keyword_triggers || []).map((keyword: string, idx: number) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-description font-semibold bg-primary/10 border border-primary/25 text-primary"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = config.keyword_triggers?.filter((_: string, i: number) => i !== idx) || [];
                          onChange("keyword_triggers", updated);
                        }}
                        className="text-primary/60 hover:text-primary transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    id="keyword-input"
                    placeholder="Type keyword and press Enter..."
                    className="flex-1 h-8 sm:h-9 text-xs sm:text-sm font-description bg-muted/30 border-border text-foreground"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !config.keyword_triggers?.includes(value)) {
                          onChange("keyword_triggers", [...(config.keyword_triggers || []), value]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById("keyword-input") as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !config.keyword_triggers?.includes(value)) {
                        onChange("keyword_triggers", [...(config.keyword_triggers || []), value]);
                        input.value = "";
                      }
                    }}
                    className="text-xs font-description h-8 sm:h-9 px-3"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Preset Suggestions */}
              <div className="rounded-lg p-3 bg-muted/50 border border-border">
                <p className="text-[11px] font-description mb-2 text-muted-foreground/60">Quick presets:</p>
                <div className="flex flex-wrap gap-1.5">
                  {KEYWORD_TRIGGER_PRESETS.map((preset) => {
                    const isAdded = config.keyword_triggers?.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (!isAdded) {
                            onChange("keyword_triggers", [...(config.keyword_triggers || []), preset]);
                          }
                        }}
                        disabled={isAdded}
                        className={cn(
                          "text-[11px] py-1 px-2 rounded-md font-description transition-all duration-150 border",
                          isAdded
                            ? "bg-primary/10 border-primary/25 text-primary opacity-70 cursor-default"
                            : "bg-muted/30 border-border text-muted-foreground cursor-pointer hover:border-muted-foreground/30"
                        )}
                      >
                        + {preset}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Escalation Email Addresses</Label>
              <Textarea
                value={(config.escalation_email_addresses || []).join("\n")}
                onChange={(e) => onChange("escalation_email_addresses", e.target.value.split("\n").filter(Boolean))}
                placeholder={"support@example.com\nmanager@example.com"}
                className="text-sm font-description resize-none bg-muted/50 border-border text-foreground"
                style={{ minHeight: 64 }}
              />
            </div>

            <div className="mb-5 sm:mb-6">
              <Label htmlFor="slack" className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Slack Webhook URL (optional)</Label>
              <Input
                id="slack"
                value={config.escalation_slack_webhook || ""}
                onChange={(e) => onChange("escalation_slack_webhook", e.target.value)}
                placeholder="https://hooks.slack.com/..."
                className="h-9 sm:h-10 text-sm font-description bg-muted/50 border-border text-foreground"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={config.escalation_whatsapp_notification || false}
                onCheckedChange={(checked) => onChange("escalation_whatsapp_notification", checked)}
              />
              <span className="text-xs sm:text-sm font-description text-muted-foreground">Send WhatsApp notification on escalation</span>
            </label>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab 5 — Lead Capture
   ═══════════════════════════════════════════════════════════════════════════ */

function Tab5LeadCapture({ config, onChange }: any) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionCard title="Lead Capture">
        <label className="flex items-center gap-3 cursor-pointer mb-5 sm:mb-6">
          <Checkbox
            checked={config.lead_capture_enabled || false}
            onCheckedChange={(checked) => onChange("lead_capture_enabled", checked)}
          />
          <span className="text-xs sm:text-sm font-description text-muted-foreground">Enable lead capture</span>
        </label>

        {config.lead_capture_enabled && (
          <>
            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-3 text-muted-foreground">Trigger Lead Capture</Label>
              <div className="space-y-2">
                {[
                  { value: "after_x_messages", label: "After X messages" },
                  { value: "on_escalation", label: "On escalation" },
                  { value: "at_conversation_start", label: "At conversation start" },
                  { value: "never", label: "Never" },
                ].map(opt => (
                  <RadioOption
                    key={opt.value}
                    label={opt.label}
                    checked={config.lead_capture_trigger === opt.value}
                    onChange={() => onChange("lead_capture_trigger", opt.value)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Lead Capture Message</Label>
              <Textarea
                value={config.lead_capture_message || ""}
                onChange={(e) => onChange("lead_capture_message", e.target.value)}
                placeholder="e.g., To help you better, could you provide your details?"
                className="text-sm font-description resize-none bg-muted/50 border-border text-foreground"
                style={{ minHeight: 64 }}
              />
            </div>

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Thank You Message</Label>
              <Textarea
                value={config.lead_capture_thank_you_message || ""}
                onChange={(e) => onChange("lead_capture_thank_you_message", e.target.value)}
                placeholder="e.g., Thanks! We'll follow up with you soon."
                className="text-sm font-description resize-none bg-muted/50 border-border text-foreground"
                style={{ minHeight: 64 }}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <Checkbox
                checked={config.lead_capture_skip_enabled || false}
                onCheckedChange={(checked) => onChange("lead_capture_skip_enabled", checked)}
              />
              <span className="text-xs sm:text-sm font-description text-muted-foreground">Allow users to skip lead capture</span>
            </label>

            {config.lead_capture_skip_enabled && (
              <div className="mb-5 sm:mb-6">
                <Label htmlFor="skip-text" className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">
                  Skip Button Text
                </Label>
                <Input
                  id="skip-text"
                  value={config.lead_capture_skip_button_text || ""}
                  onChange={(e) => onChange("lead_capture_skip_button_text", e.target.value)}
                  placeholder="e.g., Skip for now"
                  className="h-9 sm:h-10 text-sm font-description bg-muted/50 border-border text-foreground"
                />
              </div>
            )}

            <div className="mb-5 sm:mb-6">
              <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Lead Capture Fields Configuration</Label>
              <p className="text-[11px] font-description mb-4 text-muted-foreground/60">Set which fields are required, optional, or disabled for lead capture</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "full_name", label: "Full Name", icon: "\u{1F464}" },
                  { key: "email", label: "Email Address", icon: "\u{1F4E7}" },
                  { key: "phone", label: "Phone Number", icon: "\u{1F4F1}" },
                  { key: "company", label: "Company", icon: "\u{1F3E2}" },
                ].map((field) => {
                  const fieldConfig = (config.lead_capture_fields_config?.[field.key] || "optional");
                  return (
                    <div
                      key={field.key}
                      className="rounded-lg p-3 sm:p-4 transition-all duration-150 bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">{field.icon}</span>
                        <span className="text-xs sm:text-sm font-medium font-description text-foreground">{field.label}</span>
                      </div>

                      <div className="flex gap-1.5 flex-wrap">
                        {["required", "optional", "disabled"].map((state) => {
                          const isActive = fieldConfig === state;
                          return (
                            <button
                              key={state}
                              type="button"
                              onClick={() => {
                                const newConfig = { ...config.lead_capture_fields_config };
                                newConfig[field.key] = state;
                                onChange("lead_capture_fields_config", newConfig);
                              }}
                              className={cn(
                                "text-[11px] py-1 px-2.5 rounded-md font-description font-semibold transition-all duration-150 border",
                                isActive
                                  ? "bg-primary/10 border-primary/25 text-primary"
                                  : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/30"
                              )}
                            >
                              {state.charAt(0).toUpperCase() + state.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab 6 — Notifications
   ═══════════════════════════════════════════════════════════════════════════ */

function Tab6Notifications({ config, onChange }: any) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionCard title="Notifications">
        <p className="text-xs sm:text-sm font-description mb-5 sm:mb-6 text-muted-foreground">
          Choose which notifications your team receives and where. Select one or both channels (Email, Slack) for each notification type.
        </p>

        <div className="mb-5 sm:mb-6">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Notification Recipients</Label>
          <Textarea
            value={(config.notification_email_addresses || []).join("\n")}
            onChange={(e) => onChange("notification_email_addresses", e.target.value.split("\n").filter(Boolean))}
            placeholder={"support@example.com\nmanager@example.com"}
            className="text-sm font-description resize-none bg-muted/50 border-border text-foreground"
            style={{ minHeight: 80 }}
          />
          <p className="text-[11px] font-description mt-1.5 text-muted-foreground/60">One email per line</p>
        </div>

        <div className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-lg bg-muted/50 border border-border">
          <Label className="block text-xs sm:text-sm font-medium font-description mb-2 text-muted-foreground">Daily Summary Send Time</Label>
          <p className="text-[11px] font-description mb-3 text-muted-foreground/60">Choose what time daily summary reports are sent to your team</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <input
              type="time"
              value={(config.notifications_config?.daily_summary_time || "09:00")}
              onChange={(e) => {
                const notifConfig = config.notifications_config || {};
                notifConfig.daily_summary_time = e.target.value;
                onChange("notifications_config", notifConfig);
              }}
              className="px-3 h-9 rounded-lg text-sm font-mono bg-muted/30 border border-border text-foreground"
            />
            <span className="text-xs font-description text-muted-foreground/60">
              Daily reports sent at this time in your configured timezone
            </span>
          </div>
        </div>

        {/* Notification Matrix */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[400px] px-4 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-2 sm:px-3 text-left text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground/60">Notification</th>
                  <th className="py-3 px-2 sm:px-3 text-center text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground/60">
                    <div className="flex justify-center items-center gap-1">
                      <Mail size={13} /> Email
                    </div>
                  </th>
                  <th className="py-3 px-2 sm:px-3 text-center text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground/60">
                    <div className="flex justify-center items-center gap-1">
                      <Bell size={13} /> Slack
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "new_lead", label: "New lead captured" },
                  { key: "escalation", label: "Conversation escalated" },
                  { key: "negative_feedback", label: "Negative feedback received" },
                  { key: "daily_summary", label: "Daily summary report" },
                  { key: "weekly_summary", label: "Weekly summary report" },
                  { key: "monthly_report", label: "Monthly performance report" },
                  { key: "usage_warning", label: "80% usage limit warning" },
                  { key: "document_failure", label: "Document processing failed" },
                  { key: "chatbot_error", label: "Chatbot error occurred" },
                ].map((notif) => (
                  <tr
                    key={notif.key}
                    className="border-b border-border/50 transition-colors duration-150 hover:bg-muted/20"
                  >
                    <td className="py-3 px-2 sm:px-3">
                      <span className="text-xs sm:text-sm font-description text-muted-foreground">{notif.label}</span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <Checkbox defaultChecked />
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <Checkbox />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Live Widget Preview
   ═══════════════════════════════════════════════════════════════════════════ */

function LiveWidgetPreview({ config }: { config: ChatbotConfig }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
      {/* Mock browser frame */}
      <div className="px-3 sm:px-4 py-2 flex items-center gap-2 bg-slate-400 dark:bg-slate-600">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <div className="flex-1 h-4 rounded-md mx-4 bg-white/30" />
      </div>

      {/* Page content placeholder */}
      <div className="p-4 sm:p-6">
        <div className="space-y-3 mb-4">
          <div className="h-2.5 rounded-full w-3/4 bg-slate-400 dark:bg-slate-500" />
          <div className="h-2 rounded-full w-full bg-slate-300 dark:bg-slate-600" />
          <div className="h-2 rounded-full w-5/6 bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Chat widget preview */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden mx-auto flex flex-col bg-white dark:bg-slate-900"
          style={{ maxWidth: 320, height: 420 }}
        >
          {/* Widget header */}
          <div
            style={{ backgroundColor: config.brand_color || "hsl(var(--primary))" }}
            className="px-4 py-3 text-white flex items-center justify-between flex-shrink-0"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-base">
                {"\u{1F916}"}
              </div>
              <div>
                <div className="font-semibold text-sm">{config.name || "Assistant"}</div>
                <div className="text-[11px] opacity-85 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                  Online
                </div>
              </div>
            </div>
            <button className="text-white/60 hover:text-white text-sm">{"\u2715"}</button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50">
            {/* Bot message */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 flex items-center justify-center text-xs">
                {"\u{1F916}"}
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 text-[12px] text-slate-700 dark:text-slate-300 max-w-[80%] shadow-sm">
                {config.greeting_message || "Hi! How can I help you today?"}
              </div>
            </div>

            {/* User message */}
            <div className="flex justify-end gap-2">
              <div
                className="rounded-2xl rounded-tr-sm px-3 py-2 text-[12px] text-white max-w-[80%] shadow-sm"
                style={{ backgroundColor: config.user_message_color || "hsl(var(--primary))" }}
              >
                This looks great!
              </div>
            </div>

            {/* Starter questions */}
            {config.suggested_starter_questions && config.suggested_starter_questions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {config.suggested_starter_questions.slice(0, 3).map((q: string, i: number) => (
                  q && (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-1 rounded-full bg-primary/[0.08] border border-primary/20"
                      style={{ color: config.brand_color || "hsl(var(--primary))" }}
                    >
                      {q.length > 30 ? q.slice(0, 30) + "..." : q}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-2.5 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-[12px] focus:outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                readOnly
              />
              <button
                style={{ backgroundColor: config.brand_color || "hsl(var(--primary))" }}
                className="text-white rounded-full w-8 h-8 flex items-center justify-center text-sm flex-shrink-0"
              >
                {"\u2192"}
              </button>
            </div>
          </div>
        </div>

        {config.show_powered_by && (
          <div className="text-[11px] mt-3 text-center text-slate-500 dark:text-slate-400">
            Powered by NexaChat
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Email Preview Modal
   ═══════════════════════════════════════════════════════════════════════════ */

function EmailPreviewModal({ config, isOpen, onClose }: { config: Partial<ChatbotConfig>; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="rounded-xl overflow-hidden w-full max-h-[90vh] flex flex-col bg-white dark:bg-card"
        style={{ maxWidth: 720 }}
      >
        {/* Modal header */}
        <div className="sticky top-0 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0 bg-white dark:bg-card border-b border-gray-200 dark:border-border">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-foreground font-heading">Escalation Email Preview</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="bg-gray-50 dark:bg-muted/30 border border-gray-200 dark:border-border rounded-lg p-4 sm:p-6 font-sans">
            {/* Email header */}
            <div className="mb-6 border-b border-gray-300 dark:border-border pb-4 space-y-1.5">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">
                <strong>From:</strong> escalations@chatbot.local
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">
                <strong>To:</strong> {(config.escalation_email_addresses || []).join(", ") || "support@example.com"}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">
                <strong>Subject:</strong> Chat Escalation - Customer Support Required
              </div>
            </div>

            {/* Email body */}
            <div className="text-gray-800 dark:text-foreground/90 space-y-4 text-sm">
              <p>Hi Team,</p>
              <p>A customer conversation has been escalated and requires your immediate attention.</p>

              <div className="bg-white dark:bg-card border-l-4 border-red-500 p-4 my-4 rounded-r">
                <div className="font-semibold text-gray-900 dark:text-foreground mb-2 text-sm">Escalation Details:</div>
                <ul className="space-y-1.5 text-gray-700 dark:text-muted-foreground text-xs sm:text-sm">
                  <li><strong>Reason:</strong> {config.sentiment_escalation_enabled ? "Negative sentiment detected" : "Confidence threshold not met"}</li>
                  <li><strong>Customer Name:</strong> John Doe</li>
                  <li><strong>Customer Email:</strong> john@example.com</li>
                  <li><strong>Timestamp:</strong> {new Date().toLocaleString()}</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded border border-blue-200 dark:border-primary/20">
                <div className="font-semibold text-gray-900 dark:text-foreground mb-2 text-sm">Conversation Summary:</div>
                <div className="text-gray-700 dark:text-muted-foreground space-y-1.5">
                  <p className="text-xs sm:text-sm"><strong>Customer:</strong> &ldquo;I&rsquo;ve been trying to resolve this issue for days and nothing is working!&rdquo;</p>
                  <p className="text-xs sm:text-sm"><strong>Bot Response:</strong> Generic auto-response about checking our knowledge base...</p>
                </div>
              </div>

              <p>Please log in to the dashboard to review the full conversation and provide assistance.</p>

              {config.escalation_slack_webhook && (
                <p className="text-blue-600 dark:text-primary text-xs">
                  A notification has also been sent to Slack
                </p>
              )}

              <p className="text-gray-600 dark:text-muted-foreground">
                Best regards,<br />
                <strong>NexaChat Escalation System</strong>
              </p>
            </div>
          </div>

          {/* Additional info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-primary/10 border border-blue-200 dark:border-primary/20 rounded-lg text-sm text-blue-900 dark:text-primary">
            <p className="font-semibold mb-2 text-sm">Email Configuration Summary:</p>
            <ul className="space-y-1 text-xs">
              <li>Recipients: {(config.escalation_email_addresses || []).length} email address(es) configured</li>
              <li>Slack Integration: {config.escalation_slack_webhook ? "Enabled" : "Disabled"}</li>
              <li>WhatsApp Notification: {config.escalation_whatsapp_notification ? "Enabled" : "Disabled"}</li>
              <li>Sentiment Detection: {config.sentiment_escalation_enabled ? "Enabled" : "Disabled"}</li>
            </ul>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-4 sm:px-6 py-4 flex justify-end flex-shrink-0 bg-gray-50 dark:bg-muted/20 border-t border-gray-200 dark:border-border">
          <Button
            onClick={onClose}
            className="text-sm font-description"
          >
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-7 w-56 mb-2 rounded" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      {/* Tabs skeleton */}
      <div className="mb-6 rounded-xl p-1 flex gap-2 border border-border bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-lg" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
