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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-6" />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success/10 mb-5">
                <Mail className="h-5 w-5 text-success" />
              </div>

              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
                Check your email
              </h1>

              <p className="text-sm text-muted-foreground mb-5">
                If an account with that email exists, you'll receive a password reset link.
              </p>

              <p className="text-xs text-muted-foreground/70 mb-6">
                The link will expire in 1 hour.
              </p>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground/70">
                  Didn't receive the email? Check your spam folder.
                </p>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="w-full h-10"
                >
                  Try another email
                </Button>

                <Link to="/login">
                  <Button variant="ghost" className="w-full h-10">
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-6" />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-soft-md p-7">
          <div className="mb-6">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground mb-2">
              Forgot your password?
            </h1>
            <p className="text-sm text-muted-foreground">
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
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                disabled={loading}
                required
              />
            </div>

            <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
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
