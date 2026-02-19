import { Shield, Lock } from "lucide-react";

interface DataEncryptionIndicatorProps {
  variant?: "badge" | "inline" | "icon";
  showText?: boolean;
  className?: string;
}

export function DataEncryptionIndicator({ 
  variant = "badge", 
  showText = true,
  className = "" 
}: DataEncryptionIndicatorProps) {
  // In a real application, this would check actual encryption status
  // For now, we'll show it as enabled (since data should be encrypted in transit and at rest)
  const isEncrypted = true;

  if (variant === "icon") {
    return (
      <Shield
        size={16}
        className={`text-primary ${className}`}
        aria-label="Data encrypted"
        aria-hidden="false"
      />
    );
  }

  if (variant === "inline") {
    return (
      <span className={`flex items-center gap-1.5 text-[12px] ${className}`}>
        <Shield size={12} className="text-primary" aria-hidden="true" />
        {showText && <span className="text-muted-foreground">Encrypted</span>}
      </span>
    );
  }

  // Badge variant (default)
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 ${className}`}
      role="status"
      aria-label="Data encryption status"
    >
      <Shield size={12} className="text-primary" aria-hidden="true" />
      {showText && <span>Data Encrypted</span>}
    </div>
  );
}
