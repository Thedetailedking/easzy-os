"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [allDrafts, setAllDrafts] = useState([]);
  const [recentDrafts, setRecentDrafts] = useState([]);
  const [userName, setUserName] = useState("Creator");
  const router = useRouter();

  useEffect(() => {
    async function fetchDrafts() {
      const { data } = await supabase.from('drafts').select('*').order('created_at', { ascending: false });
      if (data) {
        setAllDrafts(data);
        setRecentDrafts(data.slice(0, 3));
      }
    }
    async function fetchProfile() {
      const { data } = await supabase.from('user_settings').select('user_name').eq('is_active', true).single();
      if (data && data.user_name) {
        setUserName(data.user_name.split(' ')[0]);
      }
    }
    fetchDrafts();
    fetchProfile();
  }, []);

  // Calculate Content Health (Synchronized with Calendar Page!)
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - distanceToMonday);

  const currentWeekDays = Array.from({length: 7}).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.toDateString();
  });
  
  const scheduledCount = allDrafts.filter(d => d.scheduled_date).length;
  const publishedCount = allDrafts.filter(d => d.scheduled_date && d.status === 'Published').length;

  const consistencyDays = currentWeekDays.filter(day => {
    return allDrafts.some(d => {
      if (!d.scheduled_date) return false;
      return new Date(d.scheduled_date).toDateString() === day;
    });
  }).length;
  const consistencyScore = Math.round((consistencyDays / 7) * 100) || 0;

  const scheduledPlatforms = new Set(allDrafts.filter(d => d.scheduled_date).map(d => d.platform));
  const diversityScore = Math.min(Math.round((scheduledPlatforms.size / 4) * 100), 100) || 0;

  const healthScore = scheduledCount > 0 ? Math.round((publishedCount / scheduledCount) * 100) : 0;

  // Calculate Week at a Glance
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dayDrafts = allDrafts.filter(draft => {
      if (!draft.scheduled_date) return false;
      return new Date(draft.scheduled_date).toDateString() === d.toDateString();
    });
    // Also show unscheduled drafts created on this day
    const unscheduledDrafts = allDrafts.filter(draft => {
      if (draft.scheduled_date) return false;
      return new Date(draft.created_at).toDateString() === d.toDateString();
    });
    return {
      dayName: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i],
      dateNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      scheduledDrafts: dayDrafts,
      unscheduledDrafts: unscheduledDrafts,
    };
  });

  return (
    <main className="md:ml-64 pt-24 md:pt-28 min-h-screen bg-background px-4 md:px-6 lg:px-10 pb-32">
      
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 1. What to work on today */}
        <section className="bg-gradient-to-r from-primary-container/30 to-surface-main border border-border-subtle rounded-3xl p-6 lg:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-label-md font-jetbrains-mono text-primary mb-2 uppercase tracking-wider font-bold">Good Morning, {userName}</p>
              <h1 className="font-headline-lg text-[28px] md:text-[36px] text-on-surface leading-tight mb-3">
                It's {today.toLocaleDateString('en-US', { weekday: 'long' })}. <br className="hidden md:block"/>Time to review your drafts for the week.
              </h1>
              <p className="text-body-lg text-secondary max-w-lg">
                You have {recentDrafts.length} drafts ready for review. Let's get them filled.
              </p>
            </div>
            
            {/* Quick Capture Buttons */}
            <div className="flex flex-wrap md:flex-col gap-3 shrink-0">
              <Link href="/capture" className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">mic</span>
                Record Voice Note
              </Link>
              <Link href="/capture" className="bg-surface-subtle border border-border-subtle text-on-surface px-6 py-3 rounded-xl font-label-md hover:bg-surface-main hover:border-primary/30 transition-all flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined text-[20px] text-primary group-hover:scale-110 transition-transform">edit_note</span>
                Quick Text Idea
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="xl:col-span-2 space-y-8">
            {/* 3. Content Health Summary */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-md text-[20px] text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">monitoring</span>
                  Content Health
                </h2>
              </div>
              <div className="bg-surface-main border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="text-left w-full sm:w-auto">
                  <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-2">Consistency</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 sm:w-24 lg:w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-success-vibrant rounded-full" style={{ width: `${consistencyScore}%` }}></div>
                    </div>
                    <span className="font-label-md text-on-surface text-[14px]">{consistencyScore}%</span>
                  </div>
                </div>
                
                <div className="hidden sm:block w-px h-12 bg-border-subtle"></div>
                
                <div className="text-left w-full sm:w-auto border-t sm:border-t-0 border-border-subtle pt-4 sm:pt-0">
                  <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-2">Diversity</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 sm:w-24 lg:w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary-container rounded-full" style={{ width: `${diversityScore}%` }}></div>
                    </div>
                    <span className="font-label-md text-on-surface text-[14px]">{diversityScore}%</span>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-12 bg-border-subtle"></div>

                <div className="text-left w-full sm:w-auto border-t sm:border-t-0 border-border-subtle pt-4 sm:pt-0">
                  <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-2">Pipeline Health</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 sm:w-24 lg:w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-success-vibrant rounded-full" style={{ width: `${healthScore}%` }}></div>
                    </div>
                    <span className="font-label-md text-on-surface text-[14px]">{healthScore}%</span>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-12 bg-border-subtle"></div>
                
                <div className="text-left w-full sm:w-auto border-t sm:border-t-0 border-border-subtle pt-4 sm:pt-0">
                  <p className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-2">Total Output</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
                    <span className="font-headline-sm text-on-surface text-[20px]">{allDrafts.length} Posts</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Week at a Glance (Mini Calendar Strip) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-md text-[20px] text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_view_week</span>
                  Week at a Glance
                </h2>
                <Link href="/calendar" className="text-label-sm font-label-md text-primary hover:underline flex items-center gap-1">
                  Full Calendar <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              <div className="bg-surface-main border border-border-subtle rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                {weekDays.map((dayObj) => {
                  const hasContent = dayObj.scheduledDrafts.length > 0 || dayObj.unscheduledDrafts.length > 0;
                  return (
                    <div key={dayObj.dayName} className={`flex-1 p-3 border-b md:border-b-0 md:border-r border-border-subtle last:border-0 relative ${dayObj.isToday ? 'bg-primary/5' : ''}`}>
                      <p className={`text-[10px] font-jetbrains-mono ${dayObj.isToday ? 'text-primary font-bold' : 'text-secondary'}`}>{dayObj.dayName} {dayObj.dateNum}</p>
                      
                      <div className="mt-2 min-h-[40px] flex flex-col gap-1">
                        {dayObj.scheduledDrafts.map((draft, idx) => (
                          <div
                            key={draft.id + '-s'}
                            onClick={() => router.push(`/output?capture_id=${draft.capture_id}`)}
                            title={draft.post_type || draft.platform}
                            className="w-full px-1.5 py-0.5 rounded text-[9px] font-jetbrains-mono truncate cursor-pointer bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                          >
                            {draft.platform || 'Draft'}
                          </div>
                        ))}
                        {dayObj.unscheduledDrafts.map((draft, idx) => (
                          <div
                            key={draft.id + '-u'}
                            onClick={() => router.push(`/output?capture_id=${draft.capture_id}`)}
                            title={draft.post_type || draft.platform}
                            className="w-full px-1.5 py-0.5 rounded text-[9px] font-jetbrains-mono truncate cursor-pointer bg-surface-container text-secondary border border-border-subtle hover:border-primary/30 hover:text-on-surface transition-colors"
                          >
                            {draft.platform || 'Draft'}
                          </div>
                        ))}
                        {!hasContent && (
                          <div className="w-full h-8 border border-dashed border-border-subtle rounded flex items-center justify-center opacity-40">
                            <span className="material-symbols-outlined text-[14px] text-secondary">add</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* 5. Recent Drafts */}
          <div className="xl:col-span-1">
            <div className="bg-surface-main border border-border-subtle rounded-3xl p-5 lg:p-6 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline-md text-[20px] text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit_document</span>
                  Recent Drafts
                </h2>
              </div>
              
              <div className="flex-1 space-y-4">
                {recentDrafts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-secondary opacity-80 border-2 border-dashed border-border-subtle rounded-2xl mx-2">
                    <svg className="w-16 h-16 mb-4 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="font-jetbrains-mono text-[11px] uppercase tracking-widest mb-2 text-on-surface">No Drafts Found</p>
                    <p className="text-[12px]">Your recent output will appear here.</p>
                  </div>
                ) : recentDrafts.map(draft => (
                  <div key={draft.id} onClick={() => router.push(`/output?capture_id=${draft.capture_id}`)} className="bg-surface-subtle border border-border-subtle p-4 rounded-xl hover:border-primary/30 hover:bg-surface-main transition-all group cursor-pointer relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-surface-container group-hover:bg-primary transition-colors"></div>
                    <div className="flex items-center gap-2 mb-2 pl-2">
                      <span className={`w-2 h-2 rounded-full bg-secondary`}></span>
                      <span className="text-[9px] font-jetbrains-mono text-secondary uppercase tracking-wider">{draft.status} • {draft.platform}</span>
                    </div>
                    <p className="text-body-sm font-medium text-on-surface line-clamp-2 leading-snug pl-2 group-hover:text-primary transition-colors">{draft.post_type}</p>
                    <div className="mt-3 pl-2 flex justify-between items-center opacity-70 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-jetbrains-mono bg-background text-secondary px-2 py-0.5 rounded border border-border-subtle">{new Date(draft.created_at).toLocaleDateString()}</span>
                      <span className="material-symbols-outlined text-[16px] text-primary">edit</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border-subtle">
                <Link href="/bank" className="w-full text-center text-label-sm font-label-md text-primary hover:underline block">
                  View all in Idea Vault
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

    </main>
  );
}
