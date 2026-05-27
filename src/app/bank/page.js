"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function BankPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  const filters = ["All", "Voice Notes", "Text Ideas", "Generated Posts"];

  useEffect(() => {
    async function loadData() {
      // Fetch captures
      const { data: capturesData } = await supabase.from('captures').select('*').order('created_at', { ascending: false });
      
      // Fetch drafts (if any)
      const { data: draftsData } = await supabase.from('drafts').select('*').order('created_at', { ascending: false });

      const formattedCaptures = (capturesData || []).map(c => ({
        id: c.id,
        type: c.type,
        icon: c.type === 'Voice Note' ? 'mic' : 'edit_note',
        date: new Date(c.created_at).toLocaleDateString(),
        topic: 'Captured Thought',
        platform: 'None',
        excerpt: c.transcript,
        color: c.type === 'Voice Note' ? 'bg-blue-500' : 'bg-orange-500',
        bgLight: c.type === 'Voice Note' ? 'bg-blue-50' : 'bg-orange-50',
        border: c.type === 'Voice Note' ? 'border-blue-100' : 'border-orange-100',
        onClick: () => router.push(`/chat?capture_id=${c.id}`)
      }));

      const formattedDrafts = (draftsData || []).map(d => ({
        id: `draft-${d.id}`,
        type: 'Generated Post',
        icon: 'smart_display',
        date: new Date(d.created_at).toLocaleDateString(),
        topic: d.post_type,
        platform: d.platform,
        excerpt: d.content,
        color: 'bg-primary',
        bgLight: 'bg-primary/5',
        border: 'border-primary/20',
        onClick: () => router.push(`/output?capture_id=${d.capture_id}`)
      }));

      // Sort all by most recent
      const allItems = [...formattedCaptures, ...formattedDrafts].sort((a, b) => new Date(b.date) - new Date(a.date));
      setItems(allItems);
      setIsLoading(false);
    }
    loadData();
  }, [router]);

  const filteredItems = items.filter(item => {
    const matchesFilter = activeFilter === "All" 
      || (activeFilter === "Voice Notes" && item.type === "Voice Note")
      || (activeFilter === "Text Ideas" && item.type === "Text Idea")
      || (activeFilter === "Generated Posts" && item.type === "Generated Post");

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (item.excerpt && item.excerpt.toLowerCase().includes(searchLower)) ||
      (item.topic && item.topic.toLowerCase().includes(searchLower)) ||
      (item.platform && item.platform.toLowerCase().includes(searchLower));

    return matchesFilter && matchesSearch;
  });

  return (
    <main className="md:ml-64 pt-24 md:pt-28 pb-12 min-h-screen bg-background px-4 md:px-6 lg:px-10">
      
      {/* Header & Search */}
      <div className="max-w-5xl mx-auto mb-8">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Idea Bank & History</h1>
        <p className="text-body-lg text-secondary mb-8">Your searchable vault of past captures, transcripts, and generated drafts.</p>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-secondary group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-main border-2 border-border-subtle rounded-2xl py-4 pl-12 pr-4 text-body-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            placeholder="Search transcripts, ideas, or topics..."
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <button className="bg-surface-subtle border border-border-subtle px-3 py-1.5 rounded-lg text-label-sm font-jetbrains-mono text-secondary hover:text-on-surface transition-colors">
              CMD K
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-wrap gap-2">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-label-sm font-label-md transition-all border ${
              activeFilter === filter 
                ? 'bg-primary text-on-primary border-primary shadow-md' 
                : 'bg-surface-main text-secondary border-border-subtle hover:border-primary/50 hover:text-primary'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Vault Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-secondary">Loading vault data...</div>
        ) : filteredItems.map(item => (
          <div 
            key={item.id} 
            onClick={item.onClick}
            className={`flex flex-col bg-surface-main border ${item.border} rounded-2xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-1 duration-300`}
          >
            {/* Card Header */}
            <div className={`p-4 ${item.bgLight} border-b ${item.border} flex justify-between items-start`}>
              <div className="flex items-center gap-2">
                <div className={`${item.color} text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-sm`}>
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-jetbrains-mono font-bold uppercase tracking-wider text-on-surface">{item.type}</p>
                  <p className="text-[11px] text-secondary">{item.date}</p>
                </div>
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-main border border-border-subtle text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary">
                <span className="material-symbols-outlined text-[16px]">more_horiz</span>
              </button>
            </div>

            {/* Card Body */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex gap-2 mb-3">
                <span className="bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded text-[9px] font-jetbrains-mono text-secondary uppercase tracking-wide">
                  {item.topic}
                </span>
                {item.platform !== "None" && (
                  <span className="bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded text-[9px] font-jetbrains-mono text-secondary uppercase tracking-wide">
                    {item.platform}
                  </span>
                )}
              </div>
              
              <p className="text-body-sm text-on-surface line-clamp-4 leading-relaxed mb-4">
                "{item.excerpt}"
              </p>

              <div className="mt-auto pt-4 border-t border-border-subtle flex justify-between items-center">
                <button className="flex items-center gap-1.5 text-label-sm font-label-md text-primary hover:text-primary-hover transition-colors group/btn">
                  <span className="material-symbols-outlined text-[16px] group-hover/btn:rotate-180 transition-transform duration-500">sync</span>
                  Reactivate
                </button>
                <button className="text-secondary hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                </button>
              </div>
            </div>

          </div>
        ))}

        {!isLoading && items.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-surface-main border border-border-subtle rounded-3xl mx-2 shadow-sm">
            <svg className="w-20 h-20 mb-6 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h3 className="font-headline-md text-on-surface mb-2 text-[20px]">Your Vault is Empty</h3>
            <p className="text-body-md text-secondary">Start capturing voice notes or text ideas to fill your bank.</p>
          </div>
        )}

        {!isLoading && items.length > 0 && filteredItems.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-surface-subtle border-2 border-dashed border-border-subtle rounded-3xl">
            <span className="material-symbols-outlined text-[48px] text-secondary mb-4 opacity-50">search_off</span>
            <h3 className="font-headline-sm text-on-surface mb-2">No results found</h3>
            <p className="text-body-sm text-secondary">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>

    </main>
  );
}
