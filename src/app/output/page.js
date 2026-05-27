"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";

function OutputContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captureId = searchParams.get("capture_id");
  
  const [activeTab, setActiveTab] = useState('linkedin');
  const [linkedinSubtab, setLinkedinSubtab] = useState('post');
  const [isEditing, setIsEditing] = useState(false);
  
  const [contentValues, setContentValues] = useState({});
  const [contentHistory, setContentHistory] = useState({});
  const currentContentKey = activeTab === 'linkedin' ? `linkedin-${linkedinSubtab}` : activeTab;
  const contentValue = contentValues[currentContentKey] || "";
  
  const setContentValue = (val) => {
    setContentValues(prev => ({ ...prev, [currentContentKey]: val }));
  };

  const handleUndo = () => {
    const hist = contentHistory[currentContentKey] || [];
    if (hist.length > 1) {
      const newHist = hist.slice(0, -1);
      const previousText = newHist[newHist.length - 1];
      setContentHistory(prev => ({ ...prev, [currentContentKey]: newHist }));
      setContentValues(prev => ({ ...prev, [currentContentKey]: previousText }));
    }
  };
  
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [captureData, setCaptureData] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bank Modal State
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTab, setBankTab] = useState("ideas"); // ideas or campaigns
  const [bankCaptures, setBankCaptures] = useState([]);
  const [bankDrafts, setBankDrafts] = useState([]);
  const [isBankLoading, setIsBankLoading] = useState(false);

  const openBankModal = async () => {
    setShowBankModal(true);
    setIsBankLoading(true);
    try {
      const { data: caps } = await supabase.from('captures').select('*').order('created_at', { ascending: false }).limit(20);
      const { data: drs } = await supabase.from('drafts').select('*').order('created_at', { ascending: false }).limit(20);
      if (caps) setBankCaptures(caps);
      if (drs) setBankDrafts(drs);
    } catch (e) {
      console.error("Error loading vault modal data:", e);
    } finally {
      setIsBankLoading(false);
    }
  };

  const platforms = [
    { id: 'linkedin', label: 'LinkedIn', icon: 'business_center' },
    { id: 'youtube', label: 'YouTube Shorts', icon: 'play_circle' },
    { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { id: 'substack', label: 'Substack/Blog', icon: 'article' }
  ];

  const linkedinTypes = [
    { id: 'post', label: 'Standard Post' },
    { id: 'carousel', label: 'Carousel Outline' },
    { id: 'poll', label: 'Poll Idea' }
  ];

  useEffect(() => {
    if (!captureId) {
      setIsEditing(true);
      return;
    }

    async function loadData() {
      const { data: cap } = await supabase.from('captures').select('*').eq('id', captureId).single();
      if (cap) setCaptureData(cap);

      const { data: sessions } = await supabase.from('interview_sessions').select('*').eq('capture_id', captureId).order('created_at', { ascending: false }).limit(1);
      const session = sessions?.[0];
      if (session) {
        setSessionMessages(session.messages);
      }
    }
    loadData();
  }, [captureId]);

  useEffect(() => {
    if (captureId && sessionMessages.length > 0 && Object.keys(contentValues).length === 0 && !isGenerating) {
      generateContent(activeTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMessages]);

  const generateContent = async (platformId, isABTest = false) => {
    if (captureId && (!sessionMessages || sessionMessages.length === 0)) {
      toast.error("No conversation history found! Please chat with Claude first.");
      return;
    }

    let sourceMaterial = "";
    if (!captureId) {
      if (contentValue && contentValue.trim() !== "") {
        sourceMaterial = contentValue;
      } else {
        const fallbackKey = Object.keys(contentValues).find(k => contentValues[k] && contentValues[k].trim() !== "");
        if (fallbackKey) {
          sourceMaterial = contentValues[fallbackKey];
        } else {
          toast.error("Please write a manual draft first before polishing or repurposing!");
          return;
        }
      }
    }

    setIsGenerating(true);

    // Fetch Active Persona Profile
    let personaContext = "You are an expert content generation assistant.";
    let llmProvider = "openrouter";
    let llmModel = "anthropic/claude-3-haiku";
    let llmApiKey = "";

    try {
      const { data: profile, error } = await supabase.from('user_settings').select('*').eq('is_active', true).single();
      if (profile && !error) {
        llmProvider = profile.llm_provider || "openrouter";
        llmModel = profile.llm_model || "anthropic/claude-3-haiku";
        llmApiKey = profile.llm_api_key || "";
        
        const trainingStr = (profile.training_data || []).map((t, i) => `REFERENCE ${i+1}:\n${t.content}`).join("\n\n");
        personaContext = `You are adopting the following Persona:
Name: ${profile.user_name}
Role: ${profile.primary_role}
Target Audience: ${profile.target_audience}
Goal/Positioning: ${profile.positioning_statement}

Voice Sliders:
Tone: ${profile.tone}, Rawness: ${profile.rawness}, Density: ${profile.density}

TRAINING DATA / STYLE REFERENCES:
${trainingStr || "No specific training data provided."}
`;
      }
    } catch (e) {
      console.error("Error fetching persona profile:", e);
    }
    
    let platformContext = "";
    if (platformId === 'linkedin') {
      platformContext = `Write a high-converting LinkedIn post. Include a catchy hook, well-spaced body paragraphs, and a clear call-to-action. Format: ${linkedinSubtab}.`;
    } else if (platformId === 'youtube') {
      platformContext = "Write a fast-paced, 60-second YouTube Shorts script. Include [Hook], [Body/Value], and [Call to Action].";
    } else if (platformId === 'instagram') {
      platformContext = "Write an Instagram caption. Make it engaging, visually spaced, and include relevant hashtags at the bottom.";
    } else if (platformId === 'substack') {
      platformContext = "Write a comprehensive newsletter or blog post. Include a headline, introduction, detailed sections, and conclusion.";
    }

    if (isABTest) {
      platformContext += `\n\n[GROWTH PILLAR ACTIVATED: HOOK A/B ARCHITECT]
Provide exactly 3 scroll-stopping hook options at the very top of your output (Option A, Option B, Option C) utilizing different psychological hooks (Curiosity, Benefit, targeted proof). Then follow with the full post body copy below. Make hooks extremely ready-to-use.`;
    }

    let prompt = "";
    if (captureId) {
      const historyStr = sessionMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      prompt = `You are an expert content creator. Based on the following interview transcript with the creator, generate content for the specified platform.\n\nPLATFORM INSTRUCTIONS:\n${platformContext}\n\nINTERVIEW TRANSCRIPT:\n${historyStr}\n\nCRITICAL: Return ONLY the raw content. DO NOT include any conversational filler. Start immediately with the hook options or first line of the content.`;
    } else {
      prompt = `You are an expert content creator. The user has written a manual draft. Your task is to polish, improve, or repurpose it for the specified platform.\n\nPLATFORM INSTRUCTIONS:\n${platformContext}\n\nSOURCE MATERIAL DRAFT:\n${sourceMaterial}\n\nCRITICAL: Return ONLY the raw content. DO NOT include any conversational filler. Start immediately with the hook options or first line of the content.`;
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          systemContext: personaContext,
          provider: llmProvider,
          model: llmModel,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const key = platformId === 'linkedin' ? `linkedin-${linkedinSubtab}` : platformId;
      
      const formatHtmlText = (text) => {
        if (!text) return "";
        if (text.trim().startsWith("<p>") || text.trim().startsWith("<div>") || text.includes("</p>")) {
          return text;
        }
        return text
          .split(/\n{2,}/)
          .map(para => `<p>${para.trim().replace(/\n/g, "<br />")}</p>`)
          .join("");
      };
      
      const formattedText = formatHtmlText(data.result);
      
      setContentValues(prev => ({ ...prev, [key]: formattedText }));
      setContentHistory(prev => {
        const hist = prev[key] || [];
        return { ...prev, [key]: [...hist, formattedText] };
      });
      
      setIsEditing(false);
      setDraftId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate content: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contentValue);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleEditToggle = async () => {
    setIsEditing(!isEditing);
  };

  const saveDraft = async () => {
    if (!contentValue.trim()) return;
    setIsSaving(true);
    
    // Map platform strictly to database CHECK constraints ('LinkedIn', 'Substack', 'YouTube', 'Instagram', 'Facebook')
    const rawPlatform = platforms.find(p => p.id === activeTab)?.label || 'LinkedIn';
    let mappedPlatform = "LinkedIn";
    const uPlat = rawPlatform.toUpperCase();
    if (uPlat.includes("LINKEDIN")) mappedPlatform = "LinkedIn";
    else if (uPlat.includes("SUBSTACK") || uPlat.includes("BLOG")) mappedPlatform = "Substack";
    else if (uPlat.includes("YOUTUBE") || uPlat.includes("SHORT")) mappedPlatform = "YouTube";
    else if (uPlat.includes("INSTAGRAM") || uPlat.includes("REEL")) mappedPlatform = "Instagram";
    else if (uPlat.includes("FACEBOOK")) mappedPlatform = "Facebook";

    const draftData = {
      content: contentValue,
      platform: mappedPlatform,
      status: 'Draft',
      post_type: 'Text Post'
    };

    if (captureId) draftData.capture_id = captureId;

    try {
      if (draftId) {
        const { error } = await supabase.from('drafts').update(draftData).eq('id', draftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('drafts').insert([draftData]).select().single();
        if (error) throw error;
        if (data) setDraftId(data.id);
      }
      toast.success("Draft saved successfully to calendar!");
    } catch (error) {
      console.error("Save error", error);
      toast.error("Error saving draft: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-gutter-desktop py-8 md:py-12 space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-surface-main p-6 rounded-2xl border border-border-subtle shadow-sm">
        <div>
          <span className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-2 block">Copywriting Workspace</span>
          <h1 className="text-headline-md md:text-headline-lg font-headline-xl text-on-surface">
            {captureId && captureData ? captureData.transcript.substring(0, 50) + "..." : "Repurposing Engine"}
          </h1>
          <p className="text-body-sm text-secondary mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">{captureId ? 'psychology' : 'edit_document'}</span>
            {captureId ? 'Active Conversation Blueprint' : 'Manual Draft Workspace'} • {new Date().toLocaleDateString()}
          </p>
          <button onClick={openBankModal} className="mt-4 px-4 py-2 bg-surface-subtle border border-primary/20 text-primary font-label-sm rounded-lg flex items-center gap-2 hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            Pull from Vault
          </button>
        </div>
      </div>

      {/* Workspace Card */}
      <div className="bg-surface-main border border-border-subtle rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Top Platform Tabs */}
        <div className="flex overflow-x-auto custom-scrollbar border-b border-border-subtle bg-surface-subtle">
          {platforms.map(platform => (
            <button
              key={platform.id}
              onClick={() => {
                setActiveTab(platform.id);
              }}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-6 py-4 font-label-sm whitespace-nowrap transition-colors border-b-2 disabled:opacity-50 ${
                activeTab === platform.id 
                  ? 'border-primary text-primary bg-surface-main' 
                  : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-dim/50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{platform.icon}</span>
              {platform.label}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 flex-1 flex flex-col">
          
          {/* LinkedIn Sub-Tabs */}
          {activeTab === 'linkedin' && captureId && (
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {linkedinTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setLinkedinSubtab(type.id);
                  }}
                  disabled={isGenerating}
                  className={`px-4 py-1.5 whitespace-nowrap rounded-full text-[12px] font-jetbrains-mono tracking-wide transition-all ${
                    linkedinSubtab === type.id
                      ? 'bg-midnight-void text-primary-fixed'
                      : 'bg-surface-subtle text-secondary hover:bg-surface-dim border border-border-subtle'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 min-h-[300px] flex flex-col relative">
            {isGenerating ? (
              <div className="w-full h-full min-h-[300px] bg-surface-subtle border border-border-subtle rounded-xl p-6 flex flex-col items-center justify-center text-secondary gap-4">
                <span className="material-symbols-outlined text-[48px] text-primary animate-pulse">psychology</span>
                <p className="font-label-md text-primary animate-pulse">Generating your {platforms.find(p => p.id === activeTab)?.label} content...</p>
              </div>
            ) : isEditing ? (
              <RichTextEditor 
                content={contentValue}
                onChange={setContentValue}
                placeholder={`Write your ${platforms.find(p => p.id === activeTab)?.label} post here...`}
              />
            ) : (
              <div 
                className="w-full h-full min-h-[300px] bg-surface-subtle/50 border border-border-subtle rounded-xl p-6 text-body-md text-on-surface whitespace-pre-wrap tiptap-editor"
                dangerouslySetInnerHTML={{ __html: contentValue || `<p>No content generated yet. Click 'Generate Content' or 'Hook A/B Test' to write your ${platforms.find(p => p.id === activeTab)?.label} post.</p>` }}
              />
            )}
          </div>

          {/* Subtle Saved Status Pipeline Banner */}
          {draftId && (
            <div className="mt-4 p-3 bg-success-vibrant/5 border border-success-vibrant/20 rounded-xl flex items-center justify-between text-success-vibrant animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="text-[12px] font-jetbrains-mono uppercase tracking-wider font-bold">Pipeline Linked • Saved as Draft</span>
              </div>
              <button 
                onClick={() => router.push('/calendar')} 
                className="text-[12px] font-label-sm text-primary hover:underline flex items-center gap-1 transition-all"
              >
                Open Content Calendar
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border-subtle w-full">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Generate standard Button */}
              <button 
                onClick={() => generateContent(activeTab, false)} 
                disabled={isGenerating}
                className="px-5 py-2.5 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg flex items-center justify-center gap-2 hover:bg-surface-dim transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">magic_button</span>
                Generate Content
              </button>

              {/* Hook A/B Architect Button (Growth Pillar 1!) */}
              <button 
                onClick={() => generateContent(activeTab, true)} 
                disabled={isGenerating}
                className="px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 font-label-sm rounded-lg flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Hook A/B Test
              </button>

              <button 
                onClick={handleEditToggle}
                disabled={isGenerating || isSaving}
                className={`px-5 py-2.5 border font-label-sm rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-surface-main text-on-surface border-border-subtle hover:bg-surface-subtle`}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                {isEditing ? 'Save Edits' : 'Edit Output'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button 
                onClick={saveDraft}
                disabled={isGenerating || !contentValue || isSaving}
                className="px-5 py-2.5 bg-success-vibrant text-midnight-void font-label-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                {isSaving ? 'Saving...' : draftId ? 'Update Calendar' : 'Send to Calendar'}
              </button>
              
              <button 
                onClick={handleCopy}
                disabled={isGenerating || !contentValue}
                className="px-5 py-2.5 bg-midnight-void text-primary-fixed font-label-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isCopied ? 'check' : 'content_copy'}
                </span>
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Pull from Bank Modal (Sleek sub-tab select layout) */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-lg rounded-2xl shadow-2xl relative border border-border-subtle animate-[slide_0.3s_ease-out] flex flex-col max-h-[80vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex justify-between items-center shrink-0">
              <h3 className="font-headline-md text-[20px] text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">account_balance</span>
                Pull from Idea Vault
              </h3>
              <button onClick={() => setShowBankModal(false)} className="text-secondary hover:text-primary transition-colors flex">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Sub-Tabs Selector */}
            <div className="flex bg-surface-subtle border-b border-border-subtle shrink-0">
              <button 
                onClick={() => setBankTab("ideas")}
                className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold flex items-center justify-center gap-1.5 ${bankTab === "ideas" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
              >
                <span className="material-symbols-outlined text-[16px]">notes</span> Raw Ideas
              </button>
              <button 
                onClick={() => setBankTab("campaigns")}
                className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold flex items-center justify-center gap-1.5 ${bankTab === "campaigns" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
              >
                <span className="material-symbols-outlined text-[16px]">rocket_launch</span> Campaign Blueprints
              </button>
            </div>

            {/* Modal List Viewport */}
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
              {isBankLoading ? (
                <div className="text-center py-10 text-secondary">Loading your bank...</div>
              ) : bankTab === "ideas" ? (
                bankCaptures.length === 0 ? (
                  <div className="text-center py-10 text-secondary">No raw captures found in your vault.</div>
                ) : (
                  bankCaptures.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setShowBankModal(false);
                        router.push(`/output?capture_id=${item.id}`);
                      }}
                      className="p-4 bg-surface-subtle hover:bg-surface-dim rounded-xl cursor-pointer border border-border-subtle hover:border-primary/50 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-jetbrains-mono font-bold px-2 py-0.5 rounded w-fit ${item.type === 'Voice Note' ? 'bg-blue-50/10 text-blue-500' : 'bg-orange-50/10 text-orange-500'}`}>
                          {item.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-secondary font-jetbrains-mono">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-body-sm font-medium text-on-surface line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">{item.transcript}</p>
                    </div>
                  ))
                )
              ) : (
                bankDrafts.length === 0 ? (
                  <div className="text-center py-10 text-secondary">No campaign strategy drafts found.</div>
                ) : (
                  bankDrafts.map(draft => (
                    <div 
                      key={draft.id} 
                      onClick={() => {
                        const formatHtmlText = (text) => {
                          if (!text) return "";
                          if (text.trim().startsWith("<p>") || text.trim().startsWith("<div>") || text.includes("</p>")) {
                            return text;
                          }
                          return text
                            .split(/\n{2,}/)
                            .map(para => `<p>${para.trim().replace(/\n/g, "<br />")}</p>`)
                            .join("");
                        };
                        setContentValues(prev => ({
                          ...prev,
                          [currentContentKey]: formatHtmlText(draft.content)
                        }));
                        setDraftId(draft.id);
                        setShowBankModal(false);
                        setIsEditing(false);
                        toast.success("Loaded campaign blueprint into editor!");
                      }}
                      className="p-4 bg-surface-subtle hover:bg-surface-dim rounded-xl cursor-pointer border border-border-subtle hover:border-primary/50 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-jetbrains-mono font-bold px-2 py-0.5 rounded w-fit bg-primary/10 text-primary uppercase">
                          {draft.platform.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-secondary font-jetbrains-mono">{draft.post_type} • {new Date(draft.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-body-sm font-semibold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{draft.post_type || 'Social Draft'}</h4>
                      <p className="text-[12px] text-secondary line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: draft.content.substring(0, 150) + "..." }} />
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function OutputPage() {
  return (
    <main className="md:ml-64 min-h-screen pt-16 bg-surface-subtle overflow-y-auto pb-32">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-secondary font-jetbrains-mono pt-20">Loading Engine...</div>}>
        <OutputContent />
      </Suspense>
    </main>
  );
}
