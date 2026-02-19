import { Lock, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface SSLSecureIndicatorProps {
  variant?: "badge" | "inline" | "icon";
  showText?: boolean;
  className?: string;
}

export function SSLSecureIndicator({ 
  variant = "badge", 
  showText = true,
  className = "" 
}: SSLSecureIndicatorProps) {
  const [isSecure, setIsSecure] = useState(false);

  useEffect(() => {
    // Check if connection is secure (HTTPS)
    setIsSecure(window.location.protocol === "https:");
  }, []);

  if (!isSecure && variant !== "badge") {
    return null; // Don't show anything if not secure and not badge variant
  }

  if (variant === "icon") {
    return (
      <Lock
        size={16}
        className={`${isSecure ? "text-green-600 dark:text-green-500" : "text-muted-foreground"} ${className}`}
        aria-label={isSecure ? "Secure connection" : "Connection not secure"}
        aria-hidden="false"
      />
    );
  }

  if (variant === "inline") {
    return (
      <span className={`flex items-center gap-1.5 text-[12px] ${className}`}>
        {isSecure ? (
          <>
            <Lock size={12} className="text-green-600 dark:text-green-500" aria-hidden="true" />
            {showText && <span className="text-muted-foreground">Secure</span>}
          </>
        ) : (
          <>
            <AlertCircle size={12} className="text-amber-600 dark:text-amber-500" aria-hidden="true" />
            {showText && <span className="text-muted-foreground">Not Secure</span>}
          </>
        )}
      </span>
    );
  }

  // Badge variant (default)
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${
        isSecure
          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
          : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      {isSecure ? (
        <>
          <Lock size={12} className="text-green-600 dark:text-green-500" aria-hidden="true" />
          {showText && <span>Secure</span>}
        </>
      ) : (
        <>
          <AlertCircle size={12} className="text-amber-600 dark:text-amber-500" aria-hidden="true" />
          {showText && <span>Not Secure</span>}
        </>
      )}
    </div>
  );
}
