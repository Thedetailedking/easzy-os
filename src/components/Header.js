"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();
  const [calendarView, setCalendarView] = useState('Week');

  const handleCalendarToggle = (view) => {
    setCalendarView(view);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendar-view-change', { detail: view }));
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-surface-main flex justify-between items-center px-4 md:px-gutter-desktop z-40 border-b border-border-subtle">
      {/* Left side (Empty space to push right items) */}
      <div className="flex-1"></div>

      {/* Right side: Context & Actions */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        
        {/* Context Badge */}
        {pathname === '/chat' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success-vibrant/10 text-primary rounded-full shadow-sm">
            <div className="w-2 h-2 rounded-full bg-success-vibrant animate-pulse"></div>
            <span className="text-[10px] md:text-label-sm font-bold whitespace-nowrap">Engine Active</span>
          </div>
        ) : pathname === '/capture' ? (
          <div className="bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-lg text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider flex items-center gap-2 whitespace-nowrap shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">input</span>
            <span className="hidden sm:inline">Capture Mode</span>
            <span className="sm:hidden">Capture</span>
          </div>
        ) : pathname === '/output' ? (
          <div className="bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-lg text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider flex items-center gap-2 whitespace-nowrap shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">smart_display</span>
            <span className="hidden sm:inline">Output Generation</span>
            <span className="sm:hidden">Output</span>
          </div>
        ) : pathname === '/bank' ? (
          <div className="bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-lg text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider flex items-center gap-2 whitespace-nowrap shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">account_balance</span>
            <span className="hidden sm:inline">Idea Vault</span>
            <span className="sm:hidden">Vault</span>
          </div>
        ) : pathname === '/calendar' ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex bg-surface-subtle rounded-lg p-1 border border-border-subtle shadow-sm">
              <button 
                onClick={() => handleCalendarToggle('Week')}
                className={`px-3 py-1 rounded-md font-label-sm transition-all border ${calendarView === 'Week' ? 'bg-surface-main shadow-sm text-primary border-primary/30' : 'text-secondary hover:text-primary border-transparent'}`}
              >
                Week
              </button>
              <button 
                onClick={() => handleCalendarToggle('Month')}
                className={`px-3 py-1 rounded-md font-label-sm transition-all border ${calendarView === 'Month' ? 'bg-surface-main shadow-sm text-primary border-primary/30' : 'text-secondary hover:text-primary border-transparent'}`}
              >
                Month
              </button>
            </div>
          </div>
        ) : pathname === '/settings' ? (
          <div className="hidden md:flex bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-lg text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider items-center gap-2 whitespace-nowrap shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">tune</span>
            <span>Settings Config</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/settings" className="p-1.5 text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-subtle md:hidden">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
          <button className="hidden md:block p-1.5 md:p-2 text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-subtle">
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">notifications</span>
          </button>
        </div>

        {/* Global Launch Button */}
        <a href="/output#launch-campaign" className="bg-primary text-on-primary px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-label-sm md:text-label-md font-label-md flex items-center gap-1 hover:opacity-90 transition-all active:scale-95 shadow-sm whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px] md:text-[20px]">rocket_launch</span>
          <span className="hidden sm:inline">Launch</span>
        </a>
      </div>
    </header>
  );
}
