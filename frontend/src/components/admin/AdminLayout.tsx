import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, BarChart3, Settings, User, Menu, X, Users, FileTextIcon, KeyRound, Shield, HelpCircle } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Logo } from "@/components/Branding/Logo";
import { Footer } from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Base navigation items available to all users
const baseNavItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, permission: "analytics:read" },
  { label: "Documents", path: "/admin/documents", icon: FileText, permission: "documents:read" },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3, permission: "analytics:read" },
  { label: "Settings", path: "/admin/settings", icon: Settings, permission: "settings:read" },
  { label: "Security", path: "/admin/security", icon: Shield, permission: null },
  { label: "Profile", path: "/admin/profile", icon: User, permission: null },
  { label: "Help Center", path: "/admin/help", icon: HelpCircle, permission: null },
];

// Admin-only navigation items
const adminNavItems = [
  { label: "Team", path: "/admin/team", icon: Users, permission: "team:read" },
  { label: "Audit Logs", path: "/admin/audit-logs", icon: FileTextIcon, permission: "audit_logs:read" },
  { label: "API Keys", path: "/admin/api-keys", icon: KeyRound, permission: "api_keys:read" },
];

export function AdminLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { hasPermission } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter navigation items based on permissions
  const getNavItems = () => {
    const items = baseNavItems.filter(
      (item) => !item.permission || hasPermission(item.permission)
    );
    const adminItems = adminNavItems.filter(
      (item) => hasPermission(item.permission)
    );
    return [...items, ...adminItems];
  };

  const navItems = getNavItems();

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

      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 min-h-[44px] ${
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => isMobile && setMobileMenuOpen(false)}
            >
              <item.icon size={18} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[13px] font-medium text-muted-foreground">
            SL
          </div>
          <div className="text-[13px]">
            <div className="font-medium text-foreground">Sarah Lee</div>
            <div className="text-muted-foreground text-[12px]">Support Lead</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-surface">
      {/* F4.1 - Skip link for main content */}
      <a href="#admin-main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Desktop & Tablet Sidebar */}
      {!isMobile && (
        <aside className={`hidden md:flex border-r border-border bg-background flex-col ${isTablet ? "w-56" : "w-60"}`} aria-label="Admin navigation">
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
        <div className={`flex-1 max-w-6xl mx-auto ${isTablet ? "px-4 md:px-6" : "px-4 md:px-8"} py-4 ${isTablet ? "md:py-6" : "md:py-8"}`}>
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
