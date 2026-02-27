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

  if (resetState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Validating reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resetState === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Link Expired
              </h1>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                This password reset link has expired. Please request a new one.
              </p>

              <Link to="/forgot-password">
                <Button className="w-full">
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Request New Link
                </Button>
              </Link>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center"
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

  if (resetState === "used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 mb-4">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Link Already Used
              </h1>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                This password reset link has already been used. Please request a new one.
              </p>

              <Link to="/forgot-password">
                <Button className="w-full">
                  <Link2Icon className="mr-2 h-4 w-4" />
                  Request New Link
                </Button>
              </Link>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center"
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

  if (resetState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Password Reset Successful
              </h1>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your password has been reset. You can now login with your new password.
              </p>

              <Link to="/login">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-4" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Reset your password
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
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
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={loading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {password && passwordErrors.length > 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mt-2">
                  <p className="font-medium">Password requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {passwordErrors.map((err, idx) => (
                      <li key={idx} className="text-red-600 dark:text-red-400">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
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
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center"
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
