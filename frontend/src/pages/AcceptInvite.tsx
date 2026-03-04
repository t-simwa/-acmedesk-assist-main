import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Branding/Logo";
import { Loader2, Mail, AlertCircle, CheckCircle, User } from "lucide-react";
import { teamApi, ApiError } from "@/lib/api";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"loading" | "valid" | "invalid" | "register" | "success">("loading");
  const [inviteData, setInviteData] = useState<{
    email: string;
    name?: string;
    tenant_name: string;
    role: string;
    expires_at?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      checkInviteStatus();
    } else {
      setStep("invalid");
    }
  }, [token]);

  const checkInviteStatus = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await teamApi.checkInviteStatus(token);
      
      if (response.valid) {
        setInviteData({
          email: response.email || "",
          name: response.name,
          tenant_name: response.tenant_name || "",
          role: response.role || "",
          expires_at: response.expires_at,
        });
        setStep("register");
      } else {
        setError(response.message || "Invalid or expired invitation");
        setStep("invalid");
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to verify invitation");
      setStep("invalid");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    if (formData.password !== formData.confirm_password) {
      setFormError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      await teamApi.acceptInvite({
        token,
        password: formData.password,
        full_name: formData.full_name || undefined,
      });
      setStep("success");
    } catch (err) {
      const apiError = err as ApiError;
      setFormError(apiError?.message || "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  // --- Loading state ---
  if (step === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Verifying invitation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Invalid state ---
  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-5">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Invalid Invitation
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {error || "This invitation link is invalid or has expired."}
              </p>
              <Button onClick={() => navigate("/login")} className="w-full h-10 font-medium">
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Success state ---
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mb-5">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Welcome to the Team!
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                You have successfully joined {inviteData?.tenant_name}.
              </p>
              <Button onClick={() => navigate("/login")} className="w-full h-10 font-medium">
                Continue to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Register (form) state ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
              Accept Invitation
            </h1>
            <p className="text-sm text-muted-foreground">
              You've been invited to join <strong className="text-foreground">{inviteData?.tenant_name}</strong> as a <strong className="text-foreground">{inviteData?.role}</strong>
            </p>
          </div>

          {inviteData?.email && (
            <div className="mb-5 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Invitation for: <span className="font-medium text-foreground">{inviteData.email}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-10 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                className="h-10"
                required
              />
            </div>

            {formError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{formError}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
