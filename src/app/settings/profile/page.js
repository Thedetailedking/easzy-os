"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("core"); // 'core', 'voice', 'training', 'engine'
  
  // Personas State
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    profile_name: "Master Profile",
    is_active: false,
    user_name: "Kojo Mensah",
    primary_role: "AI Educator & Tech Consultant",
    target_audience: "Mid-career professionals in Accra and Lagos...",
    core_topics: "AI Literacy, Tech Ed",
    positioning_statement: "Democratizing AI literacy...",
    tone: 75,
    rawness: 32,
    density: 88,
    training_data: [],
    llm_provider: 'openrouter',
    llm_model: 'anthropic/claude-3-haiku',
    llm_api_key: ''
  });

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
        const { id, ...insertPayload } = payload; // Strip any invalid ID
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
    // Set all others to false
    await supabase.from('user_settings').update({ is_active: false }).neq('id', activeProfileId);
    // Set current to true
    await supabase.from('user_settings').update({ is_active: true }).eq('id', activeProfileId);
    
    setFormData({...formData, is_active: true});
    setProfiles(profiles.map(p => ({ ...p, is_active: p.id === activeProfileId })));
    setIsSaving(false);
    toast.success("This Persona is now Active! The AI Engine will use these settings.");
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTrainingDataText = () => {
    const text = prompt("Paste your successful post or reference text here:");
    if (!text) return;
    const label = prompt("Enter a short label to remember this (e.g. 'Viral Instagram Post'):") || 'Manual Entry';
    
    setFormData(prev => ({
      ...prev,
      training_data: [...prev.training_data, { id: Date.now().toString(), type: 'text', source: label, content: text, date: new Date().toISOString() }]
    }));
  };

  const addTrainingDataLink = async () => {
    const url = prompt("Paste the URL you want the AI to analyze:");
    if (!url) return;
    const label = prompt("Enter a short label to remember this (e.g. 'My best LinkedIn post'):") || url;

    setIsExtracting(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      
      if (res.ok && data.result) {
        setFormData(prev => ({
          ...prev,
          training_data: [...prev.training_data, { id: Date.now().toString(), type: 'link', source: label, content: data.result, date: new Date().toISOString() }]
        }));
      } else {
        toast.error("Failed to extract text: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const addTrainingDataImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const label = prompt("Enter a short label to remember this image (e.g. 'Twitter thread screenshot'):") || file.name;

      setIsExtracting(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result;
          const res = await fetch('/api/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image })
          });
          const data = await res.json();
          
          if (res.ok && data.result) {
            setFormData(prev => ({
              ...prev,
              training_data: [...prev.training_data, { id: Date.now().toString(), type: 'image', source: label, content: data.result, date: new Date().toISOString() }]
            }));
          } else {
            toast.error("Failed to extract text: " + (data.error || "Unknown error"));
          }
          setIsExtracting(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        toast.error("Error reading image: " + err.message);
        setIsExtracting(false);
      }
    };
    input.click();
  };

  const removeTrainingData = (id) => {
    setFormData(prev => ({
      ...prev,
      training_data: prev.training_data.filter(t => t.id !== id)
    }));
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
          
          <div className="flex gap-4">
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
              <p className="text-body-sm text-secondary mb-6">Adjust the sliders to fine-tune how the AI writes for this specific persona.</p>
              
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
                  Provide successful posts or reference materials that define this persona's style. The AI will analyze and mimic the sentence structure, formatting, and pacing of these references.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={addTrainingDataText}
                    disabled={isExtracting}
                    className="px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-label-sm hover:bg-primary/20 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">notes</span> Text
                  </button>
                  <button 
                    onClick={addTrainingDataLink}
                    disabled={isExtracting}
                    className="px-3 py-2 bg-surface-main text-on-surface border border-border-subtle rounded-lg text-label-sm hover:border-primary/50 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">link</span> Link
                  </button>
                  <button 
                    onClick={addTrainingDataImage}
                    disabled={isExtracting}
                    className="px-3 py-2 bg-surface-main text-on-surface border border-border-subtle rounded-lg text-label-sm hover:border-primary/50 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">image</span> Image
                  </button>
                  {isExtracting && <span className="text-[12px] text-primary animate-pulse ml-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> Extracting...</span>}
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {(!formData.training_data || formData.training_data.length === 0) ? (
                  <div className="p-10 border border-dashed border-border-subtle rounded-xl text-center text-secondary">
                    No training data added for this profile yet.
                  </div>
                ) : (
                  formData.training_data.map((data, index) => (
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
                          onClick={() => removeTrainingData(data.id)}
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
                {/* Subtle background pattern */}
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

        </div>
      </div>
    </main>
  );
}
