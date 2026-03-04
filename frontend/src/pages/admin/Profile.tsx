import { useState, useEffect, useRef } from "react";
import { userPreferencesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, Save, Upload, X, User, Mail, Briefcase, Link2, Phone, FileText, Sun, Moon, Monitor, Calendar, Bell, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Rome", label: "Rome" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "Mumbai, Kolkata, New Delhi" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
];

const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System default", icon: Monitor },
] as const;

type ThemeValue = typeof THEMES[number]["value"];

const EMAIL_DIGEST_OPTIONS = [
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
  { value: "never", label: "Never" },
];

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [theme, setTheme] = useState<ThemeValue>("system");
  const [defaultDateRange, setDefaultDateRange] = useState("last30days");
  const [emailDigest, setEmailDigest] = useState("weekly");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");
  const [notificationsSummary, setNotificationsSummary] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        if (authUser) {
          setName(authUser.name || "");
          setEmail(authUser.email || "");
        }
        const prefs = await userPreferencesApi.getPreferences();
        if (prefs.name) setName(prefs.name);
        if (prefs.email) setEmail(prefs.email);
        setAvatarUrl(prefs.avatar_url);
        setJobTitle(prefs.job_title || "");
        setLinkedInUrl(prefs.linkedin_url || "");
        setPhone(prefs.phone || "");
        setBio(prefs.bio || "");
        setTheme((prefs.theme as ThemeValue) || "system");
        setDefaultDateRange(prefs.default_date_range || "last30days");
        setEmailDigest(prefs.email_digest || "weekly");
        setTimezone(prefs.timezone || "UTC");
        setLanguage(prefs.language || "en");
        setNotificationsSummary(prefs.notifications_summary ?? true);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError?.message || "Failed to load preferences");
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, [authUser]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image (PNG, JPG, GIF, WebP)", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Avatar must be under 2MB", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const response = await userPreferencesApi.uploadAvatar(file);
      setAvatarUrl(response.avatar_url);
      toast({ title: "Avatar uploaded", variant: "success" });
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Upload failed", description: apiError?.message || "Failed to upload", variant: "destructive" });
    } finally {
      setSaving(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    try {
      setSaving(true);
      await userPreferencesApi.deleteAvatar();
      setAvatarUrl(null);
      toast({ title: "Avatar removed", variant: "success" });
    } catch (err) {
      const apiError = err as ApiError;
      toast({ title: "Error", description: apiError?.message || "Failed to remove", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      await userPreferencesApi.updatePreferences({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        linkedin_url: linkedInUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setHasUnsavedChanges(false);
      toast({ title: "Profile saved", variant: "success" });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to save profile");
      toast({ title: "Error saving", description: apiError?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      await userPreferencesApi.updatePreferences({
        theme,
        default_date_range: defaultDateRange,
        email_digest: emailDigest,
        timezone,
        language,
        notifications_summary: notificationsSummary,
      });
      setHasUnsavedChanges(false);
      toast({ title: "Preferences saved", variant: "success" });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to save preferences");
      toast({ title: "Error saving", description: apiError?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const getInitials = (): string => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return name[0].toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return "U";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
            Profile & Account
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-description">
            Manage your profile and preferences
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                Profile Information
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Update your personal details and public profile
            </p>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar className="h-20 w-20 shrink-0 rounded-full ring-2 ring-background">
                <AvatarImage src={avatarUrl || undefined} alt={name || "User"} />
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/80 to-violet-600/80 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                    disabled={saving}
                  />
                  <Label
                    htmlFor="avatar-upload"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold font-heading cursor-pointer",
                      "bg-primary text-primary-foreground hover:opacity-90 transition-opacity",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {avatarUrl ? "Change" : "Upload"}
                  </Label>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarRemove}
                      disabled={saving}
                      className="h-8 text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF or WebP. Max 2MB. Recommended 200×200px or larger.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-xs font-medium text-foreground">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => handleFieldChange(setName)(e.target.value)}
                    placeholder="Your name"
                    disabled={saving}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-xs font-medium text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange(setEmail)(e.target.value)}
                    placeholder="you@example.com"
                    disabled={saving}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Changing email requires verification</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-job" className="text-xs font-medium text-foreground">
                  Job title
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="profile-job"
                    type="text"
                    value={jobTitle}
                    onChange={(e) => handleFieldChange(setJobTitle)(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    disabled={saving}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-linkedin" className="text-xs font-medium text-foreground">
                  LinkedIn URL
                </Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="profile-linkedin"
                    type="url"
                    value={linkedInUrl}
                    onChange={(e) => handleFieldChange(setLinkedInUrl)(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    disabled={saving}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone" className="text-xs font-medium text-foreground">
                  Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => handleFieldChange(setPhone)(e.target.value)}
                    placeholder="+1 555 000 0000"
                    disabled={saving}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">For SMS notifications</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-bio" className="text-xs font-medium text-foreground">
                Bio
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => handleFieldChange(setBio)(e.target.value)}
                  placeholder="A short bio shown in your email signatures..."
                  disabled={saving}
                  rows={3}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-input bg-background focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 resize-none"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="h-9 text-xs gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                Appearance
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Customize how the application looks
            </p>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-foreground">
                Theme
              </Label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleFieldChange(setTheme as (value: string) => void)(t.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold font-heading transition-all",
                      theme === t.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                Dashboard
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Default settings for your dashboard view
            </p>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="date-range" className="text-xs font-medium text-foreground">
                Default date range
              </Label>
              <Select value={defaultDateRange} onValueChange={handleFieldChange(setDefaultDateRange)} disabled={saving}>
                <SelectTrigger id="date-range" className="w-full sm:w-[200px] h-9 text-xs">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                Notifications
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              How you receive updates and digests
            </p>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email-digest" className="text-xs font-medium text-foreground">
                Email digest
              </Label>
              <Select value={emailDigest} onValueChange={handleFieldChange(setEmailDigest)} disabled={saving}>
                <SelectTrigger id="email-digest" className="w-full sm:w-[200px] h-9 text-xs">
                  <SelectValue placeholder="Select digest frequency" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_DIGEST_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-b border-border">
              <div className="min-w-0">
                <Label htmlFor="notifications-summary" className="text-xs font-medium text-foreground cursor-pointer">
                  Notification summary
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Receive a summary of notifications</p>
              </div>
              <Switch
                id="notifications-summary"
                checked={notificationsSummary}
                onCheckedChange={(checked) => {
                  setNotificationsSummary(checked);
                  setHasUnsavedChanges(true);
                }}
                disabled={saving}
                className="shrink-0"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
                Language & Region
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-description">
              Set your language and timezone preferences
            </p>
          </div>

          <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-xs font-medium text-foreground">
                  Language
                </Label>
                <Select value={language} onValueChange={handleFieldChange(setLanguage)} disabled={saving}>
                  <SelectTrigger id="language" className="h-9 text-xs">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-xs font-medium text-foreground">
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={handleFieldChange(setTimezone)} disabled={saving}>
                  <SelectTrigger id="timezone" className="h-9 text-xs">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {hasUnsavedChanges && (
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 bg-card/95 backdrop-blur-sm border-t px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 z-10">
            <p className="text-xs text-muted-foreground font-description">
              You have unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-8 text-xs"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSavePreferences}
                disabled={saving}
                className="h-8 text-xs gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
