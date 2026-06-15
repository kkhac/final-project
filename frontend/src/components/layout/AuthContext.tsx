"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, clearToken, getStoredToken, storeToken, AuthUser } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  setSessionFromToken: (token: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    storeToken(res.data.access_token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await authApi.register({ email, password, name });
    storeToken(res.data.access_token);
    setUser(res.data.user);
  }, []);

  const setSessionFromToken = useCallback(async (token: string) => {
    storeToken(token);
    const res = await authApi.me();
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithPassword, register, logout, setSessionFromToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
