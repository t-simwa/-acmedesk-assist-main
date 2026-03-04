/**
 * AdminLayout — Wrapper for all client dashboard and admin pages
 *
 * Implements Milestone 7.1 specs:
 * - Fixed sidebar (240px / 64px collapsed) via Sidebar component
 * - TopBar (56px sticky) via TopBar component
 * - Mobile: sidebar replaced by slide-in drawer (280px) with overlay
 * - Collapse state saved to localStorage key "nexachat-sidebar-collapsed"
 */

import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageTransition } from "@/components/PageTransition";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLAPSED_KEY = "nexachat-sidebar-collapsed";

// ─── AdminLayout ──────────────────────────────────────────────────────────────

export function AdminLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Desktop sidebar collapse — persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Mobile sidebar open/close
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Persist collapse state on toggle
  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = isMobile && mobileSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileSidebarOpen]);

  // Calculate sidebar width for main content offset
  const sidebarWidth = isCollapsed ? 64 : 240;

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* ── Desktop Sidebar (fixed left, full height) ── */}
      {!isMobile && (
        <Sidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
      )}

      {/* ── Mobile Overlay + Slide-in Drawer ── */}
      {isMobile && (
        <>
          {/* Backdrop overlay — black/60 per spec */}
          <div
            className={cn(
              "fixed inset-0 bg-black/60 z-[60] transition-opacity duration-[250ms]",
              mobileSidebarOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in sidebar drawer (280px per spec) */}
          <div
            className={cn(
              "fixed top-0 left-0 bottom-0 w-[280px] z-[70] transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Mobile sidebar content (always expanded) */}
            <Sidebar
              isCollapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              mobile={true}
            />
          </div>
        </>
      )}

      {/* ── Main Content Area ── */}
      <div
        className="min-h-screen flex flex-col"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          transition: "margin-left 200ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Top bar (sticky, 56px) */}
        <TopBar
          onMenuClick={() => setMobileSidebarOpen(true)}
          isMobile={isMobile}
        />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 px-6 pt-6 pb-10"
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
