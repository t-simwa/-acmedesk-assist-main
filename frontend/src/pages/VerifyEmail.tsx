import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Branding/Logo";
import { Loader2, Mail, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const token = searchParams.get("token");
  const email = (location.state as { email?: string })?.email || "";
  
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    if (!token) return;
    
    setVerifying(true);
    setError(null);
    
    try {
      const response = await authApi.verifyEmail(token);
      if (response.redirect_url) {
        const redirectPath = new URL(response.redirect_url).pathname;
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Invalid or expired verification token");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      await authApi.resendVerification({ email });
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Verifying your email...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <CheckCircle className="h-14 w-14 mx-auto text-success mb-4" />
              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Email Verified!
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your email has been successfully verified.
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
              Check Your Email
            </h1>

            <p className="text-sm text-muted-foreground mb-5">
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">
                {email || "your email address"}
              </span>
            </p>

            <p className="text-xs text-muted-foreground/70 mb-7">
              Click the link in the email to verify your account. The link will
              expire in 24 hours.
            </p>

            {error && (
              <div className="mb-5 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {resent && !error && (
              <div className="mb-5 p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success">
                  Verification email sent! Please check your inbox.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="w-full h-10"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Resend email (${cooldown}s)`
                ) : (
                  "Resend email"
                )}
              </Button>

              <Link to="/signup">
                <Button variant="ghost" className="w-full h-10">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wrong email? Go back
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-xs text-muted-foreground/70">
              Not arriving? Check your spam folder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
