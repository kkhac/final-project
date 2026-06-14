"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/components/layout/AuthContext";
import { authApi } from "@/lib/auth";
import { AuthShell, Divider, Field, GoogleIcon } from "../login/page";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, name || undefined);
      router.replace("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not create account.");
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
    <AuthShell title="Create your account" subtitle="Start running prompt regression tests in minutes">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
      >
        {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
        Sign up with Google
      </button>

      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="name" type="text" label="Name (optional)" value={name} onChange={setName} autoComplete="name" Icon={UserIcon} />
        <Field id="email" type="email" label="Email" value={email} onChange={setEmail} autoComplete="email" Icon={Mail} required />
        <Field id="password" type="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" Icon={Lock} required minLength={8} />

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
