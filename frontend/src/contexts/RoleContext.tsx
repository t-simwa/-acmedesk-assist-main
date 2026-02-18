/**
 * Role Context for managing user roles and permissions.
 * 
 * Provides role-based access control (RBAC) functionality throughout the application.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { adminApi, CurrentUser } from "@/lib/api";

interface RoleContextType {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: "admin" | "analyst" | "viewer") => boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  isViewer: boolean;
  refreshUser: () => Promise<void>;
}

// Default admin user for development/fallback
const DEFAULT_ADMIN_USER: CurrentUser = {
  id: "default",
  email: "admin@acmedesk.com",
  name: "Admin User",
  role: "admin",
  is_active: true,
  permissions: [
    "admin:read",
    "admin:write",
    "documents:read",
    "documents:write",
    "documents:delete",
    "analytics:read",
    "settings:read",
    "settings:write",
    "team:read",
    "team:write",
    "team:invite",
    "team:remove",
    "api_keys:read",
    "api_keys:write",
    "api_keys:revoke",
    "audit_logs:read",
  ],
};

// Create context with a default value to prevent undefined errors
const defaultContextValue: RoleContextType = {
  user: DEFAULT_ADMIN_USER,
  loading: false,
  error: null,
  hasPermission: () => false,
  hasRole: () => false,
  isAdmin: true,
  isAnalyst: false,
  isViewer: false,
  refreshUser: async () => {},
};

const RoleContext = createContext<RoleContextType>(defaultContextValue);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(DEFAULT_ADMIN_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await adminApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error("Error fetching current user:", err);
      setError("Failed to load user information");
      // Use default admin user for development/fallback
      setUser(DEFAULT_ADMIN_USER);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: "admin" | "analyst" | "viewer"): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const isAdmin = user?.role === "admin";
  const isAnalyst = user?.role === "analyst";
  const isViewer = user?.role === "viewer";

  const refreshUser = async () => {
    await fetchUser();
  };

  // Always provide a valid context value, even during loading
  const contextValue: RoleContextType = {
    user: user || DEFAULT_ADMIN_USER,
    loading,
    error,
    hasPermission,
    hasRole,
    isAdmin,
    isAnalyst,
    isViewer,
    refreshUser,
  };

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  // Context will always have a value (defaultContextValue if provider not found)
  return context;
}
