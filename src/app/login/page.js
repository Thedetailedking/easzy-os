"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checkingDb, setCheckingDb] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Ask the server whether setup is needed (avoids exposing user count via Supabase anon key)
  useEffect(() => {
    async function checkSetupNeeded() {
      try {
        const res = await fetch("/api/auth/setup");
        const data = await res.json();
        if (data.needsSetup) {
          setIsSetupMode(true);
          toast("Welcome! Set up your Master Administrator Account to begin.", { icon: "👋" });
        }
      } catch {
        // If the check fails, default to login mode
      } finally {
        setCheckingDb(false);
      }
    }
    checkSetupNeeded();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please fill in all credential fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      toast.success(`Welcome back, ${data.user.username}! Access granted.`, { icon: "🔑" });
      router.push("/");
    } catch (err) {
      toast.error(err.message || "Failed to authenticate workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in all setup fields.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.trim().length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Initialization failed.");
      }

      toast.success("Master Administrator Account initialized successfully!", { icon: "⚙️" });
      router.push("/");
    } catch (err) {
      toast.error(err.message || "Initialization failed.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingDb) {
    return (
      <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center text-secondary gap-4 font-jetbrains-mono">
        <span className="material-symbols-outlined text-[48px] text-primary animate-spin">sync</span>
        <p className="animate-pulse">Connecting to database vault...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-surface-subtle flex items-center justify-center px-4 relative overflow-hidden">
      
      {/* Premium Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success-vibrant/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 translate-y-1/2"></div>

      {/* Main Glassmorphic Container */}
      <div className="w-full max-w-md bg-surface-main border border-border-subtle p-8 rounded-3xl shadow-2xl relative z-10 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
        
        {/* Logo / Header block */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="material-symbols-outlined text-[36px] animate-[pulse_3s_infinite]">
              {isSetupMode ? "admin_panel_settings" : "vpn_key"}
            </span>
          </div>
          <h1 className="font-headline-lg text-[26px] text-on-surface mb-2 font-bold tracking-tight">
            {isSetupMode ? "Setup Workspace" : "Workspace Access"}
          </h1>
          <p className="text-body-sm text-secondary px-6">
            {isSetupMode
              ? "Initialize your secure master user credentials to start crafting content."
              : "Verify your credentials to unlock your personal AI-powered operating system."}
          </p>
        </div>

        {/* Dynamic Forms */}
        {isSetupMode ? (
          <form onSubmit={handleSetup} className="space-y-5">
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Admin Username</label>
              <div className="relative">
                <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-surface-subtle border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Secret Password (min. 8 chars)</label>
              <div className="relative">
                <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-surface-subtle border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Confirm Password</label>
              <div className="relative">
                <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">lock_reset</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-surface-subtle border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 font-bold mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">{loading ? "sync" : "rocket_launch"}</span>
              {loading ? "Initializing..." : "Initialize Workspace"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Username</label>
              <div className="relative">
                <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your admin username"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-surface-subtle border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-surface-subtle border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-midnight-void text-primary-fixed rounded-xl font-label-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 font-bold mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">{loading ? "sync" : "key"}</span>
              {loading ? "Authenticating..." : "Authenticate Workspace"}
            </button>
          </form>
        )}

        {/* Dynamic Footer Details */}
        <div className="mt-8 pt-6 border-t border-border-subtle flex items-center justify-center text-[11px] font-jetbrains-mono text-secondary tracking-wide uppercase">
          <span className="material-symbols-outlined text-[14px] text-success-vibrant mr-1.5">shield</span>
          Secure Session Auth • Easzy OS v1.2
        </div>

      </div>
    </main>
  );
}
