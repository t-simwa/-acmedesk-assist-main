import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, UserInfoResponse, LoginRequest, RegisterRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: UserInfoResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      if (authApi.isAuthenticated()) {
        const userInfo = await authApi.getCurrentUser();
        setUser(userInfo);
      } else {
        setUser(null);
      }
    } catch (error) {
      // Token might be invalid, clear it
      authApi.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      const userInfo = await authApi.getCurrentUser();
      setUser(userInfo);
      
      toast({
        title: "Login successful!",
        description: `Welcome back, ${response.name || response.email}!`,
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError?.message || "Login failed");
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      const userInfo = await authApi.getCurrentUser();
      setUser(userInfo);
      
      toast({
        title: "Registration successful!",
        description: "Your account has been created. Redirecting to admin panel...",
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
    // Use window.location for navigation since we're outside Router context
    window.location.href = "/";
  };

  const refreshUser = async () => {
    try {
      if (authApi.isAuthenticated()) {
        const userInfo = await authApi.getCurrentUser();
        setUser(userInfo);
      }
    } catch (error) {
      // Token might be invalid, clear it
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
