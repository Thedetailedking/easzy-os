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
  
  // Interactive Scheduling States
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [rescheduleDateVal, setRescheduleDateVal] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    const handleViewChange = (e) => setViewMode(e.detail);
    window.addEventListener('calendar-view-change', handleViewChange);
    return () => window.removeEventListener('calendar-view-change', handleViewChange);
  }, []);

  // Load Drafts from Supabase
  const loadDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setDrafts(data);
    } catch (err) {
      console.error("Error loading drafts:", err);
      toast.error("Failed to load drafts: " + err.message);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  // Helper functions for Date Math
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
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

  // Drag and Drop Logic (HTML5 Drag & Drop API)
  const handleDragStart = (e, draftId) => {
    e.dataTransfer.setData("text/plain", draftId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, date) => {
    e.preventDefault();
    const draftId = e.dataTransfer.getData("text/plain");
    if (draftId) {
      await scheduleDraft(draftId, date);
    }
  };

  const scheduleDraft = async (draftId, date) => {
    try {
      const scheduledDate = new Date(date);
      scheduledDate.setHours(9, 0, 0, 0); // Default to 9:00 AM in morning

      const { error } = await supabase
        .from('drafts')
        .update({ 
          scheduled_date: scheduledDate.toISOString(),
          status: 'Scheduled'
        })
        .eq('id', draftId);
      
      if (error) throw error;

      // Update state locally
      setDrafts(prev => prev.map(d => 
        d.id === draftId 
          ? { ...d, scheduled_date: scheduledDate.toISOString(), status: 'Scheduled' } 
          : d
      ));
      toast.success("Draft scheduled successfully!");
    } catch (err) {
      console.error("Scheduling error", err);
      toast.error("Failed to schedule: " + err.message);
    }
  };

  // Status Checkbox Toggle handler (Scheduled <-> Published/Completed)
  const toggleDraftStatus = async (e, draft) => {
    e.stopPropagation(); // prevent parent slot/date clicks
    const newStatus = draft.status === 'Published' ? 'Scheduled' : 'Published';
    
    try {
      const { error } = await supabase
        .from('drafts')
        .update({ status: newStatus })
        .eq('id', draft.id);
      
      if (error) throw error;
      
      setDrafts(prev => prev.map(d => 
        d.id === draft.id ? { ...d, status: newStatus } : d
      ));
      
      if (newStatus === 'Published') {
        toast.success("Post marked as Completed!", { icon: '🎉' });
      } else {
        toast.success("Post marked as Scheduled.");
      }
    } catch (err) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Day drafts comparison
  const getDraftsForDate = (date) => {
    return drafts.filter(d => {
      if (!d.scheduled_date) return false;
      const dDate = new Date(d.scheduled_date);
      return dDate.getDate() === date.getDate() &&
             dDate.getMonth() === date.getMonth() &&
             dDate.getFullYear() === date.getFullYear();
    });
  };

  // Click handler to open scheduling popup
  const handleAddSlotClick = (date) => {
    setSelectedScheduleDate(date);
    setShowScheduleModal(true);
  };

  // Click handler to preview scheduled draft details
  const handleDraftClick = (draft) => {
    setSelectedDraft(draft);
    setShowPreviewModal(true);
    setIsCopied(false);
    
    if (draft.scheduled_date) {
      const d = new Date(draft.scheduled_date);
      // format as yyyy-MM-dd for calendar input
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setRescheduleDateVal(`${year}-${month}-${day}`);
    } else {
      setRescheduleDateVal("");
    }
  };

  // Unschedule Action (Send back to queue)
  const handleUnscheduleDraft = async () => {
    if (!selectedDraft) return;
    try {
      const { error } = await supabase
        .from('drafts')
        .update({ 
          scheduled_date: null,
          status: 'Draft'
        })
        .eq('id', selectedDraft.id);
      
      if (error) throw error;

      // Update local state
      setDrafts(prev => prev.map(d => 
        d.id === selectedDraft.id 
          ? { ...d, scheduled_date: null, status: 'Draft' } 
          : d
      ));
      
      setShowPreviewModal(false);
      setSelectedDraft(null);
      toast.success("Draft unscheduled and sent back to queue!");
    } catch (err) {
      toast.error("Failed to unschedule draft: " + err.message);
    }
  };

  // Reschedule Date Input Trigger
  const handleRescheduleDraftSubmit = async (newDateStr) => {
    if (!selectedDraft || !newDateStr) return;
    try {
      const newDate = new Date(newDateStr);
      newDate.setHours(9, 0, 0, 0); // 9 AM default

      const { error } = await supabase
        .from('drafts')
        .update({ 
          scheduled_date: newDate.toISOString(),
          status: 'Scheduled'
        })
        .eq('id', selectedDraft.id);
      
      if (error) throw error;

      setDrafts(prev => prev.map(d => 
        d.id === selectedDraft.id 
          ? { ...d, scheduled_date: newDate.toISOString(), status: 'Scheduled' } 
          : d
      ));
      
      setShowPreviewModal(false);
      setSelectedDraft(null);
      toast.success("Draft rescheduled successfully!");
    } catch (err) {
      toast.error("Failed to reschedule: " + err.message);
    }
  };

  // Quick Copy Content
  const handleCopyContent = () => {
    if (selectedDraft) {
      // Strip HTML tags for clean copy-pasting
      const cleanText = selectedDraft.content.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Draft copied to clipboard!");
    }
  };

  // Generate Week Days
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i));

  // Generate Month Days
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

  // State-driven sidebar queue & metrics
  const unscheduledDrafts = drafts.filter(d => !d.scheduled_date);
  
  // Real dynamic math metrics
  const scheduledCount = drafts.filter(d => d.scheduled_date).length;
  const publishedCount = drafts.filter(d => d.scheduled_date && d.status === 'Published').length;

  // Consistency Score: % of days in currently visible view containing at least one post
  const visibleDays = viewMode === 'Week' ? weekDays : monthDays;
  const daysWithPosts = visibleDays.filter(day => {
    const dayDrafts = drafts.filter(d => {
      if (!d.scheduled_date) return false;
      const dDate = new Date(d.scheduled_date);
      return dDate.getDate() === day.getDate() &&
             dDate.getMonth() === day.getMonth() &&
             dDate.getFullYear() === day.getFullYear();
    });
    return dayDrafts.length > 0;
  }).length;
  const consistency = visibleDays.length > 0 ? Math.round((daysWithPosts / visibleDays.length) * 100) : 0;

  // Diversity Score: distribution of platforms used (out of 4 main providers)
  const scheduledPlatforms = new Set(drafts.filter(d => d.scheduled_date).map(d => d.platform));
  const platformsCount = scheduledPlatforms.size;
  const diversity = Math.min(Math.round((platformsCount / 4) * 100), 100) || 0;

  // Content Health Score: % of scheduled calendar posts marked as Completed/Published!
  const healthPercentage = scheduledCount > 0 ? Math.round((publishedCount / scheduledCount) * 100) : 0;

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
                <p className="text-body-sm text-secondary">Your pipeline is <span className="text-success-vibrant font-semibold">{healthPercentage}% completed</span> ({publishedCount} of {scheduledCount} posts published).</p>
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
                  <span className="material-symbols-outlined text-primary text-[20px]">{publishedCount > 0 ? 'trending_up' : 'trending_flat'}</span>
                  <span className="font-label-md text-on-surface text-[14px]">{publishedCount > 0 ? '+18.2%' : '0%'}</span>
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

        {/* Calendar Grid Body */}
        {viewMode === 'Week' ? (
          <div className="space-y-4">
            {weekDays.map((date, i) => {
              const active = isToday(date);
              const dateDrafts = getDraftsForDate(date);
              
              return (
                <div 
                  key={i} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, date)}
                  className={`bg-surface-main border ${active ? 'border-primary/50 bg-primary/5' : 'border-border-subtle hover:border-primary/30'} rounded-xl p-4 lg:p-5 flex flex-col lg:flex-row gap-4 lg:items-start group transition-colors shadow-sm relative overflow-hidden`}
                >
                  {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <div className={`lg:w-32 shrink-0 ${active ? 'pl-3' : ''}`}>
                    <p className={`text-[12px] font-jetbrains-mono uppercase tracking-wider mb-1 ${active ? 'text-primary font-bold' : 'text-secondary'}`}>{dayNames[i]}</p>
                    <p className={`font-headline-md text-[24px] ${active ? 'text-primary' : 'text-on-surface'}`}>{date.getDate()}</p>
                    {active && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold mt-1 inline-block">TODAY</span>}
                  </div>
                  
                  {/* Scheduled Items Column & Add Actions */}
                  <div className="flex-1 flex flex-col gap-2">
                    {dateDrafts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        {dateDrafts.map(draft => (
                          <div 
                            key={draft.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, draft.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDraftClick(draft);
                            }}
                            className={`p-3 hover:bg-surface-main border cursor-grab transition-all flex flex-col gap-2 group/card relative shadow-sm rounded-xl ${
                              draft.status === 'Published' 
                                ? 'bg-success-vibrant/5 border-success-vibrant/30 opacity-80' 
                                : 'bg-surface-subtle border-border-subtle hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {/* Interactive Checkbox State indicator */}
                                <button 
                                  onClick={(e) => toggleDraftStatus(e, draft)}
                                  className="text-secondary hover:text-success-vibrant flex shrink-0 transition-transform active:scale-90"
                                  title={draft.status === 'Published' ? "Mark as Scheduled" : "Mark as Completed"}
                                >
                                  <span className={`material-symbols-outlined text-[18px] ${draft.status === 'Published' ? 'text-success-vibrant font-bold' : 'text-secondary'}`}>
                                    {draft.status === 'Published' ? 'check_box' : 'check_box_outline_blank'}
                                  </span>
                                </button>
                                
                                <span className={`text-[9px] font-jetbrains-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                                  draft.status === 'Published' ? 'bg-success-vibrant/10 text-success-vibrant' :
                                  draft.platform === 'LinkedIn' ? 'bg-primary/10 text-primary' :
                                  draft.platform === 'YouTube' ? 'bg-error-vibrant/10 text-error-vibrant' :
                                  draft.platform === 'Instagram' ? 'bg-orange-500/10 text-orange-500' :
                                  'bg-success-vibrant/10 text-success-vibrant'
                                }`}>
                                  <span className="material-symbols-outlined text-[10px]">
                                    {draft.status === 'Published' ? 'check_circle' :
                                     draft.platform === 'LinkedIn' ? 'business_center' :
                                     draft.platform === 'YouTube' ? 'play_circle' :
                                     draft.platform === 'Instagram' ? 'photo_camera' :
                                     'article'}
                                  </span>
                                  {draft.platform.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[9px] font-jetbrains-mono text-secondary">9:00 AM</span>
                            </div>
                            
                            <p 
                              className={`text-[12px] text-on-surface line-clamp-2 leading-relaxed ${
                                draft.status === 'Published' ? 'line-through opacity-60' : ''
                              }`}
                              dangerouslySetInnerHTML={{ __html: draft.content.replace(/<[^>]*>/g, '').substring(0, 100) }}
                            />
                            
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border-subtle/50 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <span className="text-[10px] text-secondary font-jetbrains-mono">{draft.post_type}</span>
                              <span className="material-symbols-outlined text-[14px] text-primary">edit</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleAddSlotClick(date)}
                      className="w-full sm:w-1/2 xl:w-1/3 border border-dashed border-border-subtle rounded-xl p-3 flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 hover:bg-surface-subtle hover:border-primary/30 transition-all cursor-pointer min-h-[60px]"
                    >
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-secondary text-[18px]">add</span>
                        <span className="text-[11px] font-jetbrains-mono font-bold text-secondary tracking-wider">PLAN SLOT</span>
                      </div>
                    </button>
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
                const dateDrafts = getDraftsForDate(date);
                
                return (
                  <div 
                    key={i} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, date)}
                    className={`bg-surface-main p-1.5 md:p-2 min-h-[80px] md:min-h-[110px] flex flex-col relative group border border-transparent hover:border-primary/20 transition-all ${!isCurrentMonth ? 'opacity-30 bg-surface-subtle/50' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1 shrink-0">
                      <span className={`text-[9px] md:text-[10px] font-jetbrains-mono ${active ? 'text-white font-bold bg-primary w-5 h-5 rounded-full flex items-center justify-center' : 'text-secondary'}`}>
                        {date.getDate()}
                      </span>
                      
                      {/* Plus icon on hover for fast plan slots */}
                      <button 
                        onClick={() => handleAddSlotClick(date)}
                        className="opacity-0 group-hover:opacity-100 text-secondary hover:text-primary transition-opacity flex"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                    
                    {/* Compact Scheduled Draft list for month days */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-0.5">
                      {dateDrafts.map(draft => (
                        <div 
                          key={draft.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, draft.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDraftClick(draft);
                          }}
                          className={`p-1 text-[10px] border rounded transition-all cursor-grab truncate font-medium flex items-center justify-between gap-1 shadow-sm leading-tight select-none relative group/cell ${
                            draft.status === 'Published' ? 'bg-success-vibrant/5 border-success-vibrant/30 text-success-vibrant line-through opacity-75' :
                            draft.platform === 'LinkedIn' ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20' :
                            draft.platform === 'YouTube' ? 'bg-error-vibrant/10 border-error-vibrant/20 text-error-vibrant hover:bg-error-vibrant/20' :
                            draft.platform === 'Instagram' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20' :
                            'bg-success-vibrant/10 border-success-vibrant/20 text-success-vibrant hover:bg-success-vibrant/20'
                          }`}
                        >
                          <div className="flex items-center gap-1 overflow-hidden truncate">
                            <span className="material-symbols-outlined text-[10px] shrink-0">
                              {draft.status === 'Published' ? 'check_circle' :
                               draft.platform === 'LinkedIn' ? 'business_center' :
                               draft.platform === 'YouTube' ? 'play_circle' :
                               draft.platform === 'Instagram' ? 'photo_camera' :
                               'article'}
                            </span>
                            <span className="truncate">{draft.content.replace(/<[^>]*>/g, '')}</span>
                          </div>
                          
                          {/* Hover Checkbox Status Indicator inside Month cell draft */}
                          <button 
                            onClick={(e) => toggleDraftStatus(e, draft)}
                            className="opacity-0 group-hover/cell:opacity-100 hover:scale-110 transition-all shrink-0 flex text-secondary hover:text-success-vibrant"
                            title={draft.status === 'Published' ? "Mark as Scheduled" : "Mark as Completed"}
                          >
                            <span className="material-symbols-outlined text-[12px] font-bold">
                              {draft.status === 'Published' ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar: Draft Queue (Filter unscheduled) */}
      <aside className="w-full lg:w-80 bg-surface-main flex flex-col z-10 border-t lg:border-t-0 lg:border-l border-border-subtle shadow-[-4px_0_12px_rgba(0,0,0,0.02)] min-h-[500px] lg:min-h-0 pb-20 lg:pb-0">
        <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-subtle">
          <h3 className="font-jetbrains-mono text-[12px] font-bold tracking-widest text-on-surface uppercase">Draft Queue</h3>
          <span className="bg-midnight-void text-primary-fixed text-[10px] font-jetbrains-mono px-2.5 py-0.5 rounded-full shadow-sm">{unscheduledDrafts.length} DRAFTS</span>
        </div>
        
        <div className="p-4 bg-primary/5 border-b border-primary/10">
          <p className="text-[11px] font-body-sm text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Drag drafts to the calendar days to schedule.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {unscheduledDrafts.length === 0 ? (
            <div className="text-secondary text-[12px] text-center mt-10">No unscheduled drafts left in queue</div>
          ) : unscheduledDrafts.map(draft => (
            <div 
              key={draft.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, draft.id)}
              className="bg-surface-main border border-border-subtle p-4 rounded-xl shadow-sm hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing group relative"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full bg-secondary`}></span>
                <span className="text-[10px] font-jetbrains-mono text-secondary uppercase tracking-wider">{draft.status} • {draft.platform}</span>
              </div>
              <p 
                className="text-body-sm font-medium text-on-surface line-clamp-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: draft.content.replace(/<[^>]*>/g, '').substring(0, 150) + "..." }}
              />
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

      {/* Choose Draft to Schedule Modal (Interactive Planning slots) */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-lg rounded-2xl shadow-2xl relative border border-border-subtle animate-[slide_0.3s_ease-out] flex flex-col max-h-[80vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex justify-between items-center shrink-0">
              <h3 className="font-headline-md text-[18px] text-on-surface flex flex-col">
                <span className="text-label-sm text-primary uppercase font-jetbrains-mono tracking-wider mb-1">Interactive Scheduler</span>
                <span className="font-bold font-headline-md flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[22px]">calendar_month</span>
                  Schedule to {selectedScheduleDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-secondary hover:text-primary transition-colors flex">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Scroll view */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              {unscheduledDrafts.length === 0 ? (
                <div className="text-center py-12 text-secondary flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[48px] opacity-40">assignment_turned_in</span>
                  <p className="text-body-md font-medium text-on-surface">Draft queue is completely scheduled!</p>
                  <p className="text-[12px] max-w-xs leading-relaxed">Pasted a raw transcript or manual draft, generate platform scripts, and you'll find them here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] text-secondary mb-2">Click any draft below to instantly schedule it for this date at 9:00 AM.</p>
                  {unscheduledDrafts.map(draft => (
                    <div 
                      key={draft.id}
                      onClick={async () => {
                        setShowScheduleModal(false);
                        await scheduleDraft(draft.id, selectedScheduleDate);
                      }}
                      className="p-4 bg-surface-subtle hover:bg-surface-dim rounded-xl border border-border-subtle hover:border-primary/50 transition-all flex flex-col gap-2 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-jetbrains-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          draft.platform === 'LinkedIn' ? 'bg-primary/10 text-primary' :
                          draft.platform === 'YouTube' ? 'bg-error-vibrant/10 text-error-vibrant' :
                          draft.platform === 'Instagram' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-success-vibrant/10 text-success-vibrant'
                        }`}>
                          <span className="material-symbols-outlined text-[10px]">
                            {draft.platform === 'LinkedIn' ? 'business_center' :
                             draft.platform === 'YouTube' ? 'play_circle' :
                             draft.platform === 'Instagram' ? 'photo_camera' :
                             'article'}
                          </span>
                          {draft.platform.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-secondary font-jetbrains-mono">{draft.post_type}</span>
                      </div>
                      <p 
                        className="text-body-sm text-on-surface font-medium line-clamp-2 leading-relaxed group-hover:text-primary transition-colors"
                        dangerouslySetInnerHTML={{ __html: draft.content.replace(/<[^>]*>/g, '').substring(0, 150) }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-subtle bg-surface-subtle/50 flex justify-end shrink-0 rounded-b-2xl">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg hover:bg-surface-dim transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Preview & Reschedule Management Modal */}
      {showPreviewModal && selectedDraft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-2xl rounded-2xl shadow-2xl relative border border-border-subtle animate-[slide_0.3s_ease-out] flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex justify-between items-center shrink-0">
              <h3 className="font-headline-md text-[18px] text-on-surface flex items-center gap-2">
                <span className={`text-[10px] font-jetbrains-mono font-bold px-2.5 py-1 rounded flex items-center gap-1 ${
                  selectedDraft.platform === 'LinkedIn' ? 'bg-primary/10 text-primary' :
                  selectedDraft.platform === 'YouTube' ? 'bg-error-vibrant/10 text-error-vibrant' :
                  selectedDraft.platform === 'Instagram' ? 'bg-orange-500/10 text-orange-500' :
                  'bg-success-vibrant/10 text-success-vibrant'
                }`}>
                  <span className="material-symbols-outlined text-[12px]">
                    {selectedDraft.platform === 'LinkedIn' ? 'business_center' :
                     selectedDraft.platform === 'YouTube' ? 'play_circle' :
                     selectedDraft.platform === 'Instagram' ? 'photo_camera' :
                     'article'}
                  </span>
                  {selectedDraft.platform.toUpperCase()}
                </span>
                <span className="text-[12px] font-jetbrains-mono text-secondary">
                  Scheduled for {new Date(selectedDraft.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at 9:00 AM
                </span>
              </h3>
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedDraft(null);
                }} 
                className="text-secondary hover:text-primary transition-colors flex"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content - Scroll view */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-surface-subtle/30">
              
              {/* Content Preview Box */}
              <div className="space-y-2">
                <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary block font-bold">Copywriting Copy Output</label>
                <div 
                  className="p-5 bg-surface-subtle border border-border-subtle rounded-xl text-body-md text-on-surface leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto custom-scrollbar shadow-inner"
                  dangerouslySetInnerHTML={{ __html: selectedDraft.content }}
                />
              </div>

              {/* Reschedule Date Trigger */}
              <div className="p-4 bg-surface-main border border-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h5 className="font-label-md font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                    Move or Reschedule Post
                  </h5>
                  <p className="text-[12px] text-secondary">Change the planned scheduling slot for this post.</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="date"
                    value={rescheduleDateVal}
                    onChange={(e) => {
                      setRescheduleDateVal(e.target.value);
                      handleRescheduleDraftSubmit(e.target.value);
                    }}
                    className="p-2 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm outline-none focus:border-primary transition-colors text-on-surface font-jetbrains-mono text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border-subtle bg-surface-subtle/50 flex flex-wrap justify-between gap-3 shrink-0 rounded-b-2xl">
              
              {/* Unschedule & Status Toggles (Left Action) */}
              <div className="flex gap-2">
                <button 
                  onClick={handleUnscheduleDraft}
                  className="px-4 py-2 bg-error/10 border border-error/20 text-error font-label-sm rounded-lg hover:bg-error/20 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Unschedule
                </button>
                <button 
                  onClick={async (e) => {
                    await toggleDraftStatus(e, selectedDraft);
                    setSelectedDraft(prev => ({ ...prev, status: prev.status === 'Published' ? 'Scheduled' : 'Published' }));
                  }}
                  className={`px-4 py-2 border font-label-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                    selectedDraft.status === 'Published' 
                      ? 'bg-success-vibrant/20 border-success-vibrant/30 text-success-vibrant' 
                      : 'bg-surface-subtle border-border-subtle text-secondary hover:bg-surface-dim'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {selectedDraft.status === 'Published' ? 'check_circle' : 'unpublished'}
                  </span>
                  {selectedDraft.status === 'Published' ? 'Completed' : 'Mark Completed'}
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedDraft(null);
                    router.push(`/output?capture_id=${selectedDraft.capture_id || ''}`);
                  }}
                  className="px-4 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg hover:bg-surface-dim transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Edit in Workspace
                </button>
                <button 
                  onClick={handleCopyContent}
                  className="px-5 py-2 bg-midnight-void text-primary-fixed font-label-sm font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isCopied ? 'check' : 'content_copy'}
                  </span>
                  {isCopied ? 'Copied!' : 'Copy Post Content'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
