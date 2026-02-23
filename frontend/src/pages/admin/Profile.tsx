import { useState, useEffect, useRef } from "react";
import { userPreferencesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, Save, Upload, X, Bell, Globe, Clock } from "lucide-react";
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

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [notificationsInApp, setNotificationsInApp] = useState(true);
  const [notificationsPush, setNotificationsPush] = useState(false);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

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
        setNotificationsEmail(prefs.notifications.email);
        setNotificationsInApp(prefs.notifications.in_app);
        setNotificationsPush(prefs.notifications.push);
        setLanguage(prefs.language || "en");
        setTimezone(prefs.timezone || "UTC");
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

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      await userPreferencesApi.updatePreferences({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        notifications: { email: notificationsEmail, in_app: notificationsInApp, push: notificationsPush },
        language,
        timezone,
      });
      toast({ title: "Preferences saved", variant: "success" });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to save");
      toast({ title: "Error saving", description: apiError?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
      <div className="flex flex-col w-full min-w-0 max-w-2xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">Manage your profile and preferences</p>
        </header>
        <div className="space-y-5 sm:space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-w-0 max-w-2xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1.5 text-[13px] sm:text-sm text-muted-foreground">Manage your profile and preferences</p>
      </header>

      {error && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive mb-6"
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5 sm:space-y-6">
        {/* Profile information */}
        <section
          className={cn(
            "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
            "p-4 sm:p-5 lg:p-6 space-y-5 sm:space-y-6"
          )}
        >
          <div>
            <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Profile information
            </h2>
            <p className="text-[12px] text-muted-foreground/80 mt-0.5">Update your name, email, and photo</p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 shrink-0 rounded-2xl border-2 border-border/50">
              <AvatarImage src={avatarUrl || undefined} alt={name || "User"} />
              <AvatarFallback className="rounded-2xl text-lg font-medium bg-primary/10 text-primary">
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
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium cursor-pointer",
                    "bg-primary text-primary-foreground hover:opacity-90 transition-opacity",
                    "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[40px]"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  {avatarUrl ? "Change photo" : "Upload photo"}
                </Label>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarRemove}
                    disabled={saving}
                    className="rounded-xl min-h-[44px] sm:min-h-[40px]"
                  >
                    <X className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground">
                PNG, JPG, GIF or WebP. Max 2MB. Recommended 200×200px or larger.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-[13px] font-medium text-foreground">
                Full name
              </Label>
              <Input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={saving}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email" className="text-[13px] font-medium text-foreground">
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={saving}
                className="rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section
          className={cn(
            "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
            "p-4 sm:p-5 lg:p-6 space-y-5"
          )}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Notifications
              </h2>
              <p className="text-[12px] text-muted-foreground/80 mt-0.5">How you receive notifications</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { id: "notif-email", label: "Email", desc: "Receive notifications via email", value: notificationsEmail, set: setNotificationsEmail },
              { id: "notif-in-app", label: "In-app", desc: "Show notifications in the app", value: notificationsInApp, set: setNotificationsInApp },
              { id: "notif-push", label: "Push", desc: "Browser push (requires permission)", value: notificationsPush, set: setNotificationsPush },
            ].map(({ id, label, desc, value, set }) => (
              <div
                key={id}
                className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0 last:pb-0 first:pt-0"
              >
                <div className="min-w-0">
                  <Label htmlFor={id} className="text-[13px] font-medium text-foreground cursor-pointer">
                    {label}
                  </Label>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch id={id} checked={value} onCheckedChange={set} disabled={saving} className="shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Localization */}
        <section
          className={cn(
            "rounded-2xl border border-border/50 bg-muted/10 overflow-hidden",
            "p-4 sm:p-5 lg:p-6 space-y-5"
          )}
        >
          <div>
            <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Language & timezone
            </h2>
            <p className="text-[12px] text-muted-foreground/80 mt-0.5">For dates and interface language</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="profile-language" className="text-[13px] font-medium text-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                Language
              </Label>
              <Select value={language} onValueChange={setLanguage} disabled={saving}>
                <SelectTrigger id="profile-language" className="rounded-xl w-full">
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
              <Label htmlFor="profile-timezone" className="text-[13px] font-medium text-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
                <SelectTrigger id="profile-timezone" className="rounded-xl w-full">
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
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className={cn(
              "w-full sm:w-auto min-h-[44px] sm:min-h-[40px] rounded-xl",
              "flex items-center justify-center gap-2"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
