import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { authApi, UserInfoResponse, LoginRequest, RegisterRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSilentTokenRefresh } from "@/hooks/useSilentTokenRefresh";

interface AuthContextType {
  user: UserInfoResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<{ requires_2fa?: boolean }>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useSilentTokenRefresh();

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      if (authApi.isAuthenticated()) {
        const userInfo = await authApi.getCurrentUser();
        setUser(userInfo);
      } else {
        setUser(null);
      }
    } catch (error) {
      authApi.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginRequest): Promise<{ requires_2fa?: boolean }> => {
    try {
      const response = await authApi.login(credentials);
      
      if (response.requires_2fa) {
        return { requires_2fa: true };
      }
      
      const userInfo = await authApi.getCurrentUser();
      setUser(userInfo);
      
      toast({
        title: "Login successful!",
        description: `Welcome back, ${response.name || response.email}!`,
      });
      
      return { requires_2fa: false };
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError?.message || "Login failed");
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      
      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError?.message || "Registration failed");
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    window.location.href = "/";
  };

  const refreshUser = async () => {
    try {
      if (authApi.isAuthenticated()) {
        const userInfo = await authApi.getCurrentUser();
        setUser(userInfo);
      }
    } catch (error) {
      authApi.logout();
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user && authApi.isAuthenticated(),
    login,
    register,
    logout,
    refreshUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
