import { useEffect, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      checkAuth();
    }
  }, [isAuthenticated, loading, checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectParam = location.pathname !== "/" 
      ? `?redirect=${encodeURIComponent(location.pathname)}`
      : "";
    return <Navigate to={`/login${redirectParam}`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}

interface AuthGuardOptions {
  requireVerified?: boolean;
  require2FA?: boolean;
  allowedRoles?: string[];
}

export function useAuthGuard() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  const checkAccess = useCallback((options: AuthGuardOptions = {}) => {
    const { requireVerified = false, require2FA = false, allowedRoles = [] } = options;

    if (loading) {
      return { allowed: false, reason: "loading" as const };
    }

    if (!isAuthenticated) {
      return { 
        allowed: false, 
        reason: "unauthenticated" as const,
        redirectTo: `/login?redirect=${encodeURIComponent(location.pathname)}`
      };
    }

    if (requireVerified && !user?.is_verified) {
      return { 
        allowed: false, 
        reason: "unverified" as const,
        redirectTo: "/verify-email"
      };
    }

    if (require2FA && !user?.is_2fa_enabled) {
      return { 
        allowed: false, 
        reason: "2fa_required" as const,
        redirectTo: "/2fa"
      };
    }

    if (allowedRoles.length > 0 && user?.role && !allowedRoles.includes(user.role)) {
      return { 
        allowed: false, 
        reason: "forbidden" as const,
        redirectTo: "/"
      };
    }

    return { allowed: true, reason: "granted" as const };
  }, [user, isAuthenticated, loading, location.pathname]);

  return { checkAccess };
}
