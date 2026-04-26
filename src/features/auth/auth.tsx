import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";

import { authApi, isApiError } from "../../lib/api";
import { clearStoredToken, getStoredToken, setStoredToken } from "../../lib/session";
import { SessionUser } from "../../types/api";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      setIsBootstrapping(false);
      return;
    }

    try {
      const nextUser = await authApi.me();
      setUser(nextUser);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        logout();
      }
      throw error;
    } finally {
      setIsBootstrapping(false);
    }
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email, password);
      setStoredToken(auth.access_token);
      setToken(auth.access_token);

      const nextUser = await authApi.me();
      if (nextUser.role !== "admin") {
        logout();
        throw new Error("This account is not an admin.");
      }
      setUser(nextUser);
    },
    [logout],
  );

  useEffect(() => {
    void refreshMe();
  }, [refreshMe, token]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("scenee_admin_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("scenee_admin_unauthorized", handleUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isBootstrapping,
      login,
      logout,
      refreshMe,
    }),
    [user, token, isBootstrapping, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, token, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <div className="screen-shell">Loading admin session…</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
