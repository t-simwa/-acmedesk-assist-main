import { Link } from "react-router-dom";
import { Lock, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Footer() {
  const isMobile = useIsMobile();
  const isSecure = window.location.protocol === "https:";

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Left: Security Indicators */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            {isSecure && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Lock size={14} className="text-green-600 dark:text-green-500" aria-hidden="true" />
                <span>Secure Connection</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Shield size={14} className="text-primary" aria-hidden="true" />
              <span>Data Encrypted</span>
            </div>
          </div>

          {/* Right: Legal Links */}
          <nav className="flex items-center gap-4 sm:gap-6" aria-label="Footer navigation">
            <Link
              to="/privacy"
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
            >
              Terms of Service
            </Link>
            <span className="text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} AcmeDesk
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
