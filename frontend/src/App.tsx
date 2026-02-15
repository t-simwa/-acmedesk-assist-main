import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import { DashboardSkeleton } from "./components/admin/skeletons/DashboardSkeleton";
import { DocumentsSkeleton } from "./components/admin/skeletons/DocumentsSkeleton";
import { AnalyticsSkeleton } from "./components/admin/skeletons/AnalyticsSkeleton";
import { SettingsSkeleton } from "./components/admin/skeletons/SettingsSkeleton";

// Lazy load admin pages for code splitting
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Documents = lazy(() => import("./pages/admin/Documents"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/admin/Settings"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Global ARIA live region for notifications and announcements */}
        <div id="aria-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={
                  <Suspense fallback={<DashboardSkeleton />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="documents"
                element={
                  <Suspense fallback={<DocumentsSkeleton />}>
                    <Documents />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<AnalyticsSkeleton />}>
                    <Analytics />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<SettingsSkeleton />}>
                    <Settings />
                  </Suspense>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
