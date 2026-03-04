import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, Link2Icon } from "lucide-react";
import { Logo } from "@/components/Branding/Logo";

type ResetState = "valid" | "expired" | "used" | "success" | "loading";

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [resetState, setResetState] = useState<ResetState>("loading");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setResetState("expired");
        return;
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setResetState("valid");
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.message?.includes("expired")) {
          setResetState("expired");
        } else if (apiError.message?.includes("used")) {
          setResetState("used");
        } else {
          setResetState("expired");
        }
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("At least one uppercase letter");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("At least one lowercase letter");
    }
    if (!/\d/.test(pwd)) {
      errors.push("At least one number");
    }
    return errors;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setResetState("expired");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      setError("Password does not meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await authApi.resetPassword({ token, newPassword: password });

      setResetState("success");
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now login with your new password.",
        variant: "default",
      });

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to reset password";

      if (errorMessage.toLowerCase().includes("expired")) {
        setResetState("expired");
      } else if (errorMessage.toLowerCase().includes("used") || errorMessage.toLowerCase().includes("already")) {
        setResetState("used");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Loading state ---
  if (resetState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Validating reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Expired state ---
  if (resetState === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-5">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>

              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Link Expired
              </h1>

              <p className="text-sm text-muted-foreground mb-6">
                This password reset link has expired. Please request a new one.
              </p>

              <Link to="/forgot-password">
                <Button className="w-full h-10 font-medium">
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Request New Link
                </Button>
              </Link>

              <div className="mt-5">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Used state ---
  if (resetState === "used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-warning/10 mb-5">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>

              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Link Already Used
              </h1>

              <p className="text-sm text-muted-foreground mb-6">
                This password reset link has already been used. Please request a new one.
              </p>

              <Link to="/forgot-password">
                <Button className="w-full h-10 font-medium">
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Request New Link
                </Button>
              </Link>

              <div className="mt-5">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Success state ---
  if (resetState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success/10 mb-5">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>

              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Password Reset Successful
              </h1>

              <p className="text-sm text-muted-foreground mb-6">
                Your password has been reset. You can now login with your new password.
              </p>

              <Link to="/login">
                <Button className="w-full h-10 font-medium">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Valid state (form) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
          <div className="mb-6">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
              Reset your password
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={loading}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {password && passwordErrors.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p className="font-medium">Password requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {passwordErrors.map((err, idx) => (
                      <li key={idx} className="text-destructive">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={loading || !token || passwordErrors.length > 0 || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
