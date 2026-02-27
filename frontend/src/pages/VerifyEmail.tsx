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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Verifying your email...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (token && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Email Verified!
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your email has been successfully verified.
              </p>
              <Button onClick={() => navigate("/login")} className="w-full">
                Continue to Login
              </Button>
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
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
              <Mail className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Check Your Email
            </h1>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              We sent a verification link to{" "}
              <span className="font-medium text-slate-900 dark:text-white">
                {email || "your email address"}
              </span>
            </p>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Click the link in the email to verify your account. The link will
              expire in 24 hours.
            </p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {resent && !error && (
              <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Verification email sent! Please check your inbox.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="w-full"
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
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wrong email? Go back
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
              Not arriving? Check your spam folder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
