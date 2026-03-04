import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RegisterRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Branding/Logo";

interface PasswordRequirement {
  label: string;
  met: boolean;
  icon: string;
}

const valueProps = [
  {
    icon: "⚡",
    title: "Live in 24 hours",
    description: "Get your AI chatbot up and running in under a day",
  },
  {
    icon: "🎯",
    title: "No code needed",
    description: "Build intelligent responses without writing a single line",
  },
  {
    icon: "🛡️",
    title: "7-day guarantee",
    description: "Not satisfied? Full refund within the first week",
  },
];

const testimonial = {
  quote: "NexaChat transformed our customer support. Setup took minutes, not weeks.",
  author: "Sarah Johnson",
  role: "Head of Support, TechCorp",
};

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTos, setAcceptTos] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const getPasswordRequirements = (): PasswordRequirement[] => [
    { label: "8+ characters", met: password.length >= 8, icon: "✓" },
    { label: "One uppercase", met: /[A-Z]/.test(password), icon: "✓" },
    { label: "One number", met: /\d/.test(password), icon: "✓" },
  ];

  const passwordRequirements = getPasswordRequirements();
  const isPasswordValid = passwordRequirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!businessName) {
      setError("Business name is required");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptTos) {
      setError("You must accept the Terms of Service");
      return;
    }

    try {
      setLoading(true);

      const payload: RegisterRequest = {
        email,
        password,
        full_name: name,
        business_name: businessName,
      };

      await register(payload);

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      navigate("/verify-email", { state: { email } });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message || "Failed to register. Please try again.";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Value Props */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle background accents */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-info rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <Logo className="h-10 w-auto" />
        </div>

        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-sidebar-foreground mb-3">
              Build Your AI Support Team
            </h2>
            <p className="text-sidebar-foreground/60 text-base">
              Empower your business with an intelligent chatbot that works 24/7
            </p>
          </div>

          <div className="space-y-6">
            {valueProps.map((prop, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-sidebar-accent/50 flex items-center justify-center text-xl">
                  {prop.icon}
                </div>
                <div>
                  <h3 className="text-sidebar-foreground font-medium text-[15px]">{prop.title}</h3>
                  <p className="text-sidebar-foreground/50 text-sm mt-0.5">{prop.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="bg-sidebar-accent/30 backdrop-blur-sm rounded-xl p-5 border border-sidebar-border/50">
            <p className="text-sidebar-foreground/70 italic text-sm mb-3">"{testimonial.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                {testimonial.author.charAt(0)}
              </div>
              <div>
                <p className="text-sidebar-foreground text-sm font-medium">{testimonial.author}</p>
                <p className="text-sidebar-foreground/50 text-xs">{testimonial.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-7">
          <div className="lg:hidden text-center">
            <Logo className="mx-auto mb-4" />
          </div>

          <div className="text-center lg:text-left">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Start your 14-day free trial. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Business Name *</Label>
              <Input
                id="businessName"
                type="text"
                placeholder="Acme Inc."
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-10"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                disabled={loading}
                required
              />

              {password.length > 0 && (
                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                        req.met
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {req.met ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-current" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10"
                disabled={loading}
                required
              />
              {confirmPassword.length > 0 && (
                <p
                  className={`text-xs mt-1 ${
                    passwordsMatch
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="acceptTos"
                  checked={acceptTos}
                  onCheckedChange={(checked) => setAcceptTos(checked === true)}
                  disabled={loading}
                />
                <label
                  htmlFor="acceptTos"
                  className="text-sm text-muted-foreground cursor-pointer leading-snug"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                    Privacy Policy
                  </Link>{" "}
                  *
                </label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="marketingOptIn"
                  checked={marketingOptIn}
                  onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
                  disabled={loading}
                />
                <label
                  htmlFor="marketingOptIn"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Send me product updates and tips (optional)
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={loading || !acceptTos || !businessName}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-background text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
