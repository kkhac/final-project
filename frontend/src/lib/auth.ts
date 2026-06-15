import { api, AUTH_TOKEN_KEY } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  auth_provider: "local" | "google" | string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<TokenResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<TokenResponse>("/auth/login", data),
  me: () => api.get<AuthUser>("/auth/me"),
  googleAuthUrl: () =>
    api.get<{ authorize_url: string }>("/auth/google/login"),
};

export function storeToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function formatApiError(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msg = detail
      .map((d: any) => (typeof d === "string" ? d : d?.msg))
      .filter(Boolean)
      .join("; ");
    if (msg) return msg;
  }
  if (typeof err?.message === "string") return err.message;
  return fallback;
}
