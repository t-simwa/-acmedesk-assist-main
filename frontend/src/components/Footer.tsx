import { Link } from "react-router-dom";
import { Lock, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ComplianceBadges } from "@/components/trust/ComplianceBadge";

export function Footer() {
  const isMobile = useIsMobile();
  const isSecure = window.location.protocol === "https:";

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col gap-6">
          {/* Top: Security Indicators and Compliance Badges */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

            {/* Right: Compliance Badges */}
            <div className="flex items-center gap-2">
              <ComplianceBadges
                types={["gdpr", "soc2"]}
                variant="compact"
                showTooltip={true}
                direction="row"
              />
            </div>
          </div>

          {/* Bottom: Legal Links */}
          <nav className="flex flex-col sm:flex-row items-center justify-between gap-4" aria-label="Footer navigation">
            <div className="flex items-center gap-4 sm:gap-6">
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
            </div>
            <span className="text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} NexaChat
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
