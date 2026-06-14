"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Sidebar } from "./Sidebar";

const PUBLIC_PREFIXES = ["/login", "/register", "/auth/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const isPublic = isPublicPath(pathname || "/");

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      const redirect = encodeURIComponent(pathname || "/");
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [loading, user, isPublic, pathname, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="ml-60 min-h-screen">{children}</main>
    </>
  );
}
