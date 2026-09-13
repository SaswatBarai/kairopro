"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/use-auth-store";

function SessionSync() {
  const { data: session, status } = useSession();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setAuth({
        userId: session.user.id,
        userName: session.user.name ?? "User",
        userEmail: session.user.email ?? "",
        activeOrgId: session.user.orgId,
      });
    } else if (status === "unauthenticated") {
      clearAuth();
    }
  }, [session, status, setAuth, clearAuth]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      {children}
    </SessionProvider>
  );
}
