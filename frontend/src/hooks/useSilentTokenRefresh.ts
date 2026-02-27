import { useEffect, useRef, useCallback } from "react";
import { authApi } from "@/lib/api";

const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
const TOKEN_CHECK_INTERVAL_MS = 60000;

interface TokenInfo {
  exp: number;
  iat: number;
}

function decodeJWT(token: string): TokenInfo | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getTokenExpTime(accessToken: string): number | null {
  const decoded = decodeJWT(accessToken);
  if (!decoded?.exp) return null;
  return decoded.exp * 1000;
}

export function useSilentTokenRefresh() {
  const isRefreshing = useRef(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const shouldRefreshToken = useCallback((): boolean => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return false;

    const expTime = getTokenExpTime(accessToken);
    if (!expTime) return false;

    const now = Date.now();
    const timeUntilExpiry = expTime - now;

    return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS && timeUntilExpiry > 0;
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRefreshing.current) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }

    isRefreshing.current = true;

    try {
      const response = await authApi.refreshToken();
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      return true;
    } catch (error) {
      console.error("Silent token refresh failed:", error);
      authApi.logout();
      window.location.href = "/login?reason=session_expired";
      return false;
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  const scheduleTokenCheck = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(async () => {
      if (shouldRefreshToken()) {
        await refreshToken();
      }
    }, TOKEN_CHECK_INTERVAL_MS);
  }, [shouldRefreshToken, refreshToken]);

  useEffect(() => {
    scheduleTokenCheck();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && shouldRefreshToken()) {
        await refreshToken();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [scheduleTokenCheck, shouldRefreshToken, refreshToken]);

  return { refreshToken };
}

export function withSilentRefresh<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  getToken: () => string | null
): T {
  return (async (...args: Parameters<T>) => {
    const accessToken = getToken();
    
    if (accessToken) {
      const expTime = getTokenExpTime(accessToken);
      const now = Date.now();
      
      if (expTime && expTime - now < TOKEN_REFRESH_THRESHOLD_MS) {
        try {
          const response = await authApi.refreshToken();
          localStorage.setItem("access_token", response.access_token);
          localStorage.setItem("refresh_token", response.refresh_token);
        } catch (error) {
          console.error("Token refresh failed in withSilentRefresh:", error);
        }
      }
    }
    
    return fn(...args);
  }) as T;
}
