import { useState, useEffect, useRef } from "react";
import { userPreferencesApi, UserPreferences, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, Save, Upload, X, User, Mail, Bell, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Common languages (ISO 639-1 codes)
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

// Common timezones (IANA timezone identifiers)
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [notificationsInApp, setNotificationsInApp] = useState(true);
  const [notificationsPush, setNotificationsPush] = useState(false);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  
  // Load preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        setError(null);
        const prefs = await userPreferencesApi.getPreferences();
        
        setName(prefs.name || "");
        setEmail(prefs.email || "");
        setAvatarUrl(prefs.avatar_url);
        setNotificationsEmail(prefs.notifications.email);
        setNotificationsInApp(prefs.notifications.in_app);
        setNotificationsPush(prefs.notifications.push);
        setLanguage(prefs.language || "en");
        setTimezone(prefs.timezone || "UTC");
      } catch (err) {
        const apiError = err as ApiError;
        const errorMessage = apiError?.message || "Failed to load preferences";
        setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
        console.error("Error fetching preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreferences();
  }, []);
  
  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, GIF, WebP)",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar file must be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      const response = await userPreferencesApi.uploadAvatar(file);
      setAvatarUrl(response.avatar_url);
      toast({
        title: "Avatar uploaded",
        description: "Your avatar has been uploaded successfully",
        variant: "success",
      });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to upload avatar";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error uploading avatar:", err);
    } finally {
      setSaving(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };
  
  // Handle avatar removal
  const handleAvatarRemove = async () => {
    try {
      setSaving(true);
      await userPreferencesApi.deleteAvatar();
      setAvatarUrl(null);
      toast({
        title: "Avatar removed",
        description: "Your avatar has been removed",
        variant: "success",
      });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to remove avatar";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error removing avatar:", err);
    } finally {
      setSaving(false);
    }
  };
  
  // Handle save preferences
  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await userPreferencesApi.updatePreferences({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        notifications: {
          email: notificationsEmail,
          in_app: notificationsInApp,
          push: notificationsPush,
        },
        language: language,
        timezone: timezone,
      });
      
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully",
        variant: "success",
      });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to save preferences";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      toast({
        title: "Error saving preferences",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error saving preferences:", err);
    } finally {
      setSaving(false);
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = (): string => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };
  
  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Profile</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Manage your profile and preferences
        </p>
      </div>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Profile Information */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-6">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Profile Information</h3>
            <p className="text-[12px] text-muted-foreground">Update your personal information</p>
          </div>
          
          {/* Avatar Upload */}
          <div>
            <Label className="text-[13px] font-medium text-foreground block mb-3">
              Profile Picture
            </Label>
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarUrl || undefined} alt={name || "User"} />
                <AvatarFallback className="text-lg font-medium bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                    disabled={saving}
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={14} />
                    {avatarUrl ? "Change Avatar" : "Upload Avatar"}
                  </label>
                  {avatarUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarRemove}
                      disabled={saving}
                      className="text-[13px]"
                    >
                      <X size={14} className="mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Upload a profile picture (PNG, JPG, GIF, WebP). Max size: 2MB. Recommended: 200x200px or larger.
                </p>
              </div>
            </div>
          </div>
          
          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-[13px] font-medium text-foreground block mb-1.5">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="pl-10"
                disabled={saving}
              />
            </div>
          </div>
          
          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-[13px] font-medium text-foreground block mb-1.5">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="pl-10"
                disabled={saving}
              />
            </div>
          </div>
        </div>
        
        {/* Notification Preferences */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground mb-1 flex items-center gap-2">
              <Bell size={16} />
              Notification Preferences
            </h3>
            <p className="text-[12px] text-muted-foreground">Choose how you want to receive notifications</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-email" className="text-[13px] font-medium text-foreground">
                  Email Notifications
                </Label>
                <p className="text-[12px] text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="notifications-email"
                checked={notificationsEmail}
                onCheckedChange={setNotificationsEmail}
                disabled={saving}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-in-app" className="text-[13px] font-medium text-foreground">
                  In-App Notifications
                </Label>
                <p className="text-[12px] text-muted-foreground">
                  Show notifications within the application
                </p>
              </div>
              <Switch
                id="notifications-in-app"
                checked={notificationsInApp}
                onCheckedChange={setNotificationsInApp}
                disabled={saving}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-push" className="text-[13px] font-medium text-foreground">
                  Push Notifications
                </Label>
                <p className="text-[12px] text-muted-foreground">
                  Receive browser push notifications (requires permission)
                </p>
              </div>
              <Switch
                id="notifications-push"
                checked={notificationsPush}
                onCheckedChange={setNotificationsPush}
                disabled={saving}
              />
            </div>
          </div>
        </div>
        
        {/* Language & Timezone */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Localization</h3>
            <p className="text-[12px] text-muted-foreground">Set your language and timezone preferences</p>
          </div>
          
          {/* Language */}
          <div>
            <Label htmlFor="language" className="text-[13px] font-medium text-foreground block mb-1.5 flex items-center gap-2">
              <Globe size={14} />
              Language
            </Label>
            <Select value={language} onValueChange={setLanguage} disabled={saving}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Select your preferred language (i18n support coming soon)
            </p>
          </div>
          
          {/* Timezone */}
          <div>
            <Label htmlFor="timezone" className="text-[13px] font-medium text-foreground block mb-1.5 flex items-center gap-2">
              <Clock size={14} />
              Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Select your timezone for accurate timestamps
            </p>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
