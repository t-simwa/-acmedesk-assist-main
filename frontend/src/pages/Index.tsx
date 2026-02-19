import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Branding/Logo";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function Index() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileMenuOpen]);

  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* F4.1 - Skip link for main content */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Logo size={isMobile ? 24 : 28} showText={true} textClassName={isMobile ? "text-[14px]" : ""} />
          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-6">
              <Link
                to="/admin"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
              >
                Admin
              </Link>
              <a
                href="#features"
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm"
              >
                Features
              </a>
              <ThemeToggle variant="pill" />
            </nav>
          )}
          {/* Mobile Hamburger Menu */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 min-h-[44px] min-w-[44px]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="right" className="w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <div className="px-5 py-5 border-b border-border">
                <Logo size={24} showText={true} textClassName="text-[14px]" />
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Admin
                </Link>
                <a
                  href="#features"
                  onClick={handleNavClick}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Features
                </a>
                <div className="px-3 py-2.5">
                  <ThemeToggle variant="sidebar" />
                </div>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Hero */}
      <section id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-24" aria-labelledby="hero-heading">
        <div className="max-w-xl">
          <p className="text-[12px] sm:text-[13px] font-medium text-primary tracking-wide uppercase mb-3 sm:mb-4" aria-label="Product category">
            Support AI
          </p>
          <h1 id="hero-heading" className="font-heading font-bold text-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
            Resolve Tickets Before They're Filed
          </h1>
          <p className="text-description mt-4 sm:mt-5 text-[15px] sm:text-base">
            AcmeDesk answers customer questions instantly from your docs. Accurate, on-brand, and always available.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-8 sm:mt-10">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-foreground text-background rounded-lg text-[13px] sm:text-[13px] font-medium hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 min-h-[44px] sm:min-h-0"
            >
              Open Admin
              <ArrowRight size={14} />
            </Link>
            <span className="text-[13px] text-muted-foreground text-center sm:text-left">
              or try the chat widget →
            </span>
          </div>
        </div>
      </section>

      {/* Features — text-first, no icons */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          {[
            {
              title: "Grounded answers",
              description:
                "Every response cites your knowledge base. No hallucinations, no made-up pricing or policies.",
            },
            {
              title: "Usage analytics",
              description:
                "See top questions, resolution rates, and documentation gaps — all in one dashboard.",
            },
            {
              title: "Safe escalation",
              description:
                "When confidence is low, conversations hand off to a human agent. No dead ends.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="bg-background p-6 sm:p-8"
            >
              <h3 className="text-[14px] sm:text-[15px] font-heading font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-description text-[14px] sm:text-base">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
