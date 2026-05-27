"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const AuthContext = createContext({
  user: null,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthGuard({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check the server-side session on every navigation
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        setUser(data.user || null);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, [pathname]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Best-effort logout
    }
    setUser(null);
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center text-secondary gap-4 font-jetbrains-mono">
        <span className="material-symbols-outlined text-[48px] text-primary animate-pulse">lock</span>
        <p className="animate-pulse">Verifying workspace credentials...</p>
      </div>
    );
  }

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <AuthContext.Provider value={{ user, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // If we are logged in, render the standard desktop layout with Sidebar & Header
  return (
    <AuthContext.Provider value={{ user, logout }}>
      {user ? (
        <>
          <Sidebar />
          <Header />
          {children}
        </>
      ) : (
        <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center text-secondary gap-4 font-jetbrains-mono">
          <span className="material-symbols-outlined text-[48px] text-primary animate-pulse">security</span>
          <p className="animate-pulse">Redirecting to workspace gate...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
}
