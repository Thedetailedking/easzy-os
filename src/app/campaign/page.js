"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function CampaignContent() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isDbMissing, setIsDbMissing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  // Campaign Form State
  const [projectName, setProjectName] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("Pre-order Sales");
  const [isFree, setIsFree] = useState(false);
  const [solution, setSolution] = useState("");
  const [problem, setProblem] = useState("");
  const [audience, setAudience] = useState("");
  const [marketFitScore, setMarketFitScore] = useState("--");
  const [marketFitDescription, setMarketFitDescription] = useState("Fill out your campaign parameters to evaluate.");

  // AI Chat & Outputs State
  const [chatHistory, setChatHistory] = useState([]);
  const [launchSequence, setLaunchSequence] = useState([]);
  const [outreachScripts, setOutreachScripts] = useState("");
  const [leadGenPlan, setLeadGenPlan] = useState("");
  const [postingStrategy, setPostingStrategy] = useState("");
  const [offerCalibrator, setOfferCalibrator] = useState("");

  const [activeTab, setActiveTab] = useState("sequence"); // sequence, outreach, leadgen, posting, offer
  const [chatInput, setChatInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingOutput, setIsLoadingOutput] = useState(false);
  const [activeOutputLoading, setActiveOutputLoading] = useState(""); // which tab is generating

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const chatScrollRef = useRef(null);
  const chatInputRef = useRef(null);

  // Auto-resize chat textarea
  useEffect(() => {
    if (chatInput === "" && chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
    }
  }, [chatInput]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 1. Initial Load: Fetch Campaigns from Supabase or LocalStorage Fallback
  useEffect(() => {
    async function loadCampaigns() {
      try {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .select("*")
          .order("updated_at", { ascending: false });

        if (error) throw error;

        setCampaigns(data || []);
        if (data && data.length > 0) {
          selectCampaign(data[0]);
        } else {
          startNewCampaign();
        }
      } catch (err) {
        console.warn("Supabase marketing_campaigns table not found. Using localStorage Local Sandbox Mode.", err.message);
        setIsDbMissing(true);
        loadLocalCampaigns();
      }
    }
    loadCampaigns();
  }, []);

  // Local Sandbox Helper: Load campaigns from localStorage
  const loadLocalCampaigns = () => {
    try {
      const localData = localStorage.getItem("easzy_os_local_campaigns");
      if (localData) {
        const parsed = JSON.parse(localData);
        setCampaigns(parsed);
        if (parsed.length > 0) {
          selectCampaign(parsed[0]);
        } else {
          startNewCampaign();
        }
      } else {
        startNewCampaign();
      }
    } catch (e) {
      console.error("Local storage error:", e);
      startNewCampaign();
    }
  };

  // Helper to load selected campaign attributes into state
  const selectCampaign = (campaign) => {
    setSelectedCampaignId(campaign.id);
    setProjectName(campaign.project_name || "");
    setPrimaryGoal(campaign.primary_goal || "Pre-order Sales");
    setIsFree(campaign.is_free || false);
    setSolution(campaign.solution || "");
    setProblem(campaign.problem || "");
    setAudience(campaign.audience || "");
    setMarketFitScore(campaign.market_fit_score || "--");
    setMarketFitDescription(campaign.market_fit_description || "Evaluate campaign to see score.");

    setChatHistory(campaign.chat_history || []);
    setLaunchSequence(campaign.launch_sequence || []);
    setOutreachScripts(campaign.outreach_scripts || "");
    setLeadGenPlan(campaign.lead_gen_plan || "");
    setPostingStrategy(campaign.posting_strategy || "");
    setOfferCalibrator(campaign.offer_calibrator || "");
  };

  // Helper to clear form and start a new campaign
  const startNewCampaign = () => {
    setSelectedCampaignId("new");
    setProjectName("");
    setPrimaryGoal("Pre-order Sales");
    setIsFree(false);
    setSolution("");
    setProblem("");
    setAudience("");
    setMarketFitScore("--");
    setMarketFitDescription("Fill out details and talk to Claude to evaluate fit.");

    setChatHistory([
      {
        role: "assistant",
        content: "👋 Welcome to your interactive Marketing & Strategy Planner!\n\nI'm Claude, your marketing co-pilot. I embody the frameworks of Alex Hormozi ($100M Offers, $100M Leads) to build campaigns, outreach scripts, and posting strategies that generate leads and clients.\n\nFill in your Project Architecture details on the left, and let me know what we are launching today!"
      }
    ]);
    setLaunchSequence([]);
    setOutreachScripts("");
    setLeadGenPlan("");
    setPostingStrategy("");
    setOfferCalibrator("");
  };

  // Real-time name changes synchronization in the dropdown selector
  const handleProjectNameChange = (newName) => {
    setProjectName(newName);
    if (selectedCampaignId !== "new") {
      setCampaigns(prev => prev.map(c => c.id === selectedCampaignId ? { ...c, project_name: newName } : c));
    }
  };

  // Delete Campaign Handler
  const handleDeleteCampaign = async () => {
    if (selectedCampaignId === "new") return;
    setShowDeleteConfirm(true);
  };

  const executeDeleteCampaign = async () => {
    setShowDeleteConfirm(false);
    
    if (isDbMissing) {
      try {
        const localData = localStorage.getItem("easzy_os_local_campaigns");
        if (localData) {
          const parsed = JSON.parse(localData);
          const filtered = parsed.filter(c => c.id !== selectedCampaignId);
          localStorage.setItem("easzy_os_local_campaigns", JSON.stringify(filtered));
          setCampaigns(filtered);
          toast.success("Campaign deleted locally.");
          if (filtered.length > 0) {
            selectCampaign(filtered[0]);
          } else {
            startNewCampaign();
          }
        }
      } catch (e) {
        toast.error("Failed to delete locally.");
      }
      return;
    }

    try {
      const { error } = await supabase.from("marketing_campaigns").delete().eq("id", selectedCampaignId);
      if (error) throw error;
      
      const filtered = campaigns.filter(c => c.id !== selectedCampaignId);
      setCampaigns(filtered);
      toast.success("Campaign strategy deleted successfully!");
      if (filtered.length > 0) {
        selectCampaign(filtered[0]);
      } else {
        startNewCampaign();
      }
    } catch (err) {
      toast.error("Error deleting campaign: " + err.message);
    }
  };


  // 2. Save Campaign Settings to Supabase or Local Sandbox
  const handleSaveCampaign = async (customCampaignData = null) => {
    const campaignData = customCampaignData || {
      project_name: projectName || "Unnamed Campaign",
      primary_goal: primaryGoal,
      is_free: isFree,
      solution: solution,
      problem: problem,
      audience: audience,
      market_fit_score: marketFitScore,
      market_fit_description: marketFitDescription,
      chat_history: chatHistory,
      launch_sequence: launchSequence,
      outreach_scripts: outreachScripts,
      lead_gen_plan: leadGenPlan,
      posting_strategy: postingStrategy,
      offer_calibrator: offerCalibrator,
      updated_at: new Date().toISOString()
    };

    if (isDbMissing) {
      // Local Sandbox saving
      try {
        let localCampaigns = [];
        const localData = localStorage.getItem("easzy_os_local_campaigns");
        if (localData) {
          localCampaigns = JSON.parse(localData);
        }

        let savedId = selectedCampaignId;
        if (selectedCampaignId === "new") {
          savedId = "local_" + Math.random().toString(36).substr(2, 9);
          campaignData.id = savedId;
          campaignData.created_at = new Date().toISOString();
          localCampaigns.unshift(campaignData);
        } else {
          campaignData.id = selectedCampaignId;
          const idx = localCampaigns.findIndex((c) => c.id === selectedCampaignId);
          if (idx !== -1) {
            localCampaigns[idx] = { ...localCampaigns[idx], ...campaignData };
          } else {
            localCampaigns.unshift(campaignData);
          }
        }

        localStorage.setItem("easzy_os_local_campaigns", JSON.stringify(localCampaigns));
        setCampaigns(localCampaigns);
        setSelectedCampaignId(savedId);
        toast.success("Campaign settings saved locally!");
      } catch (e) {
        toast.error("Failed to save settings locally.");
      }
      return;
    }

    // Supabase saving
    try {
      if (selectedCampaignId === "new") {
        const { data, error } = await supabase
          .from("marketing_campaigns")
          .insert([campaignData])
          .select()
          .single();

        if (error) throw error;

        setCampaigns([data, ...campaigns]);
        setSelectedCampaignId(data.id);
        toast.success("Campaign created successfully!");
      } else {
        const { error } = await supabase
          .from("marketing_campaigns")
          .update(campaignData)
          .eq("id", selectedCampaignId);

        if (error) throw error;

        setCampaigns(
          campaigns.map((c) => (c.id === selectedCampaignId ? { ...c, ...campaignData } : c))
        );
        toast.success("Campaign settings saved!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving campaign: " + err.message);
    }
  };

  // Switch Active Campaign Dropdown handler
  const handleCampaignChange = (e) => {
    const val = e.target.value;
    if (val === "new") {
      startNewCampaign();
    } else {
      const match = campaigns.find((c) => c.id === val);
      if (match) selectCampaign(match);
    }
  };

  // 3. AI Co-pilot Chat Logic: Sending dynamic user requests
  const handleSendChat = async (presetPrompt = "", commandType = "") => {
    const activeText = presetPrompt || chatInput;
    if (!activeText.trim() || isLoadingChat) return;

    // Fetch Active Persona Profile
    let personaContext = "You are an expert marketing strategist and product launch advisor.";
    let llmProvider = "openrouter";
    let llmModel = "anthropic/claude-3-haiku";
    let llmApiKey = "";

    try {
      const { data: profile } = await supabase.from("user_settings").select("*").eq("is_active", true).single();
      if (profile) {
        llmProvider = profile.llm_provider || "openrouter";
        llmModel = profile.llm_model || "anthropic/claude-3-haiku";
        llmApiKey = profile.llm_api_key || "";
        
        const trainingStr = (profile.training_data || []).map((t, i) => `REFERENCE ${i+1}:\n${t.content}`).join("\n\n");
        personaContext = `You are adopting the following Brand Persona:
Name: ${profile.user_name}
Role: ${profile.primary_role}
Target Audience: ${profile.target_audience}
Goal/Positioning: ${profile.positioning_statement}

Voice Sliders:
Tone (0=Clinical, 100=Emotive): ${profile.tone}
Rawness (0=Polished, 100=Rough/Authentic): ${profile.rawness}
Density (0=Simple, 100=Expert): ${profile.density}

TRAINING WRITING REFERENCES:
${trainingStr || "No references. Sound conversational, professional, and clear."}
`;
      }
    } catch (e) {}

    const userMsg = { role: "user", content: activeText };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    if (!presetPrompt) setChatInput("");
    setIsLoadingChat(true);

    // Build context with current campaign form parameters
    const campaignContext = `
[CURRENT CAMPAIGN ARCHITECTURE]
Project Name: ${projectName || "Unnamed Campaign"}
Primary Goal: ${primaryGoal}
Pricing Model: ${isFree ? "100% Free Resource" : "Paid Product"}
What it does: ${solution || "Not filled"}
Problem solved: ${problem || "Not filled"}
Who it's for (Audience): ${audience || "Not filled"}
`;

    const chatConversation = updatedHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const fullPrompt = `${campaignContext}\n\n[CONVERSATION HISTORY]\n${chatConversation}\n\nRespond to the user's message as their Marketing Strategist advisor. Offer specific, actionable growth strategies or answers.`;

    try {
      const response = await fetch("/api/campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          systemContext: personaContext,
          provider: llmProvider,
          model: llmModel,
          commandType: commandType
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiMsg = { role: "assistant", content: data.result };
      const newHistory = [...updatedHistory, aiMsg];
      setChatHistory(newHistory);

      // Auto-update specific outputs dynamically depending on quick-chips
      let updatedOutreach = outreachScripts;
      let updatedLeadGen = leadGenPlan;
      let updatedPosting = postingStrategy;
      let updatedOffer = offerCalibrator;

      if (commandType === "hormozi_hook") {
        updatedPosting = data.result;
        setPostingStrategy(data.result);
        setActiveTab("posting");
      } else if (commandType === "warm_outreach") {
        updatedOutreach = data.result;
        setOutreachScripts(data.result);
        setActiveTab("outreach");
      } else if (commandType === "lead_magnet") {
        updatedLeadGen = data.result;
        setLeadGenPlan(data.result);
        setActiveTab("leadgen");
      } else if (commandType === "seven_day_plan") {
        updatedPosting = data.result;
        setPostingStrategy(data.result);
        setActiveTab("posting");
      } else if (commandType === "offer_calibrator") {
        updatedOffer = data.result;
        setOfferCalibrator(data.result);
        setActiveTab("offer");
      }

      // Proactively save updated history
      handleSaveCampaign({
        project_name: projectName || "Unnamed Campaign",
        primary_goal: primaryGoal,
        is_free: isFree,
        solution: solution,
        problem: problem,
        audience: audience,
        market_fit_score: marketFitScore,
        market_fit_description: marketFitDescription,
        chat_history: newHistory,
        launch_sequence: launchSequence,
        outreach_scripts: updatedOutreach,
        lead_gen_plan: updatedLeadGen,
        posting_strategy: updatedPosting,
        offer_calibrator: updatedOffer,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      toast.error("Error generating strategy: " + err.message);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // 4. Generate structured blueprints (Launch Sequence & Market Fit)
  const handleGenerateWorkspaceBlueprints = async () => {
    if (!projectName.trim() || !solution.trim() || !audience.trim()) {
      toast.error("Please fill in Project Name, Solution, and Audience first!");
      return;
    }

    setIsLoadingOutput(true);
    setActiveOutputLoading("sequence");

    let llmProvider = "openrouter";
    let llmModel = "anthropic/claude-3-haiku";
    let llmApiKey = "";

    try {
      const { data: profile } = await supabase.from("user_settings").select("*").eq("is_active", true).single();
      if (profile) {
        llmProvider = profile.llm_provider || "openrouter";
        llmModel = profile.llm_model || "anthropic/claude-3-haiku";
        llmApiKey = profile.llm_api_key || "";
      }
    } catch (e) {}

    const prompt = `Based on the following product details, generate a dynamic 4-part launch sequence customized to my goal.
Also evaluate the Market Fit Score based on the audience.

Project Name: ${projectName}
Primary Goal: ${primaryGoal}
Pricing Model: ${isFree ? "Free Resource" : "Paid Product"}
What it does: ${solution}
What problem it solves: ${problem}
Target Audience: ${audience}

Return a VALID RAW JSON OBJECT ONLY. Format exactly like this:
{
  "marketFit": {
    "score": "95%",
    "description": "Short explanation of the score relative to the audience"
  },
  "sequence": [
    {
      "id": 1,
      "title": "Part Title (e.g. The Hormozi Curiosity Hook)",
      "description": "Provide complete high-converting copy or script details for this part of the campaign.",
      "badges": ["EMAIL", "LINKEDIN"]
    }
  ]
}
Ensure sequence array has exactly 4 items. Do not include markdown code fence formatting.`;

    try {
      const response = await fetch("/api/campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemContext: "You are a backend JSON generator. Return ONLY valid raw JSON.",
          provider: llmProvider,
          model: llmModel,
          commandType: "launch_sequence"
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let parsedResponse;
      try {
        let cleanText = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedResponse = JSON.parse(cleanText);
      } catch (e) {
        throw new Error("AI did not return valid campaign JSON.");
      }

      const newSeq = parsedResponse.sequence || [];
      const newScore = parsedResponse.marketFit?.score || "90%";
      const newDesc = parsedResponse.marketFit?.description || "Excellent product market fit.";

      setLaunchSequence(newSeq);
      setMarketFitScore(newScore);
      setMarketFitDescription(newDesc);
      setActiveTab("sequence");

      // Auto save after blueprinting
      handleSaveCampaign({
        project_name: projectName || "Unnamed Campaign",
        primary_goal: primaryGoal,
        is_free: isFree,
        solution: solution,
        problem: problem,
        audience: audience,
        market_fit_score: newScore,
        market_fit_description: newDesc,
        chat_history: chatHistory,
        launch_sequence: newSeq,
        outreach_scripts: outreachScripts,
        lead_gen_plan: leadGenPlan,
        posting_strategy: postingStrategy,
        offer_calibrator: offerCalibrator,
        updated_at: new Date().toISOString()
      });

      toast.success("Launch sequence blueprints generated successfully!");
    } catch (err) {
      toast.error("Blueprint generation failed: " + err.message);
    } finally {
      setIsLoadingOutput(false);
      setActiveOutputLoading("");
    }
  };

  // Helper utility to sanitize and map the platform tags to Supabase check constraints
  const mapPlatform = (plat) => {
    const p = (plat || "").toUpperCase();
    if (p.includes("LINKEDIN")) return "LinkedIn";
    if (p.includes("SUBSTACK") || p.includes("BLOG")) return "Substack";
    if (p.includes("YOUTUBE") || p.includes("SHORT")) return "YouTube";
    if (p.includes("INSTAGRAM") || p.includes("REEL")) return "Instagram";
    if (p.includes("FACEBOOK")) return "Facebook";
    return "LinkedIn"; // Safest fallback to avoid breaking constraint schema
  };

  // 5. Send single block/script to Calendar Drafts with check constraint sanitation
  const handleSendToCalendar = async (title, content, platform = "Other") => {
    if (!content || !content.trim()) return;
    try {
      const sanitizedPlatform = mapPlatform(platform);
      
      const draftData = {
        title: title || `Campaign Draft: ${projectName || "New Post"}`,
        content: content,
        platform: sanitizedPlatform,
        status: "Draft",
        statusColor: "bg-secondary",
        post_type: "Campaign Script"
      };

      const { error } = await supabase.from("drafts").insert([draftData]);
      if (error) throw error;

      toast.success(`Draft successfully sent to your Content Calendar as a ${sanitizedPlatform} post!`);
    } catch (err) {
      console.error("Calendar export error:", err);
      toast.error("Failed to export to calendar: " + err.message);
    }
  };

  // Save single block/script as a permanent Strategy Note in the Bank (Vault)
  const handleSaveToBankAsNote = async (title, content) => {
    if (!content || !content.trim()) return;
    try {
      const formattedTranscript = `[STRATEGY NOTE] ${title}\n\nCampaign: ${projectName || "Unnamed Campaign"}\n\n${content}`;
      
      const { error } = await supabase
        .from('captures')
        .insert([{ 
          type: 'Text Idea', 
          transcript: formattedTranscript 
        }]);
      
      if (error) throw error;

      toast.success(`Successfully saved "${title}" as a Strategy Note in your Idea Bank!`, { icon: '💼' });
    } catch (err) {
      console.error("Save to bank error:", err);
      toast.error("Failed to save to bank: " + err.message);
    }
  };

  // Deepgram voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied or error:", error);
      toast.error("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      const transcript = data.transcript;

      if (!transcript) {
        toast.error("Could not transcribe any words.");
        setIsTranscribing(false);
        return;
      }
      
      // Populate chat input for editing before sending
      setChatInput(transcript);
    } catch (error) {
      console.error(error);
      toast.error("Error processing voice note.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Copy standard utility
  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Strategy details copied to clipboard!");
  };

  // Copy Schema instructions for database
  const copySqlSchema = () => {
    const schemaSql = `-- Run this in your Supabase SQL Editor:
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL DEFAULT 'New Campaign',
  primary_goal TEXT DEFAULT 'Pre-order Sales',
  solution TEXT,
  problem TEXT,
  audience TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  market_fit_score TEXT DEFAULT '--',
  market_fit_description TEXT DEFAULT 'Fill out the form and generate a sequence to see fit.',
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  launch_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  outreach_scripts TEXT DEFAULT '',
  lead_gen_plan TEXT DEFAULT '',
  posting_strategy TEXT DEFAULT '',
  offer_calibrator TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon" ON public.marketing_campaigns FOR ALL USING (true);`;
    
    navigator.clipboard.writeText(schemaSql);
    toast.success("SQL Schema script copied! Paste it in Supabase.");
  };

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-gutter-desktop py-6 md:py-10 space-y-6 md:space-y-8 pb-32">
      
      {/* 0. Supabase DB Pending Setup Warning (UX Sandbox Mode) */}
      {isDbMissing && (
        <div className="bg-gradient-to-r from-warning-vibrant/20 to-warning-vibrant/5 border border-warning-vibrant/40 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md relative animate-[fadeIn_0.5s_ease-out]">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-warning-vibrant text-[28px] shrink-0">database</span>
            <div>
              <h4 className="font-headline-md text-[16px] text-on-surface font-bold">Supabase Strategy Table Pending</h4>
              <p className="text-body-sm text-secondary mt-1 leading-relaxed">
                The <code className="bg-midnight-void/40 px-1.5 py-0.5 rounded text-primary text-[11px]">marketing_campaigns</code> table does not exist in your Supabase database. The planner is running in **Sandbox Mode** (saving directly to your browser's LocalStorage). Everything works fully!
              </p>
            </div>
          </div>
          <button 
            onClick={copySqlSchema} 
            className="px-4 py-2 bg-midnight-void text-primary-fixed border border-primary/20 rounded-lg text-label-sm font-label-md flex items-center gap-2 hover:bg-on-surface/10 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            Copy SQL Script
          </button>
        </div>
      )}

      {/* 1. Header with Campaign Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-main p-6 rounded-2xl border border-border-subtle shadow-sm">
        <div>
          <span className="text-[10px] md:text-label-sm font-jetbrains-mono text-primary uppercase tracking-wider mb-1 block">Module 2 • Campaign Strategy</span>
          <h1 className="text-headline-md md:text-headline-lg font-headline-xl text-on-surface">
            {selectedCampaignId === "new" ? "New Marketing Campaign" : projectName || "Product Launch Planner"}
          </h1>
          <p className="text-body-sm text-secondary mt-1">
            Build launch sequences, DM scripts, and organic lead magnet plans embodying Alex Hormozi's philosophies.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select 
            value={selectedCampaignId} 
            onChange={handleCampaignChange} 
            className="px-4 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
          >
            <option value="new">Start New Campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.project_name || "Unnamed Campaign"}
              </option>
            ))}
          </select>
          <button 
            onClick={startNewCampaign} 
            className="p-2 bg-surface-subtle border border-border-subtle rounded-lg text-secondary hover:text-primary transition-colors flex items-center"
            title="Create New Campaign"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      {/* 2. Main Three-Panel Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* PANEL A: Campaign Settings & Fit (4 cols) */}
        <div className="xl:col-span-4 space-y-6 lg:space-y-8">
          <div className="bg-surface-main border border-border-subtle p-5 md:p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 border-b border-border-subtle pb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
              Project Architecture
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-label-sm font-label-md text-secondary mb-1.5">Project / Offer Name</label>
                <input 
                  value={projectName} 
                  onChange={e => handleProjectNameChange(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none" 
                  placeholder="e.g. AI educator Curriculum" 
                  type="text"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-sm font-label-md text-secondary mb-1.5">Primary Goal</label>
                  <select 
                    value={primaryGoal} 
                    onChange={e => setPrimaryGoal(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                  >
                    <option>Pre-order Sales</option>
                    <option>Lead Generation</option>
                    <option>Community Growth</option>
                    <option>Beta Testing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-sm font-label-md text-secondary mb-1.5">Pricing Model</label>
                  <button 
                    type="button" 
                    onClick={() => setIsFree(!isFree)} 
                    className={`w-full px-3 py-2.5 border rounded-lg text-[12px] font-label-md flex items-center justify-between transition-colors ${isFree ? 'bg-success-vibrant/10 border-success-vibrant/30 text-success-vibrant' : 'bg-surface-subtle border-border-subtle text-secondary'}`}
                  >
                    <span>{isFree ? "Free Lead magnet" : "Paid Product"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-label-md text-secondary mb-1.5">What it does (The Solution)</label>
                <textarea 
                  value={solution} 
                  onChange={e => setSolution(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none" 
                  placeholder="Describe your offer in plain details..." 
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-md text-secondary mb-1.5">What problem it solves</label>
                <textarea 
                  value={problem} 
                  onChange={e => setProblem(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none" 
                  placeholder="What is their primary pain point?" 
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-label-sm font-label-md text-secondary mb-1.5">Target Audience</label>
                <input 
                  value={audience} 
                  onChange={e => setAudience(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none" 
                  placeholder="e.g. K-12 Teachers, Course creators" 
                  type="text"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle flex flex-wrap gap-2">
              <button 
                onClick={() => handleSaveCampaign(null)} 
                className="flex-1 min-w-[120px] px-3 py-2 bg-surface-subtle border border-border-subtle text-on-surface font-label-sm rounded-lg hover:bg-surface-dim transition-colors text-center"
              >
                Save Strategy
              </button>
              {selectedCampaignId !== "new" && (
                <button 
                  onClick={handleDeleteCampaign} 
                  className="px-3 py-2 bg-error-vibrant/10 border border-error-vibrant/20 text-error-vibrant font-label-sm rounded-lg hover:bg-error-vibrant/20 transition-colors text-center"
                  title="Delete Campaign"
                >
                  <span className="material-symbols-outlined text-[16px] block">delete</span>
                </button>
              )}
              <button 
                onClick={handleGenerateWorkspaceBlueprints} 
                disabled={isLoadingOutput}
                className="flex-1 min-w-[120px] px-3 py-2 bg-primary text-on-primary font-label-sm rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Build Blueprint
              </button>
            </div>
          </div>

          {/* Market Fit Analysis Card */}
          <div className="bg-midnight-void p-5 md:p-6 rounded-2xl text-primary-fixed shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
            <span className="material-symbols-outlined text-[24px]">insights</span>
            <p className="text-[10px] font-jetbrains-mono uppercase tracking-widest opacity-60">Audience Market Fit</p>
            <h4 className="text-headline-lg font-headline-xl mt-1">{marketFitScore}</h4>
            <p className="text-body-sm opacity-80 leading-relaxed text-left">{marketFitDescription}</p>
          </div>
        </div>

        {/* PANEL B: Dynamic Strategy Co-pilot (Chat) (4 cols) */}
        <div className="xl:col-span-4 bg-surface-main border border-border-subtle rounded-2xl shadow-sm flex flex-col h-[700px] overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle shrink-0">
            <h3 className="font-headline-md text-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
              Co-pilot Chat
            </h3>
            {isLoadingChat && (
              <span className="text-[10px] font-jetbrains-mono text-primary animate-pulse">CLAUDE THINKING...</span>
            )}
          </div>

          {/* Quick-action Strategy Chips (Design System Tags) */}
          <div className="p-2 border-b border-border-subtle bg-surface-subtle/50 flex gap-2 overflow-x-auto shrink-0 custom-scrollbar whitespace-nowrap">
            <button 
              onClick={() => handleSendChat("Generate $100M scroll-stopping curiosity hooks for my audience based on my settings.", "hormozi_hook")}
              disabled={isLoadingChat}
              className="bg-surface-subtle hover:bg-surface-dim hover:text-on-surface text-secondary border border-border-subtle rounded-full px-3.5 py-1.5 text-[11px] font-jetbrains-mono transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span> Hook Architect
            </button>
            <button 
              onClick={() => handleSendChat("Draft conversational Warm Outreach Direct Message (DM) scripts focused on offering a free gift lead magnet.", "warm_outreach")}
              disabled={isLoadingChat}
              className="bg-surface-subtle hover:bg-surface-dim hover:text-on-surface text-secondary border border-border-subtle rounded-full px-3.5 py-1.5 text-[11px] font-jetbrains-mono transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">forum</span> DM Outreach
            </button>
            <button 
              onClick={() => handleSendChat("Outline a Grand Slam Lead Magnet with extreme value that solves a target problem immediately.", "lead_magnet")}
              disabled={isLoadingChat}
              className="bg-surface-subtle hover:bg-surface-dim hover:text-on-surface text-secondary border border-border-subtle rounded-full px-3.5 py-1.5 text-[11px] font-jetbrains-mono transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">card_giftcard</span> Lead Magnet
            </button>
            <button 
              onClick={() => handleSendChat("Build a structured organic 7-Day Posting Plan outline containing hooks and CTAs.", "seven_day_plan")}
              disabled={isLoadingChat}
              className="bg-surface-subtle hover:bg-surface-dim hover:text-on-surface text-secondary border border-border-subtle rounded-full px-3.5 py-1.5 text-[11px] font-jetbrains-mono transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">calendar_today</span> Posting Plan
            </button>
            <button 
              onClick={() => handleSendChat("Structure an irresistible $100M Grand Slam Offer framework based on my solution.", "offer_calibrator")}
              disabled={isLoadingChat}
              className="bg-surface-subtle hover:bg-surface-dim hover:text-on-surface text-secondary border border-border-subtle rounded-full px-3.5 py-1.5 text-[11px] font-jetbrains-mono transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">payments</span> Offer Calibrator
            </button>
          </div>

          {/* Chat Messages Log */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-subtle/20">
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-full animate-[fadeIn_0.3s_ease-out]`}
              >
                <span className="text-[9px] font-jetbrains-mono text-secondary uppercase mb-1">
                  {msg.role === "user" ? "YOU" : "CLAUDE CO-PILOT"}
                </span>
                <div 
                  className={`p-3.5 rounded-xl border text-body-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-surface-subtle border-border-subtle text-on-surface text-right" 
                      : "bg-surface-main border-midnight-void text-on-surface text-left whitespace-pre-wrap"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoadingChat && (
              <div className="flex flex-col items-start animate-[fadeIn_0.5s_ease-out]">
                <span className="text-[9px] font-jetbrains-mono text-secondary uppercase mb-1">Claude is typing...</span>
                <div className="bg-surface-main border border-midnight-void p-3 rounded-xl flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar with Deepgram Voice Capture Integration */}
          <div className="p-3 border-t border-border-subtle bg-surface-subtle shrink-0">
            {isTranscribing && (
              <div className="h-1 bg-surface-main overflow-hidden relative rounded mb-2">
                <div className="h-full bg-primary w-1/3 animate-[slide_1s_ease-in-out_infinite]"></div>
              </div>
            )}
            <div className="relative">
              <textarea 
                ref={chatInputRef}
                value={chatInput}
                onChange={e => {
                  setChatInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "Ask Claude to refine copy or brainstorm..."}
                disabled={isLoadingChat || isRecording || isTranscribing}
                className="w-full bg-surface-main border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-4 py-2.5 text-body-sm pr-20 md:pr-24 transition-all outline-none resize-none custom-scrollbar"
                rows={1}
                style={{ minHeight: "42px", maxHeight: "120px" }}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  onClick={isRecording ? stopRecording : startRecording} 
                  disabled={isLoadingChat || isTranscribing} 
                  className={`material-symbols-outlined flex items-center justify-center w-7 h-7 rounded-full transition-all disabled:opacity-30 ${isRecording ? 'bg-error text-white animate-pulse' : 'text-secondary hover:bg-surface-subtle hover:text-primary'}`}
                  title="Send Voice Strategy"
                >
                  {isRecording ? 'stop' : 'mic'}
                </button>
                <div className="w-px h-5 bg-border-subtle"></div>
                <button 
                  onClick={() => handleSendChat()} 
                  disabled={isLoadingChat || isRecording || isTranscribing || !chatInput.trim()}
                  className="material-symbols-outlined text-primary hover:scale-105 disabled:opacity-30 transition-transform"
                >
                  send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL C: Interactive Workspace Tabs */}
        <div className="xl:col-span-4 bg-surface-main border border-border-subtle rounded-2xl shadow-sm flex flex-col h-[700px] overflow-hidden">
          
          {/* Tabs Selector (Emojis-Free Material Symbols) */}
          <div className="flex bg-surface-subtle border-b border-border-subtle shrink-0 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab("sequence")}
              className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold whitespace-nowrap px-2 flex items-center justify-center gap-1.5 ${activeTab === "sequence" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[16px]">rocket_launch</span> Launch
            </button>
            <button 
              onClick={() => setActiveTab("outreach")}
              className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold whitespace-nowrap px-2 flex items-center justify-center gap-1.5 ${activeTab === "outreach" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[16px]">forum</span> Outreach
            </button>
            <button 
              onClick={() => setActiveTab("leadgen")}
              className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold whitespace-nowrap px-2 flex items-center justify-center gap-1.5 ${activeTab === "leadgen" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[16px]">card_giftcard</span> Lead Gen
            </button>
            <button 
              onClick={() => setActiveTab("posting")}
              className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold whitespace-nowrap px-2 flex items-center justify-center gap-1.5 ${activeTab === "posting" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_today</span> Posting
            </button>
            <button 
              onClick={() => setActiveTab("offer")}
              className={`flex-grow py-3 text-[11px] font-jetbrains-mono text-center transition-colors border-b-2 font-bold whitespace-nowrap px-2 flex items-center justify-center gap-1.5 ${activeTab === "offer" ? "border-primary text-primary bg-surface-main" : "border-transparent text-secondary hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[16px]">payments</span> Offer
            </button>
          </div>

          {/* Active Workspace Viewport */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-surface-subtle/5">
            {activeOutputLoading === activeTab ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-secondary gap-3 py-20">
                <span className="material-symbols-outlined text-[42px] text-primary animate-pulse">auto_awesome</span>
                <p className="font-jetbrains-mono text-[11px] text-primary animate-pulse">Generating strategies...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: Launch Sequence */}
                {activeTab === "sequence" && (
                  <div className="space-y-4">
                    {launchSequence.length === 0 ? (
                      <div className="text-center py-20 text-secondary border border-dashed border-border-subtle rounded-xl flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[36px] opacity-20">rocket_launch</span>
                        <p className="text-body-sm">Click "Build Blueprint" to generate your Launch sequence blueprint!</p>
                      </div>
                    ) : (
                      launchSequence.map((card) => (
                        <div key={card.id} className="bg-surface-main border border-border-subtle rounded-xl p-4 shadow-sm border-l-4 border-l-primary flex flex-col gap-3 group">
                          <div className="flex justify-between items-center">
                            <span className="font-jetbrains-mono text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">Part 0{card.id}</span>
                            <div className="flex gap-1">
                              {card.badges && card.badges.map(b => (
                                <span key={b} className="text-[8px] font-jetbrains-mono px-1.5 py-0.5 bg-surface-subtle border border-border-subtle text-secondary rounded uppercase">{b}</span>
                              ))}
                            </div>
                          </div>
                          <h4 className="font-headline-md text-[16px] text-on-surface">{card.title}</h4>
                          <p className="text-body-sm text-secondary leading-relaxed whitespace-pre-wrap">{card.description}</p>
                          <div className="flex gap-2 justify-end pt-2 border-t border-border-subtle/50 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleCopyText(card.description)} 
                              className="p-1.5 hover:text-primary transition-colors flex items-center" 
                              title="Copy Script Content"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            <button 
                              onClick={() => handleSendToCalendar(card.title, card.description, card.badges?.[0] || "LinkedIn")} 
                              className="p-1.5 hover:text-primary transition-colors flex items-center text-primary" 
                              title="Send Draft to Calendar"
                            >
                              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 2: DM Outreach Scripts */}
                {activeTab === "outreach" && (
                  <div className="space-y-4">
                    {!outreachScripts ? (
                      <div className="text-center py-20 text-secondary border border-dashed border-border-subtle rounded-xl flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[36px] opacity-20">forum</span>
                        <p className="text-body-sm">Click "DM Outreach" in the co-pilot chips to generate conversational outreach templates!</p>
                      </div>
                    ) : (
                      <div className="bg-surface-main border border-border-subtle rounded-xl p-4 shadow-sm space-y-4 relative group">
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-jetbrains-mono text-[10px] text-primary font-bold">ALEX HORMOZI LEADS MODEL</span>
                          <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopyText(outreachScripts)} className="p-1 bg-surface-subtle rounded hover:text-primary transition-all flex" title="Copy Outreach Scripts"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                            <button onClick={() => handleSaveToBankAsNote(`Outreach Scripts Blueprint`, outreachScripts)} className="p-1 bg-surface-subtle rounded hover:text-primary text-primary transition-all flex" title="Save Strategy Note to Bank"><span className="material-symbols-outlined text-[16px]">folder_special</span></button>
                          </div>
                        </div>
                        <div className="text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                          {outreachScripts}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Lead magnet Funnel */}
                {activeTab === "leadgen" && (
                  <div className="space-y-4">
                    {!leadGenPlan ? (
                      <div className="text-center py-20 text-secondary border border-dashed border-border-subtle rounded-xl flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[36px] opacity-20">card_giftcard</span>
                        <p className="text-body-sm">Click "Lead Magnet" in the co-pilot chips to design a high-value lead magnet blueprint!</p>
                      </div>
                    ) : (
                      <div className="bg-surface-main border border-border-subtle rounded-xl p-4 shadow-sm space-y-4 relative group">
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-jetbrains-mono text-[10px] text-primary font-bold">GRAND SLAM LEAD MAGNET</span>
                          <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopyText(leadGenPlan)} className="p-1 bg-surface-subtle rounded hover:text-primary transition-all flex" title="Copy Lead Gen Outline"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                            <button onClick={() => handleSaveToBankAsNote(`Lead Magnet Blueprint`, leadGenPlan)} className="p-1 bg-surface-subtle rounded hover:text-primary text-primary transition-all flex" title="Save Strategy Note to Bank"><span className="material-symbols-outlined text-[16px]">folder_special</span></button>
                          </div>
                        </div>
                        <div className="text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                          {leadGenPlan}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Organic Posting Strategy */}
                {activeTab === "posting" && (
                  <div className="space-y-4">
                    {!postingStrategy ? (
                      <div className="text-center py-20 text-secondary border border-dashed border-border-subtle rounded-xl flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[36px] opacity-20">calendar_today</span>
                        <p className="text-body-sm">Click "Posting Plan" or "Hook Architect" to map out your content feed strategy!</p>
                      </div>
                    ) : (
                      <div className="bg-surface-main border border-border-subtle rounded-xl p-4 shadow-sm space-y-4 relative group">
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-jetbrains-mono text-[10px] text-primary font-bold">POSTING TIMELINE & PILLARS</span>
                          <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopyText(postingStrategy)} className="p-1 bg-surface-subtle rounded hover:text-primary transition-all flex" title="Copy Posting Schedule"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                            <button onClick={() => handleSaveToBankAsNote(`Campaign Posting Blueprint`, postingStrategy)} className="p-1 bg-surface-subtle rounded hover:text-primary text-primary transition-all flex" title="Save Strategy Note to Bank"><span className="material-symbols-outlined text-[16px]">folder_special</span></button>
                          </div>
                        </div>
                        <div className="text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                          {postingStrategy}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: Irresistible $100M Grand Slam Offer Sheet */}
                {activeTab === "offer" && (
                  <div className="space-y-4">
                    {!offerCalibrator ? (
                      <div className="text-center py-20 text-secondary border border-dashed border-border-subtle rounded-xl flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[36px] opacity-20">payments</span>
                        <p className="text-body-sm">Click "Offer Calibrator" in the co-pilot chips to calculate your Grand Slam Offer details!</p>
                      </div>
                    ) : (
                      <div className="bg-surface-main border border-border-subtle rounded-xl p-4 shadow-sm space-y-4 relative group">
                        <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                          <span className="font-jetbrains-mono text-[10px] text-primary font-bold">$100M GRAND SLAM OFFER SHEET</span>
                          <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopyText(offerCalibrator)} className="p-1 bg-surface-subtle rounded hover:text-primary transition-all flex" title="Copy Offer Sheet"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                            <button onClick={() => handleSaveToBankAsNote(`Hormozi $100M Offer Blueprint`, offerCalibrator)} className="p-1 bg-surface-subtle rounded hover:text-primary text-primary transition-all flex" title="Save Strategy Note to Bank"><span className="material-symbols-outlined text-[16px]">folder_special</span></button>
                          </div>
                        </div>
                        <div className="text-body-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                          {offerCalibrator}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-md rounded-2xl shadow-2xl relative border border-border-subtle p-6 space-y-6 animate-[slide_0.3s_ease-out]">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-error-vibrant/10 flex items-center justify-center text-error-vibrant shrink-0">
                <span className="material-symbols-outlined text-[26px]">warning</span>
              </div>
              <div className="space-y-1.5 text-left">
                <h4 className="font-headline-md text-[18px] text-on-surface font-bold">Delete Campaign Strategy</h4>
                <p className="text-body-sm text-secondary leading-relaxed">
                  Are you sure you want to delete <strong className="text-on-surface">"{projectName || 'Unnamed Campaign'}"</strong>? This will permanently wipe out all chat threads, generated scripts, and schedules. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg hover:bg-surface-dim transition-colors"
              >
                Keep Campaign
              </button>
              <button 
                onClick={executeDeleteCampaign}
                className="px-5 py-2 bg-error-vibrant text-midnight-void font-label-sm font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function CampaignPage() {
  return (
    <main className="md:ml-64 min-h-screen pt-16 bg-surface-subtle overflow-y-auto pb-32">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-secondary font-jetbrains-mono pt-20">Loading Planner...</div>}>
        <CampaignContent />
      </Suspense>
    </main>
  );
}
