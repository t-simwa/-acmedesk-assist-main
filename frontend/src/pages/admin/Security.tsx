import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Loader2, Save, Lock, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SSLSecureIndicator } from "@/components/security/SSLSecureIndicator";
import { DataEncryptionIndicator } from "@/components/security/DataEncryptionIndicator";

export default function Security() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState<string | null>(null);
  const [twoFactorQRCode, setTwoFactorQRCode] = useState<string | null>(null);
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");

  // Validate password
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }
    return errors;
  };

  // Handle password change
  const handlePasswordChange = async () => {
    setPasswordErrors({});

    // Validation
    if (!currentPassword) {
      setPasswordErrors({ currentPassword: "Current password is required" });
      return;
    }

    if (!newPassword) {
      setPasswordErrors({ newPassword: "New password is required" });
      return;
    }

    const passwordValidationErrors = validatePassword(newPassword);
    if (passwordValidationErrors.length > 0) {
      setPasswordErrors({ newPassword: passwordValidationErrors[0] });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordErrors({ newPassword: "New password must be different from current password" });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // TODO: Replace with actual API call when backend endpoint is available
      // await securityApi.changePassword({ currentPassword, newPassword });
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
        variant: "success",
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to change password";
      setError(errorMessage);
      toast({
        title: "Error changing password",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle 2FA setup
  const handle2FASetup = async () => {
    try {
      setTwoFactorLoading(true);
      setError(null);

      // TODO: Replace with actual API call when backend endpoint is available
      // const response = await securityApi.setup2FA();
      // setTwoFactorQRCode(response.qr_code);
      // setTwoFactorSetupCode(response.secret);
      // setTwoFactorBackupCodes(response.backup_codes);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data for demonstration
      setTwoFactorQRCode("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UVIgQ29kZTwvdGV4dD48L3N2Zz4=");
      setTwoFactorSetupCode("ABCD EFGH IJKL MNOP");
      setTwoFactorBackupCodes(["12345678", "87654321", "11223344", "44332211", "55667788"]);

      toast({
        title: "2FA setup initiated",
        description: "Please scan the QR code with your authenticator app.",
        variant: "default",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to setup 2FA";
      setError(errorMessage);
      toast({
        title: "Error setting up 2FA",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Handle 2FA verification
  const handle2FAVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setTwoFactorLoading(true);
      setError(null);

      // TODO: Replace with actual API call when backend endpoint is available
      // await securityApi.verify2FA({ code: verificationCode });
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTwoFactorEnabled(true);
      setVerificationCode("");
      setTwoFactorQRCode(null);
      setTwoFactorSetupCode(null);

      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been enabled successfully.",
        variant: "success",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to verify 2FA code";
      setError(errorMessage);
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Handle 2FA disable
  const handle2FADisable = async () => {
    try {
      setTwoFactorLoading(true);
      setError(null);

      // TODO: Replace with actual API call when backend endpoint is available
      // await securityApi.disable2FA();
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTwoFactorEnabled(false);
      setTwoFactorQRCode(null);
      setTwoFactorSetupCode(null);
      setTwoFactorBackupCodes([]);
      setVerificationCode("");

      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled.",
        variant: "default",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to disable 2FA";
      setError(errorMessage);
      toast({
        title: "Error disabling 2FA",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Security Settings</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage your account security and authentication
          </p>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Security Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Manage your account security and authentication
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-[14px] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Connection Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Shield size={18} />
              Connection Security
            </CardTitle>
            <CardDescription className="text-[12px]">
              Current security status of your connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[13px] font-medium">SSL/TLS Status</Label>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Secure connection indicator
                </p>
              </div>
              <SSLSecureIndicator variant="badge" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[13px] font-medium">Data Encryption</Label>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Data encryption status
                </p>
              </div>
              <DataEncryptionIndicator variant="badge" />
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Lock size={18} />
              Change Password
            </CardTitle>
            <CardDescription className="text-[12px]">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="text-[13px] font-medium block mb-1.5">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={passwordErrors.currentPassword ? "border-destructive" : ""}
                  disabled={saving}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-[12px] text-destructive mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="new-password" className="text-[13px] font-medium block mb-1.5">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={passwordErrors.newPassword ? "border-destructive" : ""}
                  disabled={saving}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-[12px] text-destructive mt-1">{passwordErrors.newPassword}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-[13px] font-medium block mb-1.5">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={passwordErrors.confirmPassword ? "border-destructive" : ""}
                  disabled={saving}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-[12px] text-destructive mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <KeyRound size={18} />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-[12px]">
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="2fa-toggle" className="text-[13px] font-medium">
                  Enable 2FA
                </Label>
                <p className="text-[12px] text-muted-foreground">
                  Require a verification code in addition to your password
                </p>
              </div>
              <Switch
                id="2fa-toggle"
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handle2FASetup();
                  } else {
                    handle2FADisable();
                  }
                }}
                disabled={twoFactorLoading}
              />
            </div>

            {twoFactorQRCode && !twoFactorEnabled && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <Label className="text-[13px] font-medium block mb-2">
                    Scan QR Code
                  </Label>
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                  </p>
                  <div className="flex justify-center p-4 bg-muted rounded-lg">
                    <img
                      src={twoFactorQRCode}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {twoFactorSetupCode && (
                  <div>
                    <Label className="text-[13px] font-medium block mb-2">
                      Manual Entry Code
                    </Label>
                    <p className="text-[12px] text-muted-foreground mb-2">
                      If you can't scan the QR code, enter this code manually:
                    </p>
                    <div className="p-3 bg-muted rounded-lg font-mono text-[13px] text-center">
                      {twoFactorSetupCode}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="verification-code" className="text-[13px] font-medium block mb-1.5">
                    Verification Code
                  </Label>
                  <Input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    disabled={twoFactorLoading}
                  />
                  <p className="text-[12px] text-muted-foreground mt-1.5">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <Button
                  onClick={handle2FAVerification}
                  disabled={twoFactorLoading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {twoFactorLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify and Enable 2FA"
                  )}
                </Button>

                {twoFactorBackupCodes.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <Label className="text-[13px] font-medium block mb-2">
                      Backup Codes
                    </Label>
                    <p className="text-[12px] text-muted-foreground mb-3">
                      Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device:
                    </p>
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      {twoFactorBackupCodes.map((code, index) => (
                        <div key={index} className="font-mono text-[12px] text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {twoFactorEnabled && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div>
                    <p className="text-[13px] font-medium text-green-700 dark:text-green-400">
                      2FA is enabled
                    </p>
                    <p className="text-[12px] text-green-600 dark:text-green-500 mt-0.5">
                      Your account is protected with two-factor authentication
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
