"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState('Week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drafts, setDrafts] = useState([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleViewChange = (e) => setViewMode(e.detail);
    window.addEventListener('calendar-view-change', handleViewChange);
    return () => window.removeEventListener('calendar-view-change', handleViewChange);
  }, []);

  useEffect(() => {
    async function loadDrafts() {
      const { data } = await supabase.from('drafts').select('*').order('created_at', { ascending: false });
      if (data) setDrafts(data);
    }
    loadDrafts();
  }, []);

  // Helper functions for Date Math
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  const handlePrev = () => {
    if (viewMode === 'Week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'Week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddSlot = () => {
    toast("Scheduling functionality coming soon! You will be able to drag drafts here.", { icon: '🚧' });
  };

  // Generate Week Days
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i));

  // Generate Month Days (simplistic: 35 grid slots starting from first day of month padding)
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthStartDayOfWeek = startOfMonth.getDay() === 0 ? 6 : startOfMonth.getDay() - 1; // 0 for Monday
  const monthDays = Array.from({ length: 35 }).map((_, i) => addDays(startOfMonth, i - monthStartDayOfWeek));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  // Fake Health Metrics based on drafts
  const healthPercentage = drafts.length > 0 ? Math.min(Math.round((drafts.length / 5) * 100), 100) : 0;
  const consistency = drafts.length > 0 ? Math.min(Math.round((drafts.length / 3) * 100), 100) : 0;
  const diversity = drafts.length > 0 ? 80 : 0;

  return (
    <main className="md:ml-64 pt-16 min-h-[100dvh] md:h-screen flex flex-col lg:flex-row overflow-y-auto md:overflow-hidden bg-background">
      
      {/* Left Section: Content Calendar & Health */}
      <div className="flex-1 flex flex-col p-4 md:p-6 md:overflow-y-auto custom-scrollbar lg:border-r border-border-subtle pb-12 lg:pb-6">
        
        {/* Content Health Summary Card */}
        <section className="mb-6">
          <div className="bg-surface-main border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary">monitoring</span>
                Content Health
              </h2>
              {drafts.length === 0 ? (
                <p className="text-body-sm text-secondary">Not enough data to calculate health this week.</p>
              ) : (
                <p className="text-body-sm text-secondary">Your publishing pipeline is <span className="text-success-vibrant font-semibold">{healthPercentage}% healthy</span> this week.</p>
              )}
            </div>
            
            <div className="flex flex-wrap lg:flex-nowrap gap-6 lg:gap-8 bg-surface-subtle lg:bg-transparent p-4 lg:p-0 rounded-xl border border-border-subtle lg:border-none">
              <div className="text-left lg:text-center w-full sm:w-auto">
                <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-1 lg:mb-2">Consistency</p>
                <div className="flex items-center gap-3 lg:gap-2">
                  <div className="flex-1 lg:w-20 xl:w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-success-vibrant rounded-full transition-all duration-1000" style={{ width: `${consistency}%` }}></div>
                  </div>
                  <span className="font-label-md text-on-surface text-[14px]">{consistency}%</span>
                </div>
              </div>
              
              <div className="hidden sm:block w-px bg-border-subtle"></div>
              
              <div className="text-left lg:text-center w-full sm:w-auto">
                <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-1 lg:mb-2">Diversity</p>
                <div className="flex items-center gap-3 lg:gap-2">
                  <div className="flex-1 lg:w-20 xl:w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full transition-all duration-1000" style={{ width: `${diversity}%` }}></div>
                  </div>
                  <span className="font-label-md text-on-surface text-[14px]">{diversity}%</span>
                </div>
              </div>

              <div className="hidden lg:block w-px bg-border-subtle"></div>
              
              <div className="text-left lg:text-center w-full sm:w-auto border-t sm:border-t-0 border-border-subtle pt-3 sm:pt-0">
                <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-1 lg:mb-2">Engagement Est.</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">{drafts.length > 0 ? 'trending_up' : 'trending_flat'}</span>
                  <span className="font-label-md text-on-surface text-[14px]">{drafts.length > 0 ? '+12.4%' : '0%'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Calendar Navigation Header */}
        <div className="flex items-center justify-between mb-4 mt-2 bg-surface-main p-4 rounded-xl border border-border-subtle shadow-sm">
          <div className="flex items-center gap-4">
            <h3 className="font-headline-md text-[20px] md:text-[24px] text-on-surface">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-subtle border border-border-subtle text-secondary hover:text-primary transition-colors active:scale-95">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button onClick={handleToday} className="text-[12px] font-jetbrains-mono font-bold text-secondary hover:text-primary transition-colors px-2">TODAY</button>
            <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-subtle border border-border-subtle text-secondary hover:text-primary transition-colors active:scale-95">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid Body (Responsive Grid) */}
        {viewMode === 'Week' ? (
          <div className="space-y-4">
            {weekDays.map((date, i) => {
              const active = isToday(date);
              return (
                <div key={i} className={`bg-surface-main border ${active ? 'border-primary/50 bg-primary/5' : 'border-border-subtle hover:border-primary/30'} rounded-xl p-4 lg:p-5 flex flex-col lg:flex-row gap-4 lg:items-start group transition-colors shadow-sm relative overflow-hidden`}>
                  {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <div className={`lg:w-32 shrink-0 ${active ? 'pl-3' : ''}`}>
                    <p className={`text-[12px] font-jetbrains-mono uppercase tracking-wider mb-1 ${active ? 'text-primary font-bold' : 'text-secondary'}`}>{dayNames[i]}</p>
                    <p className={`font-headline-md text-[24px] ${active ? 'text-primary' : 'text-on-surface'}`}>{date.getDate()}</p>
                    {active && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold mt-1 inline-block">TODAY</span>}
                  </div>
                  <div className="flex-1 flex">
                    <div onClick={handleAddSlot} className="w-full sm:w-1/2 xl:w-1/3 border-2 border-dashed border-border-subtle rounded-xl p-4 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 hover:bg-surface-subtle hover:border-primary/50 transition-all cursor-pointer min-h-[120px]">
                      <span className="material-symbols-outlined text-secondary text-[24px]">add</span>
                      <span className="text-[11px] font-jetbrains-mono font-bold text-secondary mt-2 tracking-wider">PLAN SLOT</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-[500px]">
            {/* Days of week header for Month View */}
            <div className="grid grid-cols-7 gap-px border-x border-t border-border-subtle bg-border-subtle overflow-hidden rounded-t-xl mb-px">
              {shortDayNames.map(day => (
                <div key={day} className="bg-surface-subtle p-1 md:p-2 text-center">
                  <span className="text-[8px] md:text-[10px] font-jetbrains-mono text-secondary">{day}</span>
                </div>
              ))}
            </div>
            
            {/* 35 Day Grid (5 Weeks) */}
            <div className="grid grid-cols-7 gap-px flex-1 border-x border-b border-border-subtle bg-border-subtle rounded-b-xl lg:min-h-[600px]">
              {monthDays.map((date, i) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const active = isToday(date);
                
                return (
                  <div key={i} className={`bg-surface-main p-1 md:p-2 min-h-[60px] md:min-h-[100px] flex flex-col relative group ${!isCurrentMonth ? 'opacity-40 bg-surface-subtle' : ''}`}>
                    <span className={`text-[9px] md:text-[10px] font-jetbrains-mono ${active ? 'text-white font-bold bg-primary w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center' : 'text-secondary'}`}>
                      {date.getDate()}
                    </span>
                    
                    {/* Hover Add Button */}
                    <div onClick={handleAddSlot} className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border border-primary/20">
                      <span className="material-symbols-outlined text-primary text-[16px] md:text-[20px]">add</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar: Draft Queue */}
      <aside className="w-full lg:w-80 bg-surface-main flex flex-col z-10 border-t lg:border-t-0 lg:border-l border-border-subtle shadow-[-4px_0_12px_rgba(0,0,0,0.02)] min-h-[500px] lg:min-h-0 pb-20 lg:pb-0">
        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-subtle">
          <h3 className="font-jetbrains-mono text-[12px] font-bold tracking-widest text-on-surface uppercase">Draft Queue</h3>
          <span className="bg-midnight-void text-primary-fixed text-[10px] font-jetbrains-mono px-2.5 py-0.5 rounded-full shadow-sm">{drafts.length} DRAFTS</span>
        </div>
        
        <div className="p-4 bg-primary/5 border-b border-primary/10">
          <p className="text-[11px] font-body-sm text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Drag drafts to the calendar to schedule.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {drafts.length === 0 && (
            <div className="text-secondary text-[12px] text-center mt-10">No drafts in queue</div>
          )}
          {drafts.map(draft => (
            <div key={draft.id} className="bg-surface-main border border-border-subtle p-4 rounded-xl shadow-sm hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing group">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${draft.status === 'Ready' ? 'bg-success-vibrant' : 'bg-secondary'}`}></span>
                <span className="text-[10px] font-jetbrains-mono text-secondary uppercase tracking-wider">{draft.status} • {draft.platform}</span>
              </div>
              <p className="text-body-sm font-medium text-on-surface line-clamp-2 leading-snug">{draft.content}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-[10px] font-jetbrains-mono bg-surface-subtle text-secondary px-2 py-1 rounded border border-border-subtle tracking-wide">{draft.post_type}</span>
                <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-opacity">drag_indicator</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-5 border-t border-border-subtle bg-surface-main relative">
          <button onClick={() => setShowDraftModal(true)} className="w-full bg-midnight-void text-primary-fixed font-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98] shadow-md">
            <span className="material-symbols-outlined text-[18px]">edit_document</span>
            NEW DRAFT
          </button>
        </div>
      </aside>

      {/* New Draft Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-[slide_0.3s_ease-out]">
            <button onClick={() => setShowDraftModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-headline-md text-[20px] text-on-surface mb-2">Create New Draft</h3>
            <p className="text-body-sm text-secondary mb-6">How would you like to start your draft?</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => router.push('/capture')}
                className="w-full p-4 border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">psychology</span>
                </div>
                <div>
                  <h4 className="font-label-md text-primary group-hover:underline">Generate with AI</h4>
                  <p className="text-[12px] text-secondary mt-1">Record a brain-dump and let the Interview Engine write it for you.</p>
                </div>
              </button>

              <button 
                onClick={() => router.push('/output')}
                className="w-full p-4 border border-border-subtle bg-surface-subtle hover:bg-surface-dim rounded-xl flex items-center gap-4 transition-all text-left group hover:border-primary/50"
              >
                <div className="w-12 h-12 bg-surface-container border border-border-subtle text-on-surface rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">edit_square</span>
                </div>
                <div>
                  <h4 className="font-label-md text-on-surface group-hover:text-primary transition-colors">Write Manually</h4>
                  <p className="text-[12px] text-secondary mt-1">Start from a blank text editor and write your post from scratch.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
