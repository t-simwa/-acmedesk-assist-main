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
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { PageTransition } from "@/components/PageTransition";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import NotFound from "./pages/NotFound";

// Marketing pages - lazy loaded
const Landing = lazy(() => import("./pages/marketing/Landing"));
const Features = lazy(() => import("./pages/marketing/Features"));
const Pricing = lazy(() => import("./pages/marketing/Pricing"));
const Demo = lazy(() => import("./pages/marketing/Demo"));
const About = lazy(() => import("./pages/marketing/About"));
const Contact = lazy(() => import("./pages/marketing/Contact"));
const Blog = lazy(() => import("./pages/marketing/Blog"));
const BlogPost = lazy(() => import("./pages/marketing/BlogPost"));
const UseCases = lazy(() => import("./pages/marketing/UseCases"));
const UseCaseDetail = lazy(() => import("./pages/marketing/UseCaseDetail"));
const PrivacyPolicy = lazy(() => import("./pages/marketing/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/marketing/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/marketing/CookiePolicy"));
const Status = lazy(() => import("./pages/marketing/Status"));
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import EmailVerified from "./pages/EmailVerified";
import AcceptInvite from "./pages/AcceptInvite";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import OnboardingWizard from "./pages/OnboardingWizard";
import GetStarted from "./pages/GetStarted";
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
const Inbox = lazy(() => import("./pages/admin/Inbox"));
const Conversations = lazy(() => import("./pages/admin/Conversations"));
const Leads = lazy(() => import("./pages/admin/Leads"));
const Contacts = lazy(() => import("./pages/admin/Contacts"));
const ContactProfile = lazy(() => import("./pages/admin/ContactProfile"));
const Campaigns = lazy(() => import("./pages/admin/Campaigns"));
const Bookings = lazy(() => import("./pages/admin/Bookings"));
const Channels = lazy(() => import("./pages/admin/Channels"));
const Chatbot = lazy(() => import("./pages/admin/Chatbot.tsx"));
const Install = lazy(() => import("./pages/admin/Install"));
const Integrations = lazy(() => import("./pages/admin/Integrations"));
const ChannelHealth = lazy(() => import("./pages/admin/ChannelHealth"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const SuperAdminDashboard = lazy(() => import("./pages/admin/SuperAdminDashboard"));
const SuperAdminClients = lazy(() => import("./pages/admin/SuperAdminClients"));
const SuperAdminAnalytics = lazy(() => import("./pages/admin/SuperAdminAnalytics"));
const SuperAdminSettings = lazy(() => import("./pages/admin/SuperAdminSettings"));
const SuperAdminEmails = lazy(() => import("./pages/admin/SuperAdminEmails"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));

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
{/* Marketing Pages */}
              <Route
                path="/"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Landing />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/features"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Features />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/pricing"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Pricing />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/demo"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Demo />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/about"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <About />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/contact"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Contact />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/blog"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Blog />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/blog/:slug"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <BlogPost />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/use-cases"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <UseCases />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/use-cases/:industry"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <UseCaseDetail />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/privacy-policy"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <PrivacyPolicy />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/terms-of-service"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <TermsOfService />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/cookie-policy"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <CookiePolicy />
                    </Suspense>
                  </PageTransition>
                }
              />
              <Route
                path="/status"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <Status />
                    </Suspense>
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
                path="/admin/login"
                element={
                  <PageTransition>
                    <Suspense fallback={<div className="min-h-screen bg-background" />}>
                      <AdminLogin />
                    </Suspense>
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
                path="/team/accept"
                element={
                  <PageTransition>
                    <AcceptInvite />
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
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <PageTransition>
                      <OnboardingWizard />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              {/*
               * /dashboard routes — client dashboard (spec path per Milestone 7)
               * Mirrors /admin routes; both use AdminLayout
               */}
              <Route
                path="/dashboard"
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
                  path="conversations"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Conversations />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="chatbot"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Chatbot />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="leads"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Leads />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="contacts"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Contacts />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="contacts/:id"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <ContactProfile />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Campaigns />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="bookings"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Bookings />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="channels"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Channels />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="channel-health"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <ChannelHealth />
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
                  path="integrations"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Integrations />
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
                <Route
                  path="install"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Install />
                      </Suspense>
                    </PageTransition>
                  }
                />
              </Route>

              {/* /admin — legacy route kept for backward compatibility */}
              <Route
                path="/admin"
                element={
                  <SuperAdminRoute>
                    <AdminLayout />
                  </SuperAdminRoute>
                }
              >
                <Route
                  index
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <SuperAdminDashboard />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="get-started"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <GetStarted />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="clients"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <SuperAdminClients />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <PageTransition>
                      <Suspense fallback={<AnalyticsSkeleton />}>
                        <SuperAdminAnalytics />
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
                  path="leads"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Leads />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="contacts"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Contacts />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="contacts/:id"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <ContactProfile />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Campaigns />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="bookings"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Bookings />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="channels"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Channels />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="channel-health"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <ChannelHealth />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <PageTransition>
                      <Suspense fallback={<SettingsSkeleton />}>
                        <SuperAdminSettings />
                      </Suspense>
                    </PageTransition>
                  }
                />
                <Route
                  path="emails"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <SuperAdminEmails />
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
                <Route
                  path="install"
                  element={
                    <PageTransition>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Install />
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
