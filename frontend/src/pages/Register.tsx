import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RegisterRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Branding/Logo";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Password strength validation
  const getPasswordRequirements = (): PasswordRequirement[] => {
    return [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
      { label: "At least one lowercase letter", met: /[a-z]/.test(password) },
      { label: "At least one number", met: /\d/.test(password) },
    ];
  };
  
  const passwordRequirements = getPasswordRequirements();
  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!email) {
      setError("Email is required");
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
    
    try {
      setLoading(true);
      
      const payload: RegisterRequest = {
        email,
        password,
        name: name || undefined,
      };
      
      await register(payload);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 1500);
      
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to register. Please try again.";
      setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create an Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign up to get started with AcmeDesk Assist
          </p>
        </div>
        
        {/* Registration Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input"
                disabled={loading}
              />
            </div>
            
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input"
                required
                disabled={loading}
              />
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input"
                required
                disabled={loading}
              />
              
              {/* Password Requirements */}
              {password.length > 0 && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md space-y-1.5">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password Requirements:
                  </p>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span
                        className={
                          req.met
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-400"
                        }
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-input"
                required
                disabled={loading}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
              {confirmPassword.length > 0 && passwordsMatch && (
                <p className="text-sm text-green-500">Passwords match</p>
              )}
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isPasswordValid || !passwordsMatch}
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
            
            {/* Login Link */}
            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
              </span>
              <Link
                to="/login"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
