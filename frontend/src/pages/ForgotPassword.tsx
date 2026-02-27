import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Mail, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Branding/Logo";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      await authApi.forgotPassword({ email });
      
      setSuccess(true);
      toast({
        title: "Check your email",
        description: "If an account with that email exists, you'll receive a password reset link.",
        variant: "default",
      });
    } catch (err) {
      setSuccess(true);
      toast({
        title: "Check your email",
        description: "If an account with that email exists, you'll receive a password reset link.",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Check your email
              </h1>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                If an account with that email exists, you'll receive a password reset link.
              </p>

              <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
                The link will expire in 1 hour.
              </p>

              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Didn't receive the email? Check your spam folder.
                </p>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="w-full"
                >
                  Try another email
                </Button>

                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </div>
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
              Forgot your password?
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Enter your email address and we'll send you a link to reset your password.
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
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Link
                </>
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
