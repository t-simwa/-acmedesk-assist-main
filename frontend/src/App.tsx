import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PageTransition } from "@/components/PageTransition";
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
            <Route
              path="/"
              element={
                <PageTransition>
                  <Index />
                </PageTransition>
              }
            />
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={
                  <PageTransition>
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Dashboard />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="documents"
                element={
                  <PageTransition>
                    <Suspense fallback={<DocumentsSkeleton />}>
                      <Documents />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="analytics"
                element={
                  <PageTransition>
                    <Suspense fallback={<AnalyticsSkeleton />}>
                      <Analytics />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="settings"
                element={
                  <PageTransition>
                    <Suspense fallback={<SettingsSkeleton />}>
                      <Settings />
                    </Suspense>
                  </PageTransition>
                }
              />
            </Route>
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFound />
                </PageTransition>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
