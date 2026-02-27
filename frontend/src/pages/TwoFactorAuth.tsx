import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Branding/Logo";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

const CODE_LENGTH = 6;
const CODE_EXPIRY_SECONDS = 300;

export default function TwoFactorAuth() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiry, setExpiry] = useState(CODE_EXPIRY_SECONDS);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (expiry > 0) {
      const timer = setTimeout(() => setExpiry(expiry - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiry]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, CODE_LENGTH);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < CODE_LENGTH) {
        newCode[i] = char;
      }
    });
    setCode(newCode);

    const lastFilledIndex = Math.min(pastedData.length, CODE_LENGTH - 1);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length !== CODE_LENGTH) {
      setError("Please enter the complete verification code");
      return;
    }

    if (expiry <= 0) {
      setError("Verification code has expired. Please request a new one.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      console.log("Verifying code:", fullCode);
      
      navigate("/");
    } catch (err) {
      setError("Invalid verification code. Please try again.");
      setCode(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-4" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {useBackupCode
                ? "Enter your backup code to continue"
                : `Enter the 6-digit code from your authenticator app. Code expires in ${formatTime(expiry)}.`}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  disabled={loading}
                />
              ))}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.join("").length !== CODE_LENGTH || expiry <= 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setUseBackupCode(!useBackupCode)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {useBackupCode ? "Use authenticator code instead" : "Use backup code instead"}
              </button>

              <br />

              <button
                type="button"
                onClick={handleCancel}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
