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
  const [contentHistory, setContentHistory] = useState({}); // Stores array of AI generations for undo
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
  const [bankItems, setBankItems] = useState([]);
  const [isBankLoading, setIsBankLoading] = useState(false);

  // Launch Campaign State
  const [activeCard, setActiveCard] = useState(1);
  const [isFree, setIsFree] = useState(false);
  const [launchForm, setLaunchForm] = useState({
    projectName: "",
    primaryGoal: "Pre-order Sales",
    solution: "",
    problem: "",
    audience: ""
  });
  const [isGeneratingLaunch, setIsGeneratingLaunch] = useState(false);
  const [launchSequence, setLaunchSequence] = useState([]);
  const [marketFitScore, setMarketFitScore] = useState(null);
  const [isExportingLaunch, setIsExportingLaunch] = useState(false);

  const handleGenerateLaunchSequence = async () => {
    setIsGeneratingLaunch(true);
    
    let llmProvider = "openrouter";
    let llmModel = "anthropic/claude-3-haiku";
    let llmApiKey = "";

    try {
      const { data: profile } = await supabase.from('user_settings').select('*').eq('is_active', true).single();
      if (profile) {
        llmProvider = profile.llm_provider || "openrouter";
        llmModel = profile.llm_model || "anthropic/claude-3-haiku";
        llmApiKey = profile.llm_api_key || "";
      }
    } catch (e) {}

    const prompt = `You are an expert product launch strategist.
Based on the following product details, generate a 4-part launch sequence (The Hook, Logic, Social Proof, Offer).
Also evaluate the Market Fit Score based on the audience.

Project Name: ${launchForm.projectName}
Primary Goal: ${launchForm.primaryGoal}
Pricing Model: ${isFree ? 'Free Resource' : 'Paid Product'}
What it does: ${launchForm.solution}
What problem it solves: ${launchForm.problem}
Target Audience: ${launchForm.audience}

RETURN A VALID JSON OBJECT ONLY! Format exactly like this:
{
  "marketFit": {
    "score": "92%",
    "description": "Short explanation of the score"
  },
  "sequence": [
    {
      "id": 1,
      "title": "Title of Part 1",
      "description": "Brief description of the content for Part 1",
      "badges": ["EMAIL", "LINKEDIN"]
    }
  ]
}
Make sure sequence array has exactly 4 items.`;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          systemContext: "You are a backend JSON generator. Return ONLY valid raw JSON without any markdown formatting.",
          provider: llmProvider,
          model: llmModel,
          apiKey: llmApiKey
        }),
      });
      const data = await response.json();
      
      let parsedResponse;
      try {
        let cleanText = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedResponse = JSON.parse(cleanText);
      } catch (e) {
        throw new Error("AI did not return valid JSON.");
      }
      
      setLaunchSequence(parsedResponse.sequence || []);
      setMarketFitScore(parsedResponse.marketFit || { score: "90%", description: "Good market fit." });
      if (parsedResponse.sequence && parsedResponse.sequence.length > 0) {
        setActiveCard(parsedResponse.sequence[0].id);
      }
      
    } catch (error) {
      toast.error("Error generating sequence: " + error.message);
    } finally {
      setIsGeneratingLaunch(false);
    }
  };

  const handleExportLaunch = async () => {
    if (launchSequence.length === 0) return;
    setIsExportingLaunch(true);
    try {
      const draftData = {
        title: `Launch Sequence: ${launchForm.projectName || 'New Campaign'}`,
        content: JSON.stringify(launchSequence, null, 2),
        platform: 'Other',
        status: 'Draft',
        post_type: 'Campaign Sequence'
      };
      await supabase.from('drafts').insert([draftData]);
      toast.success("Sequence successfully exported to Drafts Calendar!");
    } catch(e) {
      toast.error("Error exporting");
    } finally {
      setIsExportingLaunch(false);
    }
  };

  const openBankModal = async () => {
    setShowBankModal(true);
    setIsBankLoading(true);
    const { data } = await supabase.from('captures').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setBankItems(data);
    setIsBankLoading(false);
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
      // Manual Mode
      setIsEditing(true);
      return;
    }

    async function loadData() {
      // 1. Get the capture
      const { data: cap } = await supabase.from('captures').select('*').eq('id', captureId).single();
      if (cap) setCaptureData(cap);

      // 2. Get the session
      const { data: sessions } = await supabase.from('interview_sessions').select('*').eq('capture_id', captureId).order('created_at', { ascending: false }).limit(1);
      const session = sessions?.[0];
      if (session) {
        setSessionMessages(session.messages);
      }
    }
    loadData();
  }, [captureId]);

  // When tab changes, if we have a session, maybe auto-generate if empty? 
  // Let's just let the user hit generate for now, or auto-trigger it on first load.
  useEffect(() => {
    // Auto-generate ONLY on the initial load if nothing has been generated yet
    if (captureId && sessionMessages.length > 0 && Object.keys(contentValues).length === 0 && !isGenerating) {
      generateContent(activeTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMessages]);

  const generateContent = async (platformId) => {
    if (captureId && (!sessionMessages || sessionMessages.length === 0)) {
      toast.error("No conversation history found! Please chat with Claude first.");
      return;
    }

    let sourceMaterial = "";
    if (!captureId) {
      if (contentValue && contentValue.trim() !== "") {
        sourceMaterial = contentValue; // Polish current tab
      } else {
        // Try to find content from another tab to repurpose
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

Voice Dynamics Sliders (Scale 0-100):
Tone (0=Clinical/Analytical, 100=Emotive/Passionate): ${profile.tone}
Rawness (0=Polished/Editorial, 100=Rough/Authentic/Vulnerable): ${profile.rawness}
Density (0=Simple/Beginner, 100=Complex/Expert): ${profile.density}

TRAINING DATA / STYLE REFERENCES:
The following are examples of successful posts in this persona's style. Analyze their sentence structure, pacing, hook formatting, and overall vibe, and mimic this exact style perfectly in your output:
${trainingStr || "No specific training data provided. Rely on the role and voice dynamics above."}
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

    let prompt = "";
    if (captureId) {
      const historyStr = sessionMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      prompt = `You are an expert content creator. Based on the following interview transcript with the creator, generate content for the specified platform.\n\nPLATFORM INSTRUCTIONS:\n${platformContext}\n\nINTERVIEW TRANSCRIPT:\n${historyStr}\n\nCRITICAL: Return ONLY the raw content. DO NOT include any conversational filler, meta-commentary, or introductory phrases (e.g. "Here is your post:", "Sure!"). Start immediately with the headline or first line of the content.`;
    } else {
      prompt = `You are an expert content creator. The user has written a manual draft. Your task is to polish, improve, or repurpose it for the specified platform.\n\nPLATFORM INSTRUCTIONS:\n${platformContext}\n\nSOURCE MATERIAL DRAFT:\n${sourceMaterial}\n\nCRITICAL: Return ONLY the raw content. DO NOT include any conversational filler, meta-commentary, or introductory phrases (e.g. "Here is your post:", "Sure!"). Start immediately with the headline or first line of the content.`;
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
          apiKey: llmApiKey
        }),
      });
      const data = await response.json();
      
      const key = platformId === 'linkedin' ? `linkedin-${linkedinSubtab}` : platformId;
      const newText = data.result;
      
      setContentValues(prev => ({ ...prev, [key]: newText }));
      setContentHistory(prev => {
        const hist = prev[key] || [];
        return { ...prev, [key]: [...hist, newText] };
      });
      
      setIsEditing(false);
      setDraftId(null); // Reset draft ID so it saves as a new draft if changed
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate content.");
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
    
    const draftData = {
      title: captureData ? `Draft from: ${captureData.transcript.substring(0, 30)}...` : `Manual Draft - ${new Date().toLocaleDateString()}`,
      content: contentValue,
      platform: platforms.find(p => p.id === activeTab)?.label || 'Other',
      status: 'Draft',
      statusColor: 'bg-secondary',
      post_type: 'Text Post'
    };

    if (captureId) draftData.capture_id = captureId;

    try {
      if (draftId) {
        await supabase.from('drafts').update(draftData).eq('id', draftId);
      } else {
        const { data } = await supabase.from('drafts').insert([draftData]).select().single();
        if (data) setDraftId(data.id);
      }
    } catch (error) {
      console.error("Save error", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-gutter-desktop py-8 md:py-12 space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-surface-main p-6 rounded-2xl border border-border-subtle shadow-sm">
        <div>
          <span className="text-[10px] md:text-label-sm font-jetbrains-mono text-secondary uppercase tracking-wider mb-2 block">Source Material</span>
          <h1 className="text-headline-md md:text-headline-lg font-headline-xl text-on-surface">
            {captureId && captureData ? captureData.transcript.substring(0, 50) + "..." : "Manual Draft"}
          </h1>
          <p className="text-body-sm text-secondary mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">{captureId ? 'psychology' : 'edit_document'}</span>
            {captureId ? 'Interview Engine Capture' : 'Manual Draft'} • {new Date().toLocaleDateString()}
          </p>
          {!captureId && (
            <button onClick={openBankModal} className="mt-4 px-4 py-2 bg-surface-subtle border border-primary/20 text-primary font-label-sm rounded-lg flex items-center gap-2 hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
              Pull from Idea Bank
            </button>
          )}
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
          
          {/* LinkedIn Sub-Tabs (Conditional) */}
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
                dangerouslySetInnerHTML={{ __html: contentValue || `<p>No content generated yet. Click 'Generate Content' to write your ${platforms.find(p => p.id === activeTab)?.label} post.</p>` }}
              />
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-6 border-t border-border-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-secondary w-full lg:w-auto mb-4 lg:mb-0">
              {draftId && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-jetbrains-mono bg-success-vibrant/20 text-success-vibrant px-2 py-1 rounded">Saved to Drafts</span>
                  <button onClick={() => router.push('/calendar')} className="text-[12px] text-primary hover:underline flex items-center gap-1 transition-all"><span className="material-symbols-outlined text-[14px]">arrow_forward</span> View in Calendar</button>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap w-full lg:w-auto gap-3">
              {/* Undo Button */}
              {(contentHistory[currentContentKey]?.length > 1) && (
                <button 
                  onClick={handleUndo}
                  disabled={isGenerating}
                  className="flex-1 lg:flex-none px-4 lg:px-6 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg flex items-center justify-center gap-2 hover:bg-surface-dim transition-colors disabled:opacity-50"
                  title="Undo last generation"
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                  Undo
                </button>
              )}

              {/* Generate / Regenerate Button */}
              <button 
                onClick={() => generateContent(activeTab)} 
                disabled={isGenerating}
                className="flex-1 lg:flex-none px-4 lg:px-6 py-2 bg-primary/10 text-primary border border-primary/20 font-label-sm rounded-lg flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">{isGenerating ? 'hourglass_empty' : 'magic_button'}</span>
                {isGenerating ? (captureId ? 'Generating...' : 'Polishing...') : contentValue ? (captureId ? 'Regenerate' : 'Polish Draft') : (captureId ? 'Generate Content' : 'Repurpose Draft')}
              </button>

              <button 
                onClick={handleEditToggle}
                disabled={isGenerating || isSaving}
                className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 border font-label-sm rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-surface-main text-on-surface border-border-subtle hover:bg-surface-subtle`}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                {isEditing ? 'Save Edits' : 'Edit Output'}
              </button>
              
              <button 
                onClick={saveDraft}
                disabled={isGenerating || !contentValue || isSaving}
                className="flex-1 lg:flex-none px-4 lg:px-6 py-2 bg-success-vibrant text-midnight-void font-label-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                {isSaving ? 'Saving...' : draftId ? 'Update Calendar' : 'Send to Calendar'}
              </button>
              
              <button 
                onClick={handleCopy}
                disabled={isGenerating || !contentValue}
                className="flex-1 lg:flex-none px-4 lg:px-6 py-2 bg-midnight-void text-primary-fixed font-label-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
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
      
      {/* Launch Campaign Section */}
      <section id="launch-campaign" className="mt-16 pt-12 border-t border-border-subtle scroll-mt-20">
        <div className="mb-8 md:mb-10 mt-2 md:mt-0">
          <h2 className="font-headline-lg text-[24px] md:text-headline-lg font-bold text-on-surface mb-2">Build Launch Campaign</h2>
          <p className="font-body-md text-body-sm md:text-body-md text-secondary max-w-2xl">
            Define your educational product and generate a structured 4-part launch sequence optimized for your audience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Multi-column Form Layout */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-surface-main border border-border-subtle p-5 md:p-8 rounded-2xl shadow-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Project Architecture
              </h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-label-sm md:text-label-md font-label-md text-secondary mb-2">Project Name</label>
                    <input value={launchForm.projectName} onChange={e => setLaunchForm({...launchForm, projectName: e.target.value})} className="w-full px-4 py-3 bg-surface-subtle border border-border-subtle rounded-lg font-body-sm md:font-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="e.g. AI-Powered Curriculum Masterclass" type="text"/>
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="block text-label-sm md:text-label-md font-label-md text-secondary mb-2">Primary Goal</label>
                    <select value={launchForm.primaryGoal} onChange={e => setLaunchForm({...launchForm, primaryGoal: e.target.value})} className="w-full px-4 py-3 bg-surface-subtle border border-border-subtle rounded-lg font-body-sm md:font-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none appearance-none">
                      <option>Pre-order Sales</option>
                      <option>Lead Generation</option>
                      <option>Community Growth</option>
                      <option>Beta Testing</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-label-sm md:text-label-md font-label-md text-secondary mb-2">Pricing Model</label>
                    <button 
                      type="button"
                      onClick={() => setIsFree(!isFree)}
                      className={`w-full px-4 py-3 border rounded-lg font-label-md flex items-center justify-between transition-colors ${isFree ? 'bg-success-vibrant/10 border-success-vibrant/30 text-success-vibrant' : 'bg-surface-subtle border-border-subtle text-secondary'}`}
                    >
                      <span>{isFree ? "100% Free Resource" : "Paid Product"}</span>
                      <span className="material-symbols-outlined text-[20px]">{isFree ? 'check_circle' : 'payments'}</span>
                    </button>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-label-sm md:text-label-md font-label-md text-secondary mb-2">What it does (The Solution)</label>
                    <textarea value={launchForm.solution} onChange={e => setLaunchForm({...launchForm, solution: e.target.value})} className="w-full px-4 py-3 bg-surface-subtle border border-border-subtle rounded-lg font-body-sm md:font-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none" placeholder="Describe how your tool or course works in plain language..." rows="3"></textarea>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-label-sm md:text-label-md font-label-md text-secondary mb-2">What problem it solves</label>
                    <textarea value={launchForm.problem} onChange={e => setLaunchForm({...launchForm, problem: e.target.value})} className="w-full px-4 py-3 bg-surface-subtle border border-border-subtle rounded-lg font-body-sm md:font-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none" placeholder="What pain point is this fixing?" rows="2"></textarea>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-label-sm md:text-label-md font-label-md text-secondary mb-2">Who it's for (The Audience)</label>
                    <input value={launchForm.audience} onChange={e => setLaunchForm({...launchForm, audience: e.target.value})} className="w-full px-4 py-3 bg-surface-subtle border border-border-subtle rounded-lg font-body-sm md:font-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="e.g. K-12 Teachers, EdTech Founders" type="text"/>
                  </div>
                </div>
                
                <div className="pt-6 mt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
                  <button onClick={() => setLaunchForm({ projectName: "", primaryGoal: "Pre-order Sales", solution: "", problem: "", audience: "" })} className="w-full sm:w-auto text-secondary hover:text-primary text-label-sm md:text-label-md font-label-md flex items-center justify-center gap-2 transition-colors py-2" type="button">
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Clear Form
                  </button>
                  <button disabled={isGeneratingLaunch} onClick={handleGenerateLaunchSequence} className="w-full sm:w-auto bg-primary text-on-primary px-6 md:px-8 py-3 rounded-lg font-headline-md text-label-md flex items-center justify-center gap-3 hover:opacity-90 transition-transform active:scale-95 shadow-sm disabled:opacity-50" type="button">
                    <span className="material-symbols-outlined text-[20px]">{isGeneratingLaunch ? 'hourglass_empty' : 'auto_awesome'}</span>
                    {isGeneratingLaunch ? 'Generating...' : 'Generate Sequence'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Aesthetic Content Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-midnight-void p-6 rounded-2xl text-primary-fixed shadow-sm">
                <span className="material-symbols-outlined mb-4 text-[28px]">insights</span>
                <p className="text-[10px] md:text-label-sm font-jetbrains-mono uppercase tracking-widest opacity-60">Market Fit Score</p>
                <p className="text-headline-lg md:text-headline-xl font-headline-xl mt-1">{marketFitScore ? marketFitScore.score : '--'}</p>
                <p className="text-body-sm mt-2 opacity-80 leading-relaxed">{marketFitScore ? marketFitScore.description : 'Generate a sequence to see fit.'}</p>
              </div>
              <div className="bg-surface-main border border-border-subtle p-6 rounded-2xl shadow-sm">
                <span className="material-symbols-outlined mb-4 text-primary text-[28px]">schedule</span>
                <p className="text-[10px] md:text-label-sm font-jetbrains-mono uppercase tracking-widest text-secondary">Estimated Build Time</p>
                <p className="text-headline-lg md:text-headline-xl font-headline-xl mt-1 text-on-surface">45 Mins</p>
                <p className="text-body-sm mt-2 text-secondary leading-relaxed">AI handles the heavy lifting of copy & structure.</p>
              </div>
            </div>
          </div>
          
          {/* Right: Generated 4-part sequence Sidebar */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="font-headline-md text-headline-md md:text-headline-lg text-on-surface">The Sequence</h3>
                {launchSequence.length > 0 && (
                  <span className="text-[10px] md:text-label-sm font-jetbrains-mono px-3 py-1.5 bg-success-vibrant/10 text-success-vibrant border border-success-vibrant/20 rounded-lg whitespace-nowrap">
                    Ready to Export
                  </span>
                )}
              </div>
              
              <div className="space-y-4 custom-scrollbar max-h-[716px] overflow-y-auto pr-2 pb-4">
                {launchSequence.length === 0 ? (
                  <div className="text-center py-20 text-secondary border border-dashed border-border-subtle rounded-xl">
                    <span className="material-symbols-outlined text-[48px] opacity-20 mb-4">rocket_launch</span>
                    <p>Fill out the form to generate your campaign</p>
                  </div>
                ) : (
                  launchSequence.map((card) => (
                    <div 
                      key={card.id}
                      onClick={() => setActiveCard(card.id)}
                      className={`bg-surface-main border p-5 rounded-xl border-l-4 group transition-all cursor-pointer shadow-sm ${
                        activeCard === card.id 
                          ? 'border-border-subtle border-l-primary' 
                          : 'border-border-subtle border-l-primary/30 hover:border-l-primary/60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-jetbrains-mono text-[12px] font-bold ${
                          activeCard === card.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                        }`}>
                          0{card.id}
                        </div>
                      </div>
                      <h4 className="font-headline-md text-[18px] text-on-surface mb-2">{card.title}</h4>
                      <p className="text-body-sm text-secondary line-clamp-2 leading-relaxed">{card.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {card.badges && card.badges.map(badge => (
                          <span key={badge} className="text-[9px] md:text-[10px] font-jetbrains-mono px-2 py-0.5 bg-surface-subtle border border-border-subtle text-secondary rounded uppercase tracking-wider">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button disabled={launchSequence.length === 0 || isExportingLaunch} onClick={handleExportLaunch} className="w-full py-4 bg-midnight-void text-primary-fixed rounded-xl font-label-md flex items-center justify-center gap-3 hover:bg-on-surface transition-all active:scale-[0.98] shadow-md mt-6 disabled:opacity-50">
                <span className="material-symbols-outlined">{isExportingLaunch ? 'sync' : 'file_download'}</span>
                {isExportingLaunch ? 'Exporting...' : 'Export Sequence to Drafts'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pull from Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-lg rounded-2xl shadow-2xl relative animate-[slide_0.3s_ease-out] flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center shrink-0">
              <h3 className="font-headline-md text-[20px] text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">account_balance</span>
                Pull from Idea Bank
              </h3>
              <button onClick={() => setShowBankModal(false)} className="text-secondary hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
              {isBankLoading ? (
                <div className="text-center py-10 text-secondary">Loading your bank...</div>
              ) : bankItems.length === 0 ? (
                <div className="text-center py-10 text-secondary">No captures found in your bank.</div>
              ) : (
                bankItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setShowBankModal(false);
                      router.push(`/output?capture_id=${item.id}`);
                    }}
                    className="p-4 bg-surface-subtle hover:bg-surface-dim rounded-xl cursor-pointer border border-border-subtle hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-jetbrains-mono font-bold px-2 py-0.5 rounded w-fit ${item.type === 'Voice Note' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                        {item.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-secondary font-jetbrains-mono">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-body-sm font-medium text-on-surface line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">{item.transcript}</p>
                  </div>
                ))
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
