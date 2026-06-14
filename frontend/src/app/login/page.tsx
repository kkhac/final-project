"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Zap, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/components/layout/AuthContext";
import { authApi } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, loginWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [loading, user, redirectTo, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      router.replace(redirectTo);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await authApi.googleAuthUrl();
      window.location.href = res.data.authorize_url;
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Google sign-in is not available.");
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to PromptTest">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          Icon={Mail}
          required
        />
        <Field
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          Icon={Lock}
          required
        />

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-indigo-600 hover:underline font-medium">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-semibold text-gray-800">PromptTest</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">
          <h1 className="text-xl font-bold text-gray-900 text-center">{title}</h1>
          <p className="text-sm text-gray-500 text-center mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  Icon,
  autoComplete,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  Icon: React.ElementType;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.8 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 5.8 29.2 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2C29.1 35.4 26.7 36 24 36c-5.3 0-9.6-3.4-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.1 5.2C40.9 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
