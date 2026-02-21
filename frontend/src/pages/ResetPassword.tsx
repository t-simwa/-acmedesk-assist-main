import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Branding/Logo";

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
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
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }
    
    // Validation
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
      
      setSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now login with your new password.",
        variant: "default",
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to reset password. The link may have expired.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Password reset successful
              </h1>
              
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your password has been reset. You can now login with your new password.
              </p>
              
              <Link to="/login">
                <Button className="w-full">
                  Go to login
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
                      <li key={idx} className="text-red-600 dark:text-red-400">{err}</li>
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
            
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset password"
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
