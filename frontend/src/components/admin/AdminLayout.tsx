import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/PageTransition";
import { Logo } from "@/components/Branding/Logo";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserMenu } from "./UserMenu";
import { RoleBasedSidebar } from "./RoleBasedSidebar";

export function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

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

  const SidebarContent = () => (
    <>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="px-5 py-5 border-b border-border">
        <Link 
          to="/" 
          className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm" 
          aria-label="Home"
          onClick={() => isMobile && setMobileMenuOpen(false)}
        >
          <Logo size={28} showText={true} textClassName="text-[15px]" />
          <span className="text-[11px] text-muted-foreground block -mt-0.5 ml-[36px]">Support AI</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
        <RoleBasedSidebar />
      </div>

      <div className="px-5 py-4 border-t border-border">
        <UserMenu />
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-surface">
      {/* F4.1 - Skip link for main content */}
      <a href="#admin-main-content" className="skip-link">
        {t("navigation.skipToContent")}
      </a>
      
      {/* Desktop & Tablet Sidebar */}
      {!isMobile && (
        <aside
          className={`hidden md:flex border-r border-border bg-background flex-col ${isTablet ? "w-56" : "w-60"}`}
          aria-label="Admin navigation"
        >
          <SidebarContent />
        </aside>
      )}

      {/* Mobile Header with Hamburger Menu */}
      {isMobile && (
        <header className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background z-50 flex items-center justify-between px-4">
          <Link 
            to="/" 
            className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-sm" 
            aria-label="Home"
          >
            <Logo size={24} showText={true} textClassName="text-[14px]" />
          </Link>
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
        </header>
      )}

      {/* Mobile Navigation Drawer */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main
        id="admin-main-content"
        className={`flex-1 overflow-auto flex flex-col ${isMobile ? "pt-14" : ""}`}
      >
        {/* Desktop Header with User Menu */}
        {!isMobile && (
          <header className="border-b border-border bg-background">
            <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-end">
              <UserMenu />
            </div>
          </header>
        )}
        <div
          className={`flex-1 max-w-6xl mx-auto ${isTablet ? "px-4 md:px-6" : "px-4 md:px-8"} py-4 ${
            isTablet ? "md:py-6" : "md:py-8"
          }`}
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
        {/* Footer in admin layout */}
        <Footer />
      </main>
    </div>
  );
}
