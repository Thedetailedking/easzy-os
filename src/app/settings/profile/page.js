"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("core"); // 'core', 'voice', 'training', 'engine', 'security'
  
  // Personas State
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Security Credentials States
  const [securityUsername, setSecurityUsername] = useState("");
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState("");

  // Load username (but NOT password) when the security tab is opened.
  // Passwords are never fetched from the server — the user must re-enter to change.
  useEffect(() => {
    async function loadSecurityUsername() {
      if (activeTab !== "security") return;
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        const data = await res.json();
        if (data.user?.username) {
          setSecurityUsername(data.user.username);
        }
      } catch (err) {
        console.error("Error loading session:", err);
      }
    }
    loadSecurityUsername();
  }, [activeTab]);

  const handleSaveSecurity = async () => {
    if (!securityUsername.trim() || !securityPassword.trim()) {
      toast.error("Please fill in both username and new password.");
      return;
    }
    if (securityPassword !== securityConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (securityPassword.trim().length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setIsSaving(true);
    try {
      // POST to the server-side credentials route.
      // The user ID comes from the verified session cookie — never from the client.
      // The server hashes the password with bcrypt before storing.
      const res = await fetch("/api/auth/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: securityUsername.trim(),
          password: securityPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");

      // Clear the password fields after a successful save
      setSecurityPassword("");
      setSecurityConfirmPassword("");
      toast.success("Security credentials updated successfully!");
    } catch (err) {
      console.error("Save credentials error", err);
      toast.error("Failed to update credentials: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    profile_name: "Master Profile",
    is_active: false,
    user_name: "Kojo Mensah",
    primary_role: "AI Educator & Tech Consultant",
    target_audience: "",
    core_topics: "",
    positioning_statement: "",
    tone: 75,
    rawness: 32,
    density: 88,
    training_data: [],
    llm_provider: 'openrouter',
    llm_model: 'anthropic/claude-3-haiku',
    llm_api_key: ''
  });

  // Modal Custom Overlays State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("text"); // text, link, image, calibrate
  const [modalLabel, setModalLabel] = useState("");
  const [modalValue, setModalValue] = useState("");
  const [pendingImageBase64, setPendingImageBase64] = useState("");
  const [calibrationExplanation, setCalibrationExplanation] = useState("");
  const fileInputRef = useRef(null);

  // Custom Delete Confirm States
  const [showTrainingDeleteConfirm, setShowTrainingDeleteConfirm] = useState(false);
  const [trainingDataIdToDelete, setTrainingDataIdToDelete] = useState(null);
  const [showPersonaDeleteConfirm, setShowPersonaDeleteConfirm] = useState(false);

  // Load Profiles
  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase.from('user_settings').select('*').order('created_at', { ascending: true });
      if (error) {
        console.error("DB Error:", error);
        setDbError(error.message);
      } else if (data && data.length > 0) {
        setProfiles(data);
        const active = data.find(p => p.is_active) || data[0];
        setActiveProfileId(active.id);
        setFormData(active);
      }
      setIsLoading(false);
    }
    loadProfiles();
  }, []);

  const handleProfileSwitch = (id) => {
    if (id === 'new') {
      setActiveProfileId('new');
      setFormData({
        profile_name: "New Profile",
        is_active: false,
        user_name: "Kojo Mensah",
        primary_role: "Creator & Educator",
        target_audience: "",
        core_topics: "",
        positioning_statement: "",
        tone: 50,
        rawness: 50,
        density: 50,
        training_data: [],
        llm_provider: 'openrouter',
        llm_model: 'anthropic/claude-3-haiku',
        llm_api_key: ''
      });
      return;
    }
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setActiveProfileId(profile.id);
      setFormData(profile);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        target_audience: formData.target_audience || 'Not specified',
        core_topics: formData.core_topics || 'Not specified',
        user_name: formData.user_name || 'Kojo Mensah',
        primary_role: formData.primary_role || 'Creator',
        brand_voice: formData.brand_voice || 'Migrated to Sliders',
        llm_provider: formData.llm_provider || 'openrouter',
        llm_model: formData.llm_model || 'anthropic/claude-3-haiku',
        llm_api_key: formData.llm_api_key || null
      };

      if (activeProfileId === 'new' || !activeProfileId) {
        const { id, ...insertPayload } = payload;
        const { data, error } = await supabase.from('user_settings').insert([insertPayload]).select().single();
        if (error) throw error;
        if (data) {
          setProfiles([...profiles, data]);
          setActiveProfileId(data.id);
          setFormData(data);
          toast.success("New Persona Created!");
        }
      } else {
        const { error } = await supabase.from('user_settings').update(payload).eq('id', activeProfileId);
        if (error) throw error;
        setProfiles(profiles.map(p => p.id === activeProfileId ? { ...p, ...payload } : p));
        toast.success("Profile Saved!");
      }
    } catch (err) {
      console.error("Save Error:", err);
      toast.error("Error saving profile: " + err.message);
    }
    setIsSaving(false);
  };

  const handleMakeActive = async () => {
    if (activeProfileId === 'new') { toast.error("Save profile first!"); return; }
    setIsSaving(true);
    await supabase.from('user_settings').update({ is_active: false }).neq('id', activeProfileId);
    await supabase.from('user_settings').update({ is_active: true }).eq('id', activeProfileId);
    
    setFormData({...formData, is_active: true});
    setProfiles(profiles.map(p => ({ ...p, is_active: p.id === activeProfileId })));
    setIsSaving(false);
    toast.success("Persona Active! AI will use these settings.");
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Custom Modal Triggers
  const openAddTextModal = () => {
    setModalType("text");
    setModalLabel("");
    setModalValue("");
    setModalOpen(true);
  };

  const openAddLinkModal = () => {
    setModalType("link");
    setModalLabel("");
    setModalValue("");
    setModalOpen(true);
  };

  const openAddImageModal = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImageSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingImageBase64(reader.result);
        setModalType("image");
        setModalLabel(file.name);
        setModalValue("");
        setModalOpen(true);
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Error reading image: " + err.message);
      setIsExtracting(false);
    }
  };

  const openCalibrateModal = () => {
    setModalType("calibrate");
    setModalLabel("AI Voice Dynamics Calibrator");
    setModalValue("");
    setCalibrationExplanation("");
    setModalOpen(true);
  };

  // Custom Modal Submit Logic
  const handleModalSubmit = async () => {
    if (!modalLabel.trim()) {
      toast.error("Please enter a reference label!");
      return;
    }

    if (modalType === "text") {
      if (!modalValue.trim()) {
        toast.error("Please paste your reference content!");
        return;
      }
      setFormData(prev => ({
        ...prev,
        training_data: [...prev.training_data, { id: Date.now().toString(), type: 'text', source: modalLabel, content: modalValue, date: new Date().toISOString() }]
      }));
      setModalOpen(false);
      toast.success("Text reference added successfully!");
    } else if (modalType === "link") {
      if (!modalValue.trim()) {
        toast.error("Please enter a URL!");
        return;
      }
      setModalOpen(false);
      setIsExtracting(true);
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: modalValue })
        });
        const data = await res.json();
        
        if (res.ok && data.result) {
          setFormData(prev => ({
            ...prev,
            training_data: [...prev.training_data, { id: Date.now().toString(), type: 'link', source: modalLabel, content: data.result, date: new Date().toISOString() }]
          }));
          toast.success("URL analyzed and training reference added!");
        } else {
          toast.error("Failed to extract: " + (data.error || "Unknown error"));
        }
      } catch (e) {
        toast.error("Error: " + e.message);
      } finally {
        setIsExtracting(false);
      }
    } else if (modalType === "image") {
      setModalOpen(false);
      setIsExtracting(true);
      try {
        const res = await fetch('/api/extract-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: pendingImageBase64 })
        });
        const data = await res.json();
        
        if (res.ok && data.result) {
          setFormData(prev => ({
            ...prev,
            training_data: [...prev.training_data, { id: Date.now().toString(), type: 'image', source: modalLabel, content: data.result, date: new Date().toISOString() }]
          }));
          toast.success("Image text analyzed and reference added!");
        } else {
          toast.error("Failed to extract: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        toast.error("Error extracting image: " + err.message);
      } finally {
        setIsExtracting(false);
      }
    } else if (modalType === "calibrate") {
      if (!modalValue.trim()) {
        toast.error("Please paste 2 or 3 examples of your past posts!");
        return;
      }
      
      setIsExtracting(true);
      setCalibrationExplanation("Claude is reverse-engineering your sliders...");
      
      let llmProvider = formData.llm_provider || "openrouter";
      let llmModel = formData.llm_model || "anthropic/claude-3-haiku";
      let llmApiKey = formData.llm_api_key || "";

      try {
        const res = await fetch('/api/campaign/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Below are my best organic posts. reverse-engineer my slider settings exactly.\n\n[PAST POSTS]\n${modalValue}`,
            systemContext: "Reverse-engineer tone sliders.",
            provider: llmProvider,
            model: llmModel,
            commandType: "style_calibrator"
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        let parsed;
        try {
          let cleanText = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
          parsed = JSON.parse(cleanText);
        } catch (e) {
          throw new Error("Linguistic engine did not return valid JSON sliders.");
        }

        setFormData(prev => ({
          ...prev,
          tone: parsed.tone || 50,
          rawness: parsed.rawness || 50,
          density: parsed.density || 50
        }));
        
        setCalibrationExplanation(parsed.explanation || "Sliders auto-calibrated successfully.");
        toast.success("AI auto-calibrated your Voice Sliders!");
      } catch (err) {
        toast.error("Calibration failed: " + err.message);
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const removeTrainingData = (id) => {
    setFormData(prev => ({
      ...prev,
      training_data: prev.training_data.filter(t => t.id !== id)
    }));
  };

  const handleRemoveTrainingDataClick = (id) => {
    setTrainingDataIdToDelete(id);
    setShowTrainingDeleteConfirm(true);
  };

  const confirmRemoveTrainingData = () => {
    if (trainingDataIdToDelete) {
      setFormData(prev => ({
        ...prev,
        training_data: prev.training_data.filter(t => t.id !== trainingDataIdToDelete)
      }));
      toast.success("Training reference removed from settings list. Remember to save profile to persist changes!");
    }
    setShowTrainingDeleteConfirm(false);
    setTrainingDataIdToDelete(null);
  };

  const handleDeletePersonaClick = () => {
    if (activeProfileId === 'new') return;
    if (profiles.length <= 1) {
      toast.error("You must keep at least one persona profile in your dashboard!");
      return;
    }
    setShowPersonaDeleteConfirm(true);
  };

  const confirmDeletePersona = async () => {
    setShowPersonaDeleteConfirm(false);
    setIsSaving(true);
    try {
      const { error } = await supabase.from('user_settings').delete().eq('id', activeProfileId);
      if (error) throw error;
      
      const remaining = profiles.filter(p => p.id !== activeProfileId);
      setProfiles(remaining);
      
      const nextProfile = remaining[0];
      if (formData.is_active && nextProfile) {
        await supabase.from('user_settings').update({ is_active: true }).eq('id', nextProfile.id);
        nextProfile.is_active = true;
      }
      
      setActiveProfileId(nextProfile.id);
      setFormData(nextProfile);
      toast.success("Persona deleted successfully!");
    } catch (err) {
      toast.error("Error deleting persona: " + err.message);
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center pt-20 md:ml-64">Loading...</div>;

  if (dbError) {
    return (
      <main className="md:ml-64 pt-20 pb-24 md:pt-16 md:pb-8 min-h-screen bg-surface-subtle px-gutter-mobile md:px-gutter-desktop flex items-center justify-center">
        <div className="max-w-2xl bg-error/10 border border-error rounded-xl p-8 text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-error">warning</span>
          <h2 className="text-headline-md text-error">Database Migration Required</h2>
          <p className="text-body-md text-on-surface">We could not load your profiles. This is because the database schema needs to be updated to support the new Personas feature.</p>
          <div className="text-left bg-black text-white p-4 rounded font-jetbrains-mono text-[12px] overflow-x-auto whitespace-pre">
{`ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS profile_name TEXT NOT NULL DEFAULT 'Master Profile',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS primary_role TEXT NOT NULL DEFAULT 'Creator & Educator',
ADD COLUMN IF NOT EXISTS positioning_statement TEXT,
ADD COLUMN IF NOT EXISTS tone INTEGER DEFAULT 75,
ADD COLUMN IF NOT EXISTS rawness INTEGER DEFAULT 32,
ADD COLUMN IF NOT EXISTS density INTEGER DEFAULT 88,
ADD COLUMN IF NOT EXISTS training_data JSONB NOT NULL DEFAULT '[]'::jsonb;`}
          </div>
          <p className="text-body-sm text-secondary">Please run the SQL command above in your Supabase SQL Editor and then refresh this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="md:ml-64 pt-20 pb-24 md:pt-16 md:pb-8 min-h-screen bg-surface-subtle px-gutter-mobile md:px-gutter-desktop overflow-y-auto">
      
      {/* Hidden File Input for Image Upload */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />

      <div className="max-w-container-max mx-auto space-y-8 md:space-y-10">
        
        {/* Back Button */}
        <div>
          <button 
            onClick={() => window.location.href = '/settings'}
            className="flex items-center gap-2 text-label-sm font-label-sm text-secondary hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Settings Hub
          </button>
        </div>

        {/* Page Header */}
        <section className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <h2 className="text-headline-lg font-headline-lg text-on-surface">
              Voice & Profile Configuration
            </h2>
            <p className="text-body-md font-body-md text-secondary max-w-2xl">
              Configure different Personas for different platforms. Switch between them to change how the AI Engine behaves.
            </p>
          </div>
          
          <div className="flex gap-3">
            {activeProfileId !== 'new' && (
              <button 
                onClick={handleDeletePersonaClick}
                disabled={isSaving}
                className="px-5 py-2 bg-error/10 border border-error/30 text-error hover:bg-error/20 font-label-md rounded-lg active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete Persona
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2 bg-primary text-on-primary font-label-md rounded-lg shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </div>
        </section>

        {/* Persona Switcher UI */}
        <div className="bg-surface-main border border-border-subtle rounded-xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-label-md font-jetbrains-mono text-secondary uppercase mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">switch_account</span>
            Your Saved Personas
          </h3>
          <div className="flex flex-wrap gap-3">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => handleProfileSwitch(p.id)}
                className={`px-4 py-3 rounded-lg border flex flex-col items-start gap-1 transition-all text-left ${activeProfileId === p.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-subtle hover:border-primary/50 hover:bg-surface-subtle'}`}
              >
                <span className={`font-label-md ${activeProfileId === p.id ? 'text-primary' : 'text-on-surface'}`}>{p.profile_name}</span>
                {p.is_active && <span className="text-[10px] font-jetbrains-mono bg-success-vibrant/20 text-success-vibrant px-2 rounded">Active Engine</span>}
              </button>
            ))}
            <button
              onClick={() => handleProfileSwitch('new')}
              className={`px-4 py-3 rounded-lg border border-dashed flex flex-col items-center justify-center transition-all ${activeProfileId === 'new' ? 'border-primary bg-primary/5 text-primary' : 'border-outline text-secondary hover:text-on-surface hover:bg-surface-subtle'}`}
            >
              <span className="material-symbols-outlined mb-1 text-[20px]">add_circle</span>
              <span className="font-label-md">New Persona</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-border-subtle mb-6 custom-scrollbar">
          {[
            { id: 'core', label: 'Core Identity', icon: 'badge' },
            { id: 'voice', label: 'Voice Dynamics', icon: 'equalizer' },
            { id: 'training', label: 'Training Data', icon: 'model_training' },
            { id: 'engine', label: 'Deep Engine Config', icon: 'settings_suggest' },
            { id: 'security', label: 'Security & Access', icon: 'security' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-label-sm whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? 'border-primary text-primary bg-surface-main' 
                  : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-dim/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="bg-surface-main border border-border-subtle rounded-xl p-6 shadow-sm">
          
          {/* Active Engine Toggle Banner */}
          {!formData.is_active && activeProfileId !== 'new' && (
            <div className="mb-8 p-4 bg-secondary-container/20 border border-secondary-container rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-body-sm text-on-surface">This persona is currently <strong className="text-primary">Inactive</strong>. The AI Engine is using a different profile.</p>
              <button 
                onClick={handleMakeActive}
                className="px-4 py-2 bg-primary-container text-on-primary-container font-label-sm rounded shadow-sm hover:opacity-90 transition-all"
              >
                Set as Active Engine Profile
              </button>
            </div>
          )}
          {formData.is_active && (
             <div className="mb-8 p-3 bg-success-vibrant/10 border border-success-vibrant/30 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-success-vibrant">check_circle</span>
                <p className="text-body-sm text-on-surface">This is your <strong>Active Profile</strong>. All generations will use these settings.</p>
             </div>
          )}

          {/* TAB 1: CORE IDENTITY */}
          {activeTab === 'core' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-label-sm font-label-sm text-outline block mb-2">Persona Name (Internal)</label>
                    <input
                      className="w-full bg-surface-subtle border border-border-subtle p-3 font-body-md rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      type="text"
                      value={formData.profile_name}
                      onChange={(e) => handleInputChange('profile_name', e.target.value)}
                      placeholder="e.g. LinkedIn Professional"
                    />
                  </div>
                  <div>
                    <label className="text-label-sm font-label-sm text-outline block mb-2">Public Display Name</label>
                    <input
                      className="w-full bg-surface-subtle border border-border-subtle p-3 font-body-md rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      type="text"
                      value={formData.user_name}
                      onChange={(e) => handleInputChange('user_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-label-sm font-label-sm text-outline block mb-2">Primary Role</label>
                    <input
                      className="w-full bg-surface-subtle border border-border-subtle p-3 font-body-md rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      type="text"
                      value={formData.primary_role}
                      onChange={(e) => handleInputChange('primary_role', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-label-sm font-label-sm text-outline block mb-2">Target Audience</label>
                    <textarea
                      className="w-full bg-surface-subtle border border-border-subtle p-3 font-body-md rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      rows={3}
                      value={formData.target_audience}
                      onChange={(e) => handleInputChange('target_audience', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-label-sm font-label-sm text-outline block mb-2">Positioning Statement / Goal</label>
                    <textarea
                      className="w-full bg-surface-subtle border border-border-subtle p-3 font-body-md rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      rows={3}
                      value={formData.positioning_statement}
                      onChange={(e) => handleInputChange('positioning_statement', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VOICE DYNAMICS */}
          {activeTab === 'voice' && (
            <div className="max-w-3xl space-y-10 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <p className="text-body-sm text-secondary">Adjust the sliders to fine-tune how the AI writes for this specific persona.</p>
                <button 
                  onClick={openCalibrateModal}
                  className="px-3.5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-label-sm hover:bg-primary/20 flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] animate-pulse">auto_awesome</span>
                  Calibrate via Past Posts
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-label-md font-label-md text-on-surface">Tone (Clinical vs. Emotive)</label>
                  <span className="font-jetbrains-mono text-label-sm text-primary font-bold">{formData.tone} / 100</span>
                </div>
                <input
                  className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer custom-slider"
                  type="range" min="0" max="100"
                  value={formData.tone}
                  onChange={(e) => handleInputChange('tone', parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[10px] font-jetbrains-mono text-outline">
                  <span>ANALYTICAL</span>
                  <span>PASSIONATE</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-label-md font-label-md text-on-surface">Rawness (Polished vs. Rough)</label>
                  <span className="font-jetbrains-mono text-label-sm text-primary font-bold">{formData.rawness} / 100</span>
                </div>
                <input
                  className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer custom-slider"
                  type="range" min="0" max="100"
                  value={formData.rawness}
                  onChange={(e) => handleInputChange('rawness', parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[10px] font-jetbrains-mono text-outline">
                  <span>EDITORIAL</span>
                  <span>AUTHENTIC / VULNERABLE</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-label-md font-label-md text-on-surface">Density (Simple vs. Complex)</label>
                  <span className="font-jetbrains-mono text-label-sm text-primary font-bold">{formData.density} / 100</span>
                </div>
                <input
                  className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer custom-slider"
                  type="range" min="0" max="100"
                  value={formData.density}
                  onChange={(e) => handleInputChange('density', parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[10px] font-jetbrains-mono text-outline">
                  <span>BEGINNER ACCESSIBLE</span>
                  <span>EXPERT LEVEL</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAINING DATA */}
          {activeTab === 'training' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-body-sm text-secondary max-w-2xl">
                  Provide successful posts or reference materials that define this persona's style. The AI will mimic this exact syntax, hook strategy, and sentence structure.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={openAddTextModal}
                    disabled={isExtracting}
                    className="px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-label-sm hover:bg-primary/20 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">notes</span> Text
                  </button>
                  <button 
                    onClick={openAddLinkModal}
                    disabled={isExtracting}
                    className="px-3 py-2 bg-surface-main text-on-surface border border-border-subtle rounded-lg text-label-sm hover:border-primary/50 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">link</span> Link
                  </button>
                  <button 
                    onClick={openAddImageModal}
                    disabled={isExtracting}
                    className="px-3 py-2 bg-surface-main text-on-surface border border-border-subtle rounded-lg text-label-sm hover:border-primary/50 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span> Image
                  </button>
                  {isExtracting && <span className="text-[12px] text-primary animate-pulse ml-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> Analyzing...</span>}
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(!formData.training_data || formData.training_data.length === 0) ? (
                  <div className="p-10 border border-dashed border-border-subtle rounded-xl text-center text-secondary">
                    No training style references added for this profile yet.
                  </div>
                ) : (
                  formData.training_data.map((data) => (
                    <div key={data.id} className="p-4 border border-border-subtle rounded-lg bg-surface-subtle relative group">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-jetbrains-mono text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1">
                            {data.type === 'text' && <span className="material-symbols-outlined text-[12px]">notes</span>}
                            {data.type === 'link' && <span className="material-symbols-outlined text-[12px]">link</span>}
                            {data.type === 'image' && <span className="material-symbols-outlined text-[12px]">image</span>}
                            {data.type?.toUpperCase() || 'TEXT'}
                          </span>
                          <span className="text-[11px] font-jetbrains-mono text-outline">{data.source || 'Manual Entry'}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveTrainingDataClick(data.id)}
                          className="text-error hover:bg-error/10 p-2 rounded transition-colors flex items-center gap-1 bg-surface-main border border-border-subtle"
                          title="Delete this training data"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span className="text-[12px] font-label-sm">Delete</span>
                        </button>
                      </div>
                      <p className="text-body-sm text-on-surface whitespace-pre-wrap">{data.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DEEP ENGINE CONFIG */}
          {activeTab === 'engine' && (
            <div className="space-y-8 animate-fade-in">
              <div className="p-8 bg-midnight-void rounded-2xl overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="space-y-2">
                    <h4 className="text-headline-md font-headline-md text-primary-fixed">Deep Engine Configuration</h4>
                    <p className="text-body-md text-surface-variant max-w-xl">
                      Configure specific LLM parameters and select the core processing model.
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#62df7d 0.5px, transparent 0.5px)", backgroundSize: "20px 20px" }}></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-surface-subtle p-6 border border-border-subtle rounded-xl">
                   <h5 className="font-label-md mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                    LLM Provider
                   </h5>
                   <p className="text-[12px] text-secondary mb-4">Select which underlying AI model provider to use.</p>
                   <select 
                     className="w-full p-3 rounded-lg bg-surface-main border border-border-subtle text-on-surface outline-none focus:border-primary transition-colors"
                     value={formData.llm_provider || 'openrouter'}
                     onChange={(e) => handleInputChange('llm_provider', e.target.value)}
                   >
                     <option value="openrouter">OpenRouter (Default)</option>
                     <option value="openai">OpenAI (Direct API)</option>
                     <option value="anthropic">Anthropic</option>
                   </select>
                   
                   <div className="mt-4">
                     <label className="text-[12px] text-outline block mb-1">Model String</label>
                     <input 
                       type="text" 
                       value={formData.llm_model || ''}
                       onChange={(e) => handleInputChange('llm_model', e.target.value)}
                       placeholder="e.g. gpt-4o, anthropic/claude-3-haiku" 
                       className="w-full p-3 rounded-lg bg-surface-main border border-border-subtle text-on-surface outline-none focus:border-primary transition-colors font-jetbrains-mono text-[13px]" 
                     />
                   </div>
                 </div>
                 <div className="bg-surface-subtle p-6 border border-border-subtle rounded-xl">
                   <h5 className="font-label-md mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">key</span>
                    API Key Override
                   </h5>
                   <p className="text-[12px] text-secondary mb-4">Use a custom API key for this specific persona's generations. If left blank, the system defaults will be used.</p>
                   <input 
                     type="password" 
                     value={formData.llm_api_key || ''}
                     onChange={(e) => handleInputChange('llm_api_key', e.target.value)}
                     placeholder="sk-..." 
                     className="w-full p-3 rounded-lg bg-surface-main border border-border-subtle text-on-surface outline-none focus:border-primary transition-colors font-jetbrains-mono text-[13px]" 
                   />
                 </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & ACCESS */}
          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-8 animate-fade-in">
              <div>
                <h4 className="font-headline-md text-[18px] text-on-surface mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">security</span>
                  Workspace Credentials Security
                </h4>
                <p className="text-body-sm text-secondary">Update your workspace credentials here. Once saved, these will be used to log in on subsequent browser sessions.</p>
              </div>

              <div className="bg-surface-subtle border border-border-subtle p-6 rounded-xl space-y-6">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Workspace Username</label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">person</span>
                    <input 
                      type="text" 
                      value={securityUsername}
                      onChange={(e) => setSecurityUsername(e.target.value)}
                      placeholder="e.g. admin"
                      className="w-full pl-11 pr-4 py-3 bg-surface-main border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">New Secret Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">lock</span>
                    <input 
                      type="password" 
                      value={securityPassword}
                      onChange={(e) => setSecurityPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-surface-main border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-jetbrains-mono uppercase tracking-wider text-secondary font-bold">Confirm Secret Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px]">lock_reset</span>
                    <input 
                      type="password" 
                      value={securityConfirmPassword}
                      onChange={(e) => setSecurityConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-surface-main border border-border-subtle text-on-surface text-body-sm rounded-xl outline-none focus:border-primary transition-all placeholder:text-secondary/50 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveSecurity}
                    disabled={isSaving}
                    className="px-6 py-3 bg-primary text-on-primary font-label-sm font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Update Security Credentials
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CUSTOM PRESET MODAL OVERLAYS (UX Masterclass: zero browser dialog prompt/alerts!) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-lg rounded-2xl shadow-2xl relative border border-border-subtle animate-[slide_0.3s_ease-out] flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle flex justify-between items-center shrink-0">
              <h3 className="font-headline-md text-[18px] text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  {modalType === "text" && "notes"}
                  {modalType === "link" && "link"}
                  {modalType === "image" && "image"}
                  {modalType === "calibrate" && "auto_awesome"}
                </span>
                {modalType === "text" && "Add Writing Style Text"}
                {modalType === "link" && "Scrape Style from URL Link"}
                {modalType === "image" && "Extract Text from Style Image"}
                {modalType === "calibrate" && "AI Voice Sliders Calibrator"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-secondary hover:text-primary transition-colors flex">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              
              {/* Form Input fields */}
              {modalType !== "calibrate" && (
                <div>
                  <label className="block text-label-sm font-label-md text-secondary mb-1.5">Reference Label / Name</label>
                  <input 
                    type="text"
                    value={modalLabel}
                    onChange={e => setModalLabel(e.target.value)}
                    placeholder="e.g. Viral Twitter thread, Core value post"
                    className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                  />
                </div>
              )}

              {modalType === "text" && (
                <div>
                  <label className="block text-label-sm font-label-md text-secondary mb-1.5">Pasted Reference Content</label>
                  <textarea 
                    value={modalValue}
                    onChange={e => setModalValue(e.target.value)}
                    placeholder="Paste the full post text or email here. Claude will mimic this pacing..."
                    className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none custom-scrollbar"
                    rows={6}
                  />
                </div>
              )}

              {modalType === "link" && (
                <div>
                  <label className="block text-label-sm font-label-md text-secondary mb-1.5">Pasted URL Link</label>
                  <input 
                    type="url"
                    value={modalValue}
                    onChange={e => setModalValue(e.target.value)}
                    placeholder="https://linkedin.com/posts/..."
                    className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-jetbrains-mono"
                  />
                </div>
              )}

              {modalType === "image" && (
                <div className="space-y-3">
                  <p className="text-body-sm text-secondary leading-relaxed">
                    We've read the image file <strong className="text-primary">{modalLabel}</strong> successfully. Click analysis to extract the writing text structures!
                  </p>
                  {pendingImageBase64 && (
                    <div className="w-full h-32 bg-surface-subtle rounded-lg border border-border-subtle flex items-center justify-center overflow-hidden">
                      <img src={pendingImageBase64} alt="Style reference preview" className="h-full object-contain opacity-80" />
                    </div>
                  )}
                </div>
              )}

              {modalType === "calibrate" && (
                <div className="space-y-4">
                  <p className="text-body-sm text-secondary leading-relaxed">
                    Paste 2 or 3 of your best-performing organic posts below. Claude will reverse-engineer your linguistic metrics and auto-calibrate your Tone, Rawness, and Density voice sliders!
                  </p>
                  <div>
                    <textarea 
                      value={modalValue}
                      onChange={e => setModalValue(e.target.value)}
                      placeholder="Paste your past post copy here..."
                      className="w-full px-4 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none resize-none custom-scrollbar"
                      rows={6}
                      disabled={isExtracting}
                    />
                  </div>
                  {calibrationExplanation && (
                    <div className="p-3 bg-midnight-void/50 border border-primary/20 rounded-lg text-primary text-[12px] leading-relaxed whitespace-pre-wrap font-jetbrains-mono animate-[fadeIn_0.3s_ease-out]">
                      {calibrationExplanation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border-subtle bg-surface-subtle/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
              <button 
                onClick={() => setModalOpen(false)}
                disabled={isExtracting}
                className="px-4 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg hover:bg-surface-dim transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleModalSubmit}
                disabled={isExtracting}
                className="px-5 py-2 bg-primary text-on-primary font-label-sm rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {modalType === "calibrate" ? "auto_awesome" : "save"}
                </span>
                {isExtracting ? "Analyzing..." : modalType === "calibrate" ? "Calibrate Sliders" : "Analyze Reference"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* CUSTOM TRAINING DATA DELETE CONFIRMATION MODAL */}
      {showTrainingDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-md rounded-2xl shadow-2xl relative border border-border-subtle p-6 space-y-6 animate-[slide_0.3s_ease-out]">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error shrink-0">
                <span className="material-symbols-outlined text-[26px]">warning</span>
              </div>
              <div className="space-y-1.5 text-left">
                <h4 className="font-headline-md text-[18px] text-on-surface font-bold">Remove Training Style Reference</h4>
                <p className="text-body-sm text-secondary leading-relaxed">
                  Are you sure you want to remove this writing style reference from this persona profile's settings? You will need to save the profile settings page to save this deletion permanently.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
              <button 
                onClick={() => {
                  setShowTrainingDeleteConfirm(false);
                  setTrainingDataIdToDelete(null);
                }}
                className="px-4 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg hover:bg-surface-dim transition-colors"
              >
                Keep Reference
              </button>
              <button 
                onClick={confirmRemoveTrainingData}
                className="px-5 py-2 bg-error text-white font-label-sm font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PERSONA DELETE CONFIRMATION MODAL */}
      {showPersonaDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main w-full max-w-md rounded-2xl shadow-2xl relative border border-border-subtle p-6 space-y-6 animate-[slide_0.3s_ease-out]">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error shrink-0">
                <span className="material-symbols-outlined text-[26px]">warning</span>
              </div>
              <div className="space-y-1.5 text-left">
                <h4 className="font-headline-md text-[18px] text-on-surface font-bold">Delete Saved Persona Profile</h4>
                <p className="text-body-sm text-secondary leading-relaxed">
                  Are you sure you want to delete the persona profile <strong className="text-on-surface">"{formData.profile_name}"</strong> permanently from your user settings database? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle/50">
              <button 
                onClick={() => setShowPersonaDeleteConfirm(false)}
                className="px-4 py-2 bg-surface-subtle border border-border-subtle text-secondary font-label-sm rounded-lg hover:bg-surface-dim transition-colors"
              >
                Keep Persona
              </button>
              <button 
                onClick={confirmDeletePersona}
                className="px-5 py-2 bg-error text-white font-label-sm font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
