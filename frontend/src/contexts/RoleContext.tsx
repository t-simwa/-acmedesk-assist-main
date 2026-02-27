/**
 * Role Context for managing user roles and permissions.
 * 
 * Provides role-based access control (RBAC) functionality throughout the application.
 * Roles: owner, admin, agent (matches plan specification)
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { adminApi, CurrentUser } from "@/lib/api";
import { useAuth } from "./AuthContext";

export type UserRole = "super_admin" | "owner" | "admin" | "agent" | "visitor";

interface RoleContextType {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  refreshUser: () => Promise<void>;
}

// Default owner user for development/fallback
const DEFAULT_OWNER_USER: CurrentUser = {
  id: "default",
  email: "admin@acmedesk.com",
  name: "Admin User",
  role: "owner",
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
  user: DEFAULT_OWNER_USER,
  loading: false,
  error: null,
  hasPermission: () => false,
  hasRole: () => false,
  isSuperAdmin: false,
  isOwner: true,
  isAdmin: false,
  isAgent: false,
  refreshUser: async () => {},
};

const RoleContext = createContext<RoleContextType>(defaultContextValue);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user: authUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(DEFAULT_OWNER_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!isAuthenticated || !authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const currentUser = await adminApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error("Error fetching current user:", err);
      setError("Failed to load user information");
      // Fallback to auth user data if admin API fails
      if (authUser) {
        setUser({
          id: authUser.user_id,
          email: authUser.email,
          name: authUser.name || undefined,
          role: authUser.role as UserRole,
          is_active: authUser.is_active,
          permissions: [],
        });
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [isAuthenticated, authUser]);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const isSuperAdmin = user?.role === "super_admin";
  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";

  const refreshUser = async () => {
    await fetchUser();
  };

  // Always provide a valid context value, even during loading
  const contextValue: RoleContextType = {
    user: user || DEFAULT_OWNER_USER,
    loading,
    error,
    hasPermission,
    hasRole,
    isSuperAdmin,
    isOwner,
    isAdmin,
    isAgent,
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
