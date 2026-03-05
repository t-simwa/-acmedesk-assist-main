import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { LoginRequest, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Branding/Logo";

export default function AdminLogin() {
  const { login, isAuthenticated } = useAuth();
  const { isSuperAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      const redirectTo =
        (location.state as any)?.from?.pathname ||
        new URLSearchParams(location.search).get("redirect") ||
        "/admin";
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);

      const payload: LoginRequest = {
        email,
        password,
        remember_me: rememberMe,
      };

      const result = await login(payload);

      if (result.requires_2fa) {
        navigate("/2fa", { state: { email, isAdminLogin: true } });
        return;
      }

      const role = result.role;
      if (role !== "super_admin") {
        setError(
          "This login is for platform super admins only. Please use a super admin account, or sign in via the regular login page."
        );
        return;
      }

      const redirectTo =
        (location.state as any)?.from?.pathname ||
        new URLSearchParams(location.search).get("redirect") ||
        "/admin";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        (apiError && apiError.message) ||
        "Invalid email or password. Please try again.";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Admin login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Super Admin Login
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to manage all client tenants and platform settings.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Admin Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input pr-10"
                  required
                  disabled={loading}
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer text-muted-foreground"
              >
                Remember this device
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-2">
              This portal is reserved for platform super admins. Client owners and team
              members should continue using the regular login page.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

