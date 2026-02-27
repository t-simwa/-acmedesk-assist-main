import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import EmailVerified from "./pages/EmailVerified";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import { AdminLayout } from "./components/admin/AdminLayout";
import { DashboardSkeleton } from "./components/admin/skeletons/DashboardSkeleton";
import { DocumentsSkeleton } from "./components/admin/skeletons/DocumentsSkeleton";
import { AnalyticsSkeleton } from "./components/admin/skeletons/AnalyticsSkeleton";
import { SettingsSkeleton } from "./components/admin/skeletons/SettingsSkeleton";
import { ProfileSkeleton } from "./components/admin/skeletons/ProfileSkeleton";
import { SettingsSkeleton as SecuritySkeleton } from "./components/admin/skeletons/SettingsSkeleton";

// Lazy load admin pages for code splitting
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Documents = lazy(() => import("./pages/admin/Documents"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Security = lazy(() => import("./pages/admin/Security"));
const Profile = lazy(() => import("./pages/admin/Profile"));
const TeamManagement = lazy(() => import("./pages/admin/TeamManagement"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const APIKeys = lazy(() => import("./pages/admin/APIKeys"));
const HelpCenter = lazy(() => import("./pages/admin/HelpCenter"));
const EmailChannel = lazy(() => import("./pages/admin/EmailChannel"));
const Inbox = lazy(() => import("./pages/admin/Inbox"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <RoleProvider>
            <QueryClientProvider client={queryClient}>
          <TooltipProvider>
          {/* Global ARIA live region for notifications and announcements */}
          <div id="aria-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route
                path="/"
                element={
                  <PageTransition>
                    <Index />
                  </PageTransition>
                }
              />
              <Route
                path="/login"
                element={
                  <PageTransition>
                    <Login />
                  </PageTransition>
                }
              />
              <Route
                path="/register"
                element={
                  <PageTransition>
                    <Register />
                  </PageTransition>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PageTransition>
                    <ForgotPassword />
                  </PageTransition>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PageTransition>
                    <ResetPassword />
                  </PageTransition>
                }
              />
              <Route
                path="/verify-email"
                element={
                  <PageTransition>
                    <VerifyEmail />
                  </PageTransition>
                }
              />
              <Route
                path="/email-verified"
                element={
                  <PageTransition>
                    <EmailVerified />
                  </PageTransition>
                }
              />
              <Route
                path="/2fa"
                element={
                  <PageTransition>
                    <TwoFactorAuth />
                  </PageTransition>
                }
              />
              <Route
                path="/signup"
                element={
                  <PageTransition>
                    <Register />
                  </PageTransition>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
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
                  path="inbox"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Inbox />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="email"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <EmailChannel />
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
                <Route
                  path="security"
                  element={
                    <PageTransition>
                      <Suspense fallback={<SecuritySkeleton />}>
                        <Security />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <PageTransition>
                      <Suspense fallback={<ProfileSkeleton />}>
                        <Profile />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="team"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <TeamManagement />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <AuditLogs />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="api-keys"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <APIKeys />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="help"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <HelpCenter />
                      </Suspense>
                    </PageTransition>
                  }
                />
              </Route>
              <Route
                path="privacy"
                element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Privacy />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="terms"
                element={
                  <PageTransition>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Terms />
                    </Suspense>
                  </PageTransition>
                }
              />
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
          {/* ChatWidget at App level - always visible on all pages */}
          <ChatWidget />
          </TooltipProvider>
        </QueryClientProvider>
        </RoleProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
