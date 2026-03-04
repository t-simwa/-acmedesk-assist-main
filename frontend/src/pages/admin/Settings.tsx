import { useState, useEffect, useRef } from "react";
import { userPreferencesApi, workspaceApi, teamApi, billingApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, Loader2, Save, Upload, X, User, Mail, Globe, Calendar, Clock,
  Shield, Bell, CreditCard, Users, Link2, Key, Monitor, Smartphone, MapPin,
  AlertTriangle, Trash2, Download, Pause, Play, Check, Copy, ExternalLink,
  MoreHorizontal, ChevronDown, Building2, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "account", label: "Account", shortLabel: "Account", icon: Building2 },
  { id: "team", label: "Team", shortLabel: "Team", icon: Users },
  { id: "billing", label: "Billing", shortLabel: "Billing", icon: CreditCard },
  { id: "install", label: "Install", shortLabel: "Install", icon: Link2 },
  { id: "security", label: "Security", shortLabel: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", shortLabel: "Notifs", icon: Bell },
  { id: "danger", label: "Danger Zone", shortLabel: "Danger", icon: AlertTriangle },
] as const;

type TabId = typeof TABS[number]["id"];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Kolkata", label: "Mumbai, Kolkata, New Delhi" },
  { value: "Australia/Sydney", label: "Sydney" },
];

const INDUSTRIES = [
  { value: "technology", label: "Technology" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "real_estate", label: "Real Estate" },
  { value: "travel", label: "Travel & Hospitality" },
  { value: "food", label: "Food & Beverage" },
  { value: "other", label: "Other" },
];

const PLATFORMS = [
  { id: "html", label: "HTML", icon: Code },
  { id: "wordpress", label: "WordPress", icon: ExternalLink },
  { id: "shopify", label: "Shopify", icon: ExternalLink },
  { id: "webflow", label: "Webflow", icon: ExternalLink },
  { id: "wix", label: "Wix", icon: ExternalLink },
  { id: "squarespace", label: "Squarespace", icon: ExternalLink },
  { id: "custom", label: "Custom", icon: Code },
] as const;

function Code({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "agent";
  status: "active" | "pending";
  lastActive?: string;
  avatarUrl?: string;
}

interface BillingInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  url?: string;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  lastUsed?: string;
  createdAt: string;
}

export default function Settings() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountFullName, setAccountFullName] = useState("");
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timezone, setTimezone] = useState("UTC");

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [inviteMessage, setInviteMessage] = useState("");
  const [showRemoveModal, setShowRemoveModal] = useState<TeamMember | null>(null);

  const [currentPlan, setCurrentPlan] = useState({
    name: "Pro",
    price: 49,
    nextBillingDate: "2026-04-01",
    conversations: { used: 412, limit: 500 },
    documents: { used: 8, limit: 20 },
    storage: { used: 47, limit: 100 },
    channels: { used: 3, limit: 4 },
  });
  const [paymentMethod, setPaymentMethod] = useState({
    last4: "4242",
    expiry: "12/27",
    brand: "Visa",
  });
  const [billingHistory, setBillingHistory] = useState<BillingInvoice[]>([
    { id: "1", date: "2026-03-01", description: "Pro Plan - Monthly", amount: 49, status: "paid" },
    { id: "2", date: "2026-02-01", description: "Pro Plan - Monthly", amount: 49, status: "paid" },
    { id: "3", date: "2026-01-01", description: "Pro Plan - Monthly", amount: 49, status: "paid" },
  ]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [activeDomain, setActiveDomain] = useState("");
  const [domainWhitelist, setDomainWhitelist] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<typeof PLATFORMS[number]["id"]>("html");
  const [testMode, setTestMode] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<"checking" | "detected" | "not_found">("checking");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<Session[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [leadNotifications, setLeadNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showDeleteDocsModal, setShowDeleteDocsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusinessName, setConfirmBusinessName] = useState("");
  const [confirmPasswordDelete, setConfirmPasswordDelete] = useState("");
  const [chatbotPaused, setChatbotPaused] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (authUser) {
          setAccountFullName(authUser.name || "");
          setAccountEmail(authUser.email || "");
        }

        setTeamMembers([
          { id: "1", name: "John Doe", email: "john@example.com", role: "owner", status: "active", lastActive: "2026-03-04T10:30:00Z" },
          { id: "2", name: "Jane Smith", email: "jane@example.com", role: "admin", status: "active", lastActive: "2026-03-04T09:15:00Z" },
          { id: "3", name: "Bob Wilson", email: "bob@example.com", role: "agent", status: "active", lastActive: "2026-03-03T16:45:00Z" },
        ]);

        setPendingInvites([
          { id: "4", name: "", email: "alice@example.com", role: "agent", status: "pending" },
        ]);

        setSessions([
          { id: "1", device: "MacBook Pro - Chrome", location: "San Francisco, CA", lastActive: "2026-03-04T10:30:00Z", isCurrent: true },
          { id: "2", device: "iPhone 15 - Safari", location: "San Francisco, CA", lastActive: "2026-03-03T14:20:00Z", isCurrent: false },
          { id: "3", device: "Windows PC - Firefox", location: "New York, NY", lastActive: "2026-03-02T09:00:00Z", isCurrent: false },
        ]);

        setLoginHistory([
          { id: "1", device: "MacBook Pro - Chrome", location: "San Francisco, CA", lastActive: "2026-03-04T10:30:00Z", isCurrent: true },
          { id: "2", device: "iPhone 15 - Safari", location: "San Francisco, CA", lastActive: "2026-03-03T08:00:00Z", isCurrent: false },
          { id: "3", device: "MacBook Pro - Chrome", location: "San Francisco, CA", lastActive: "2026-03-02T09:15:00Z", isCurrent: false },
        ]);

        setApiKeys([
          { id: "1", name: "Production API", lastUsed: "2026-03-04T10:00:00Z", createdAt: "2026-01-15T08:00:00Z" },
        ]);

      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authUser]);

  useEffect(() => {
    if (newPassword.length > 0) {
      let strength = 0;
      if (newPassword.length >= 8) strength++;
      if (/[A-Z]/.test(newPassword)) strength++;
      if (/[a-z]/.test(newPassword)) strength++;
      if (/[0-9]/.test(newPassword)) strength++;
      if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [newPassword]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBusinessLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveAccount = async () => {
    try {
      setSaving(true);
      setError(null);
      await userPreferencesApi.updatePreferences({
        name: accountFullName,
        language,
        timezone,
      });
      toast({ title: "Settings saved", variant: "success" });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to save settings");
      toast({ title: "Error saving", description: apiError?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      setPendingInvites([...pendingInvites, { id: String(Date.now()), name: "", email: inviteEmail, role: inviteRole, status: "pending" }]);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteMessage("");
      toast({ title: "Invitation sent", variant: "success" });
    } catch (err) {
      toast({ title: "Failed to send invite", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    try {
      setSaving(true);
      setTeamMembers(teamMembers.filter(m => m.id !== member.id));
      setShowRemoveModal(null);
      toast({ title: "Member removed", variant: "success" });
    } catch (err) {
      toast({ title: "Failed to remove member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    toast({ title: "Session revoked" });
  };

  const handleRevokeAllSessions = async () => {
    setSessions(sessions.filter(s => s.isCurrent));
    toast({ title: "All other sessions revoked" });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  const handleCheckInstallation = () => {
    setInstallationStatus("checking");
    setTimeout(() => {
      setInstallationStatus(activeDomain ? "detected" : "not_found");
    }, 2000);
  };

  const handlePauseChatbot = () => {
    setChatbotPaused(true);
    setShowPauseModal(false);
    toast({ title: "Chatbot paused" });
  };

  const handleClearHistory = async () => {
    if (confirmText !== "DELETE") return;
    setConfirmText("");
    setShowClearHistoryModal(false);
    toast({ title: "Conversation history cleared" });
  };

  const handleDeleteDocs = async () => {
    if (confirmText !== "DELETE DOCUMENTS") return;
    setConfirmText("");
    setShowDeleteDocsModal(false);
    toast({ title: "All documents deleted" });
  };

  const handleRequestExport = () => {
    setShowExportModal(false);
    toast({ title: "Export requested", description: "You will receive an email when ready" });
  };

  const handleDeleteAccount = async () => {
    if (confirmBusinessName !== businessName || !confirmPasswordDelete) return;
    setShowDeleteAccountModal(false);
    toast({ title: "Account deletion initiated" });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      owner: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      agent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
    return styles[role as keyof typeof styles] || styles.agent;
  };

  const getEmbedCode = () => {
    const domain = activeDomain || "yourdomain.com";
    const scriptOpen = "<script>";
    const scriptClose = "</" + "script>";
    return `${scriptOpen}
  (function() {
    var script = document.createElement('script');
    script.src = 'https://cdn.acmedesk.com/widget.js';
    script.async = true;
    script.setAttribute('data-domain', '${domain}');
    document.head.appendChild(script);
  })();
${scriptClose}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:hidden">
          {TABS.map((tab) => (
            <Skeleton key={tab.id} className="h-10 rounded-lg" />
          ))}
        </div>
        <div className="hidden sm:grid lg:hidden grid-cols-3 gap-1.5">
          {TABS.map((tab) => (
            <Skeleton key={tab.id} className="h-10 rounded-lg" />
          ))}
        </div>
        <div className="hidden lg:inline-flex rounded-lg border overflow-hidden w-fit">
          {TABS.map((tab) => (
            <Skeleton key={tab.id} className="h-9 w-28" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Manage your account and workspace settings
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 sm:hidden">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold font-heading rounded-lg border transition-all",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50",
              )}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              {tab.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="hidden sm:grid lg:hidden grid-cols-3 gap-1.5">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold font-heading rounded-lg border transition-all",
                isActive
                  ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50",
              )}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="hidden lg:inline-flex rounded-lg border bg-card overflow-hidden w-fit">
        {TABS.map((tab, i) => {
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="flex items-stretch">
              {i > 0 && <div className="w-px self-stretch bg-border" />}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold font-heading transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </button>
            </div>
          );
        })}
      </div>

      {activeTab === "account" && (
        <div className="space-y-6">
          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                  Business Information
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-description">
                Update your business details
              </p>
            </div>

            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                    {businessLogo ? (
                      <img src={businessLogo} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold font-heading cursor-pointer bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {businessLogo ? "Change" : "Upload"}
                  </Label>
                  <p className="text-xs text-muted-foreground">PNG, JPG. Max 2MB. Recommended 200×200px.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name" className="text-xs font-medium text-foreground">Business name</Label>
                  <Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-xs font-medium text-foreground">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger id="industry" className="h-9 text-xs"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (<SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="text-xs font-medium text-foreground">Website URL</Label>
                  <Input id="website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-email" className="text-xs font-medium text-foreground">Account email</Label>
                  <Input id="account-email" type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="account@example.com" className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium text-foreground">Business description</Label>
                <textarea id="description" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} rows={3} className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background focus-visible:outline-2 focus-visible:outline-ring resize-none" placeholder="Describe your business..." />
              </div>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                  Account Details
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-description">
                Your personal account information
              </p>
            </div>

            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="text-xs font-medium text-foreground">Full name</Label>
                  <Input id="full-name" value={accountFullName} onChange={(e) => setAccountFullName(e.target.value)} placeholder="Your name" className="h-9 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language-pref" className="text-xs font-medium text-foreground">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language-pref" className="h-9 text-xs"><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (<SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-format" className="text-xs font-medium text-foreground">Date format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger id="date-format" className="h-9 text-xs"><SelectValue placeholder="Select format" /></SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((fmt) => (<SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone-pref" className="text-xs font-medium text-foreground">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone-pref" className="h-9 text-xs"><SelectValue placeholder="Select timezone" /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button onClick={handleSaveAccount} disabled={saving} className="h-9 text-xs gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowInviteModal(true)} className="h-9 text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Invite Team Member
            </Button>
          </div>

          <section className="rounded-xl overflow-hidden border bg-card">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Team Members</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Name</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Email</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Role</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">Last Active</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback className="text-[10px]">{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{member.email}</td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold font-heading capitalize", getRoleBadge(member.role))}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold font-heading", member.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                          {member.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                          {member.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground font-mono hidden lg:table-cell">
                        {member.lastActive ? formatDateTime(member.lastActive) : "--"}
                      </td>
                      <td className="px-3 py-3">
                        {member.role !== "owner" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowRemoveModal(member)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-3 flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{member.name}</span>
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", getRoleBadge(member.role))}>
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {pendingInvites.length > 0 && (
            <section className="rounded-xl overflow-hidden border bg-card">
              <div className="px-4 sm:px-6 py-4 border-b">
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Pending Invites</h2>
              </div>
              <div className="divide-y">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">Role: {invite.role}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl overflow-hidden border bg-card">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Role Permissions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Permission</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Owner</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Admin</th>
                    <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { perm: "Manage settings", owner: true, admin: true, agent: false },
                    { perm: "Manage team", owner: true, admin: true, agent: false },
                    { perm: "View billing", owner: true, admin: true, agent: false },
                    { perm: "Manage integrations", owner: true, admin: true, agent: false },
                    { perm: "View analytics", owner: true, admin: true, agent: true },
                    { perm: "Manage conversations", owner: true, admin: true, agent: true },
                    { perm: "View leads", owner: true, admin: true, agent: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-3 text-sm">{row.perm}</td>
                      <td className="px-3 py-3 text-center">{row.owner ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</td>
                      <td className="px-3 py-3 text-center">{row.admin ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</td>
                      <td className="px-3 py-3 text-center">{row.agent ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Current Plan</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold font-heading">{currentPlan.name}</p>
                  <p className="text-sm text-muted-foreground">${currentPlan.price}/month</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Next billing</p>
                  <p className="text-sm font-medium">{formatDate(currentPlan.nextBillingDate)}</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Conversations", ...currentPlan.conversations },
                  { label: "Documents", ...currentPlan.documents },
                  { label: "Storage", ...currentPlan.storage, unit: "MB" },
                  { label: "Channels", ...currentPlan.channels },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono">{item.used}{item.unit ? `/${item.unit}` : ""}/{item.limit}{item.unit ? ` ${item.unit}` : ""}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(item.used / item.limit) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="h-9 text-xs">Upgrade Plan</Button>
                <Button variant="outline" className="h-9 text-xs">View All Plans</Button>
              </div>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Payment Method</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-16 bg-muted rounded-md flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{paymentMethod.brand} •••• {paymentMethod.last4}</p>
                    <p className="text-xs text-muted-foreground">Expires {paymentMethod.expiry}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs">Update Card</Button>
              </div>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden border bg-card">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Billing History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Description</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Amount</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/50">
                      <td className="px-3 py-3 text-xs font-mono">{formatDate(invoice.date)}</td>
                      <td className="px-3 py-3 text-sm">{invoice.description}</td>
                      <td className="px-3 py-3 text-sm font-mono">${invoice.amount}</td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold font-heading", invoice.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="pt-2">
            <Button variant="link" className="text-muted-foreground text-xs" onClick={() => setShowCancelModal(true)}>
              Cancel subscription
            </Button>
          </div>
        </div>
      )}

      {activeTab === "install" && (
        <div className="space-y-6">
          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Domain Settings</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="active-domain" className="text-xs font-medium text-foreground">Active domain</Label>
                <Input id="active-domain" value={activeDomain} onChange={(e) => setActiveDomain(e.target.value)} placeholder="yourdomain.com" className="h-9 text-xs" />
                <p className="text-[10px] text-muted-foreground">Domain where your widget is installed</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Domain whitelist</Label>
                <div className="flex flex-wrap gap-2">
                  {domainWhitelist.map((domain, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs">
                      {domain}
                      <button onClick={() => setDomainWhitelist(domainWhitelist.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="Add domain" className="h-9 text-xs flex-1" onKeyDown={(e) => e.key === "Enter" && (setDomainWhitelist([...domainWhitelist, newDomain]), setNewDomain(""))} />
                  <Button onClick={() => { if (newDomain) { setDomainWhitelist([...domainWhitelist, newDomain]); setNewDomain(""); } }} className="h-9 text-xs">Add</Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Embed Code</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold font-heading transition-all", selectedPlatform === platform.id ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground")}
                  >
                    <platform.icon className="h-3.5 w-3.5" />
                    {platform.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-40">
                  {getEmbedCode()}
                </pre>
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopyCode(getEmbedCode())}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Installation Status</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
              <Button onClick={handleCheckInstallation} disabled={installationStatus === "checking"} className="h-9 text-xs gap-1.5">
                {installationStatus === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Monitor className="h-3.5 w-3.5" />}
                Check Installation
              </Button>
              {installationStatus === "detected" && (
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <Check className="h-4 w-4" /> Widget detected on {activeDomain || "your domain"}
                </div>
              )}
              {installationStatus === "not_found" && (
                <div className="flex items-center gap-2 text-sm text-rose-500">
                  <X className="h-4 w-4" /> Widget not found — check troubleshooting tips
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Test Mode</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable test mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Only show widget to you (not your website visitors)</p>
                </div>
                <Switch checked={testMode} onCheckedChange={setTestMode} />
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Change Password</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-xs font-medium text-foreground">Current password</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs font-medium text-foreground">New password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-9 text-xs" />
                {newPassword && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level} className={cn("h-1 flex-1 rounded-full", level <= passwordStrength ? level <= 2 ? "bg-rose-500" : level <= 3 ? "bg-amber-500" : "bg-emerald-500" : "bg-muted")} />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">Confirm password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-9 text-xs" />
              </div>
              <Button className="h-9 text-xs">Update Password</Button>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Two-Factor Authentication</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Status: {twoFactorEnabled ? "Enabled" : "Disabled"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{twoFactorEnabled ? "Your account is protected with 2FA" : "Add an extra layer of security"}</p>
                </div>
                <Button variant={twoFactorEnabled ? "outline" : "default"} size="sm" className="h-9 text-xs" onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}>
                  {twoFactorEnabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden border bg-card">
            <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Active Sessions</h2>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRevokeAllSessions}>Revoke All Other Sessions</Button>
            </div>
            <div className="divide-y">
              {sessions.map((session) => (
                <div key={session.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{session.device}</p>
                      <p className="text-xs text-muted-foreground">{session.location} • {formatDateTime(session.lastActive)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.isCurrent && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Current</span>}
                    {!session.isCurrent && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRevokeSession(session.id)}>Revoke</Button>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl overflow-hidden border bg-card">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Login History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Date</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Device</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Location</th>
                    <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loginHistory.map((login) => (
                    <tr key={login.id} className="hover:bg-muted/50">
                      <td className="px-3 py-3 text-xs font-mono">{formatDateTime(login.lastActive)}</td>
                      <td className="px-3 py-3 text-sm">{login.device}</td>
                      <td className="px-3 py-3 text-sm text-muted-foreground">{login.location}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold font-heading bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden border bg-card">
            <div className="px-4 sm:px-6 py-4 border-b">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">API Keys</h2>
            </div>
            <div className="divide-y">
              {apiKeys.map((key) => (
                <div key={key.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground">Created {formatDate(key.createdAt)} • Last used {key.lastUsed ? formatDateTime(key.lastUsed) : "Never"}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-rose-500 hover:text-rose-600">Revoke</Button>
                </div>
              ))}
              <div className="px-4 sm:px-6 py-3">
                <Button variant="outline" className="h-9 text-xs gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  Generate API Key
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="space-y-6">
          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Notification Preferences</h2>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-4">
              {[
                { id: "email", label: "Email notifications", desc: "Receive notifications via email", checked: emailNotifications, set: setEmailNotifications },
                { id: "sms", label: "SMS notifications", desc: "Receive notifications via SMS", checked: smsNotifications, set: setSmsNotifications },
                { id: "leads", label: "New leads", desc: "Get notified when new leads come in", checked: leadNotifications, set: setLeadNotifications },
                { id: "messages", label: "New messages", desc: "Get notified for new messages", checked: messageNotifications, set: setMessageNotifications },
                { id: "digest", label: "Weekly digest", desc: "Receive a weekly summary", checked: weeklyDigest, set: setWeeklyDigest },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.checked} onCheckedChange={item.set} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "danger" && (
        <div className="space-y-6">
          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <Pause className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Pause Chatbot</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Temporarily disable chatbot on all channels without uninstalling</p>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <Button variant="outline" className="h-9 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => setShowPauseModal(true)}>
                {chatbotPaused ? <Play className="h-3.5 w-3.5 mr-1.5" /> : <Pause className="h-3.5 w-3.5 mr-1.5" />}
                {chatbotPaused ? "Resume Chatbot" : "Pause All Channels"}
              </Button>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Clear Conversation History</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Delete all conversations and leads. This cannot be undone.</p>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <Button variant="outline" className="h-9 text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10" onClick={() => setShowClearHistoryModal(true)}>
                Clear History
              </Button>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Delete All Documents</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Remove all documents from knowledge base</p>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <Button variant="outline" className="h-9 text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10" onClick={() => setShowDeleteDocsModal(true)}>
                Delete Documents
              </Button>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Export All Data</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Download all your data as a ZIP file. Includes: conversations, leads, documents, analytics</p>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <Button variant="outline" className="h-9 text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10" onClick={() => setShowExportModal(true)}>
                Request Export
              </Button>
            </div>
          </section>

          <section className="rounded-xl overflow-hidden transition-all duration-200 border border-rose-500 bg-rose-500/10 hover:border-rose-500">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">Delete Account</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all data. This action cannot be undone.</p>
            </div>
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              <div className="space-y-2 mb-4 text-xs text-rose-600">
                <p className="flex items-center gap-1"><X className="h-3 w-3" /> Deactivate your chatbot</p>
                <p className="flex items-center gap-1"><X className="h-3 w-3" /> Delete all conversations</p>
                <p className="flex items-center gap-1"><X className="h-3 w-3" /> Delete all leads</p>
                <p className="flex items-center gap-1"><X className="h-3 w-3" /> Cancel your subscription</p>
                <p className="flex items-center gap-1"><X className="h-3 w-3" /> Cannot be recovered</p>
              </div>
              <Button className="h-9 text-xs bg-rose-500 hover:bg-rose-600 text-white" onClick={() => setShowDeleteAccountModal(true)}>
                Delete My Account
              </Button>
            </div>
          </section>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Invite Team Member</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="h-9 text-xs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "agent")}>
                  <SelectTrigger id="invite-role" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-message">Custom message (optional)</Label>
                <textarea id="invite-message" value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} rows={3} className="w-full px-3 py-2 text-xs rounded-md border border-input bg-background resize-none" placeholder="Add a personal message..." />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowInviteModal(false)} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleInviteMember} disabled={saving} className="h-9 text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Remove Team Member</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm">Are you sure you want to remove {showRemoveModal.name} ({showRemoveModal.email})? This action cannot be undone.</p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRemoveModal(null)} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" variant="destructive" onClick={() => handleRemoveMember(showRemoveModal)} className="h-9 text-xs">Remove</Button>
            </div>
          </div>
        </div>
      )}

      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Pause Chatbot</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm">Are you sure you want to pause the chatbot? It will stop responding to visitors on all channels until you resume it.</p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPauseModal(false)} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" className="h-9 text-xs bg-amber-500 hover:bg-amber-600" onClick={handlePauseChatbot}>Pause Chatbot</Button>
            </div>
          </div>
        </div>
      )}

      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Clear Conversation History</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm">This will permanently delete all conversations and leads. This action cannot be undone.</p>
              <div className="space-y-2">
                <Label>Type DELETE to confirm</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" className="h-9 text-xs" />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowClearHistoryModal(false); setConfirmText(""); }} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleClearHistory} disabled={confirmText !== "DELETE"} className="h-9 text-xs">Clear History</Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Delete All Documents</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm">This will permanently delete all documents from your knowledge base. This action cannot be undone.</p>
              <div className="space-y-2">
                <Label>Type DELETE DOCUMENTS to confirm</Label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE DOCUMENTS" className="h-9 text-xs" />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowDeleteDocsModal(false); setConfirmText(""); }} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteDocs} disabled={confirmText !== "DELETE DOCUMENTS"} className="h-9 text-xs">Delete Documents</Button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Export All Data</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm">We'll prepare a ZIP file containing all your data (conversations, leads, documents, analytics). You will receive an email when it's ready. This may take a few minutes.</p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowExportModal(false)} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleRequestExport} className="h-9 text-xs">Request Export</Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold font-heading">Delete Account</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm">This will permanently delete your account and all associated data. This action cannot be undone.</p>
              <div className="space-y-2">
                <Label>Type your business name to confirm</Label>
                <Input value={confirmBusinessName} onChange={(e) => setConfirmBusinessName(e.target.value)} placeholder={businessName || "Your business name"} className="h-9 text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Enter your password</Label>
                <Input type="password" value={confirmPasswordDelete} onChange={(e) => setConfirmPasswordDelete(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowDeleteAccountModal(false); setConfirmBusinessName(""); setConfirmPasswordDelete(""); }} className="h-9 text-xs">Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteAccount} disabled={confirmBusinessName !== businessName || !confirmPasswordDelete} className="h-9 text-xs">Delete My Account</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
