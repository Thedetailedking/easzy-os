"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthGuard({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const session = localStorage.getItem("easzy_os_user");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
      } catch (err) {
        console.error("Session parse error", err);
        localStorage.removeItem("easzy_os_user");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === "/login";
    if (!user && !isLoginPage) {
      router.push("/login");
    } else if (user && isLoginPage) {
      router.push("/");
    }
  }, [user, pathname, isLoading, router]);

  const login = (userData) => {
    localStorage.setItem("easzy_os_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("easzy_os_user");
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
      <AuthContext.Provider value={{ user, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // If we are logged in, we render the standard desktop layout with Sidebar & Header
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
