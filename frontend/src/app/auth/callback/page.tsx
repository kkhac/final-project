"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/layout/AuthContext";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setSessionFromToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    if (!token) {
      setError("Missing access token in callback URL.");
      return;
    }
    setSessionFromToken(token)
      .then(() => router.replace("/"))
      .catch(() => setError("Could not complete sign-in. Please try again."));
  }, [router, setSessionFromToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {error ? (
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <a href="/login" className="text-sm text-indigo-600 hover:underline">Back to sign in</a>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-gray-600 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Finalizing sign-in…
        </div>
      )}
    </div>
  );
}
