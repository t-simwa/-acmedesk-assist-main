import { useState, useEffect } from "react";

const LOGO_STORAGE_KEY = "acmedesk-custom-logo";

interface LogoProps {
  className?: string;
  size?: number;
  showOnlineIndicator?: boolean;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Logo component that displays custom uploaded logo or default AcmeDesk logo
 * Respects branding settings from localStorage
 */
export function Logo({ 
  className = "", 
  size = 28, 
  showOnlineIndicator = false,
  showText = false,
  textClassName = ""
}: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("AcmeDesk");

  useEffect(() => {
    // Load custom logo from localStorage
    const storedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
    if (storedLogo) {
      try {
        const logoData = JSON.parse(storedLogo);
        setLogoUrl(logoData.url);
        if (logoData.companyName) {
          setCompanyName(logoData.companyName);
        }
      } catch (e) {
        console.error("Error loading custom logo:", e);
      }
    }

    // Load company name from branding settings
    const brandingSettings = localStorage.getItem("acmedesk-branding-settings");
    if (brandingSettings) {
      try {
        const settings = JSON.parse(brandingSettings);
        if (settings.companyName) {
          setCompanyName(settings.companyName);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Listen for logo changes (for real-time updates)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
      if (storedLogo) {
        try {
          const logoData = JSON.parse(storedLogo);
          setLogoUrl(logoData.url);
          if (logoData.companyName) {
            setCompanyName(logoData.companyName);
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else {
        setLogoUrl(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener("logo-updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("logo-updated", handleStorageChange);
    };
  }, []);

  if (logoUrl) {
    return (
      <div className={`relative flex items-center gap-2.5 ${className}`}>
        <div className="relative" aria-hidden="true">
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="object-contain"
            style={{ width: size, height: size }}
            onError={() => {
              // Fallback to default if image fails to load
              setLogoUrl(null);
            }}
          />
          {showOnlineIndicator && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-online border-2 border-background" aria-label="Online status" />
          )}
        </div>
        {showText && (
          <span className={`text-[15px] font-semibold text-foreground ${textClassName}`}>
            {companyName}
          </span>
        )}
      </div>
    );
  }

  // Default AcmeDesk logo
  return (
    <div className={`relative flex items-center gap-2.5 ${className}`}>
      <div className="relative" aria-hidden="true">
        <div 
          className="rounded-md bg-foreground flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span 
            className="text-[12px] font-bold text-background tracking-tight"
            style={{ fontSize: `${size * 0.43}px` }}
          >
            A
          </span>
        </div>
        {showOnlineIndicator && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-online border-2 border-background" aria-label="Online status" />
        )}
      </div>
      {showText && (
        <span className={`text-[15px] font-semibold text-foreground ${textClassName}`}>
          {companyName}
        </span>
      )}
    </div>
  );
}
