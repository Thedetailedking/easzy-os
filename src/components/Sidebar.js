"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthGuard";

export default function Sidebar() {
  const pathname = usePathname();
  const [profileName, setProfileName] = useState("Kojo Mensah");
  const [accountType, setAccountType] = useState("Admin Account");
  const { user, logout } = useAuth();

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('user_settings').select('user_name, profile_name').eq('is_active', true).single();
      if (data) {
        if (data.user_name) setProfileName(data.user_name);
        if (data.profile_name) setAccountType(data.profile_name);
      }
    }
    loadProfile();
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", icon: "space_dashboard", href: "/" },
    { name: "Capture", icon: "input", href: "/capture" },
    { name: "Chat", icon: "chat", href: "/chat" },
    { name: "Output", icon: "smart_display", href: "/output" },
    { name: "Campaign Planner", icon: "rocket_launch", href: "/campaign" },
    { name: "Calendar", icon: "calendar_today", href: "/calendar" },
    { name: "Bank", icon: "inventory_2", href: "/bank" },
    { name: "Settings", icon: "settings", href: "/settings" },
  ];


  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-midnight-void border-r border-outline-variant flex-col py-6 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-headline-md font-headline-md font-bold text-primary-fixed">
            Easzy OS
          </h1>
          <p className="text-label-sm font-label-sm text-primary-fixed-dim opacity-70">
            AI Educator Pro
          </p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-l-4 border-primary shadow-lg"
                    : "text-surface-variant hover:text-surface-bright hover:bg-tertiary-container hover:text-on-tertiary-container"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-label-md font-label-md">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-6 flex items-center justify-between gap-2 border-t border-outline-variant/20 pt-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden border border-primary/30 shrink-0">
              <img
                alt="Easzy OS User Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYBWL40vXfc9b7qNi1bXPz9jyoN641B_ihwQXqHXDVNTk5iAHYuHhcoeBBb010huZiDy2cBPd5LMBO2iz5W-58Mv0EstSqn-nLbWp3GmBCKUmDBOlX7fQ3NnD2--Sg8BRpMKfur4s8vDsmN7peubphUVd25-CZ58kPQpNwXLUJyc7Xd6SbrjmESKhf1DRXnCMi1Eym8tbcEtR3wrE9cuqfFZcmvQCM-bWRAoOi1iW9Rb1JGVNMNFIVbHLi9Z1ro_YjCxEs6RYmdImq"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-label-md font-label-md text-surface-bright truncate">
                {user ? user.username : profileName}
              </span>
              <span className="text-[10px] font-label-sm text-primary uppercase tracking-wider truncate">
                {accountType}
              </span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors flex shrink-0" 
            title="Log Out of Workspace"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-midnight-void border-t border-outline-variant flex justify-around items-center z-50 px-2 pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
            pathname === "/"
              ? "text-primary-fixed"
              : "text-surface-variant hover:text-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            space_dashboard
          </span>
          <span className="text-[10px] font-label-sm">Home</span>
        </Link>
        <Link
          href="/chat"
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
            pathname === "/chat"
              ? "text-primary-fixed"
              : "text-surface-variant hover:text-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">chat</span>
          <span className="text-[10px] font-label-sm">Chat</span>
        </Link>
        <Link
          href="/output"
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
            pathname === "/output"
              ? "text-primary-fixed"
              : "text-surface-variant hover:text-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">smart_display</span>
          <span className="text-[10px] font-label-sm">Output</span>
        </Link>
        <Link
          href="/capture"
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
            pathname === "/capture"
              ? "text-primary-fixed"
              : "text-surface-variant hover:text-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">input</span>
          <span className="text-[10px] font-label-sm">Capture</span>
        </Link>
        <Link
          href="/calendar"
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
            pathname === "/calendar"
              ? "text-primary-fixed"
              : "text-surface-variant hover:text-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            calendar_today
          </span>
          <span className="text-[10px] font-label-sm">Calendar</span>
        </Link>
        <Link
          href="/bank"
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
            pathname === "/bank"
              ? "text-primary-fixed"
              : "text-surface-variant hover:text-surface-bright"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          <span className="text-[10px] font-label-sm">Bank</span>
        </Link>
      </nav>
    </>
  );
}
