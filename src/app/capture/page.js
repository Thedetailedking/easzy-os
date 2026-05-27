"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function CapturePage() {
  const router = useRouter();

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Text Idea State
  const [textIdea, setTextIdea] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);

  // Recent Captures State
  const [recentCaptures, setRecentCaptures] = useState([]);

  useEffect(() => {
    async function loadRecent() {
      const { data } = await supabase.from('captures').select('*').order('created_at', { ascending: false }).limit(4);
      if (data) setRecentCaptures(data);
    }
    loadRecent();
  }, [isRecording, isSavingText]);

  // Handle Voice Recording
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

      const { data: captureData, error } = await supabase
        .from('captures')
        .insert([{ type: 'Voice Note', transcript: transcript }])
        .select()
        .single();

      if (error) throw error;

      router.push(`/chat?capture_id=${captureData.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Error processing voice note.");
      setIsTranscribing(false);
    }
  };

  const saveTextIdea = async () => {
    if (!textIdea.trim()) return;
    setIsSavingText(true);
    try {
      const { data: captureData, error } = await supabase
        .from('captures')
        .insert([{ type: 'Text Idea', transcript: textIdea }])
        .select()
        .single();

      if (error) throw error;

      router.push(`/chat?capture_id=${captureData.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Error saving text idea.");
      setIsSavingText(false);
    }
  };

  return (
    <main className="md:ml-64 pt-20 pb-24 md:pt-16 md:pb-8 min-h-screen bg-surface-subtle px-gutter-mobile md:px-gutter-desktop">
      <div className="max-w-container-max mx-auto">
        {/* Hero Heading */}
        <header className="mb-8 md:mb-12">
          <h2 className="text-headline-lg md:text-headline-xl font-headline-xl text-midnight-void mb-2">
            What should I work on today?
          </h2>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="flex items-center gap-1 text-label-sm md:text-label-md font-label-md text-primary bg-primary-container/10 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[16px] md:text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                bolt
              </span>
              Active Session
            </span>
            <span className="text-body-sm md:text-body-md font-body-md text-secondary">
              Pick a capture mode to start training your AI model.
            </span>
          </div>
        </header>

        {/* Capture Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-gutter-desktop mb-12">
          {/* Voice Note Card */}
          <section className="bg-surface-main border border-midnight-void p-6 md:p-8 rounded-xl flex flex-col gap-6 group hover:border-primary transition-colors relative overflow-hidden hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-surface-subtle rounded-lg border border-border-subtle text-midnight-void group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[28px] md:text-[32px]">
                  {isRecording ? "mic" : "mic_none"}
                </span>
              </div>
              <span className="text-[10px] font-jetbrains-mono text-secondary uppercase tracking-widest">
                Live Capture
              </span>
            </div>
            <div>
              <h3 className="text-headline-md font-headline-md text-midnight-void mb-2">
                Voice Note
              </h3>
              <p className="text-body-sm md:text-body-md font-body-md text-secondary leading-relaxed line-clamp-3">
                Record your lecture or thoughts. Easzy OS will transcribe and structure the data automatically.
              </p>
            </div>
            
            {/* Audio Visualizer */}
            <div className="mt-4 flex items-end justify-center gap-1 h-12 overflow-hidden">
              {[12,28,16,32,20,10,24,18,30,14].map((h, i) => (
                <div key={i} className={`visualizer-bar w-1 ${isRecording ? 'bg-error animate-pulse' : 'bg-primary'}`} style={{ animationDelay: `${i * 0.1}s`, height: `${isRecording ? h + (Math.random() * 10) : h}px` }}></div>
              ))}
            </div>

            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`mt-auto w-full py-3 border font-label-md transition-all rounded-lg flex items-center justify-center gap-2 active:scale-95 ${
                isRecording 
                  ? "bg-error text-white border-error hover:bg-error/90" 
                  : isTranscribing
                  ? "bg-surface-subtle text-secondary cursor-not-allowed border-border-subtle"
                  : "border-midnight-void text-midnight-void hover:bg-midnight-void hover:text-white"
              }`}
            >
              {isTranscribing ? (
                <><span className="material-symbols-outlined animate-spin text-[20px]">sync</span>Transcribing...</>
              ) : isRecording ? (
                <><span className="w-3 h-3 rounded bg-white"></span>Stop Recording</>
              ) : (
                "Start Recording"
              )}
            </button>
          </section>

          {/* Text/Idea Entry Card */}
          <section className="bg-surface-main border border-midnight-void p-6 md:p-8 rounded-xl flex flex-col gap-6 group hover:border-primary transition-colors relative hover:shadow-xl hover:-translate-y-1 duration-300 xl:col-span-2">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-surface-subtle rounded-lg border border-border-subtle text-midnight-void group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[28px] md:text-[32px]">edit_note</span>
              </div>
              <span className="text-[10px] font-jetbrains-mono text-secondary uppercase tracking-widest">Brainstorm</span>
            </div>
            <div>
              <h3 className="text-headline-md font-headline-md text-midnight-void mb-2">Text & Ideas</h3>
              <p className="text-body-sm md:text-body-md font-body-md text-secondary leading-relaxed">
                Paste outlines, raw notes, or long-form content. Perfect for structured curriculum planning.
              </p>
            </div>
            
            <div className="mt-2 flex-1 relative min-h-[120px]">
              <textarea
                value={textIdea}
                onChange={(e) => setTextIdea(e.target.value)}
                className="w-full h-full min-h-[120px] bg-surface-subtle border border-border-subtle rounded-lg p-3 text-body-sm text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Type or paste your markdown/raw text here..."
              ></textarea>
            </div>

            <button 
              onClick={saveTextIdea}
              disabled={isSavingText || !textIdea.trim()}
              className="w-full py-3 border border-midnight-void text-midnight-void font-label-md hover:bg-midnight-void hover:text-white transition-all rounded-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingText ? (
                <><span className="material-symbols-outlined animate-spin text-[20px]">sync</span>Saving Idea...</>
              ) : (
                "Save & Jump to Engine"
              )}
            </button>
          </section>

          {/* URL Parser Card */}
          <section className="bg-surface-main border border-midnight-void p-6 md:p-8 rounded-xl flex flex-col gap-6 group hover:border-primary transition-colors relative hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-surface-subtle rounded-lg border border-border-subtle text-midnight-void group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[28px] md:text-[32px]">link</span>
              </div>
              <span className="text-[10px] font-jetbrains-mono text-secondary uppercase tracking-widest">Import</span>
            </div>
            <div>
              <h3 className="text-headline-md font-headline-md text-midnight-void mb-2">URL Parser</h3>
              <p className="text-body-sm md:text-body-md font-body-md text-secondary leading-relaxed line-clamp-3">
                Paste an article, tweet, or newsletter URL. The app will extract and summarize the content automatically.
              </p>
            </div>
            
            <div className="mt-2 flex-1 flex items-center justify-center">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">link</span>
                <input
                  type="url"
                  className="w-full bg-surface-subtle border border-border-subtle rounded-lg pl-10 pr-4 py-4 text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <button className="mt-auto w-full py-3 border border-midnight-void text-midnight-void font-label-md hover:bg-midnight-void hover:text-white transition-all rounded-lg flex items-center justify-center gap-2 active:scale-95">
              Parse Content
            </button>
          </section>

        </div>

        {/* Recent Activity (Moved back to the bottom) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-headline-md font-headline-md text-midnight-void">
              Recent Captures
            </h4>
            <button onClick={() => router.push('/bank')} className="text-label-md font-label-md text-primary flex items-center gap-1 hover:underline">
              View All
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-gutter-desktop">
            {recentCaptures.length === 0 ? (
              <div className="md:col-span-4 py-8 text-center text-secondary bg-surface-main border border-border-subtle rounded-lg">No recent captures yet.</div>
            ) : recentCaptures.map((item, index) => (
              <div 
                key={item.id} 
                onClick={() => router.push(`/chat?capture_id=${item.id}`)}
                className={`${index === 0 ? 'md:col-span-2' : ''} bg-surface-main border border-border-subtle p-6 rounded-lg hover:shadow-sm transition-all flex ${index === 0 ? 'gap-4 items-center' : 'flex-col justify-between'} cursor-pointer hover:border-primary/50 group`}
              >
                {index === 0 && (
                  <div className={`w-16 h-16 rounded ${item.type === 'Voice Note' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'} flex items-center justify-center border border-border-subtle flex-shrink-0 group-hover:scale-105 transition-transform`}>
                     <span className="material-symbols-outlined text-[32px]">{item.type === 'Voice Note' ? 'mic' : 'edit_note'}</span>
                  </div>
                )}
                <div className={index === 0 ? "flex-1" : ""}>
                  <span className={`text-label-sm font-label-sm font-jetbrains-mono ${item.type === 'Voice Note' ? 'text-blue-500' : 'text-orange-500'} mb-2 block`}>
                    {item.type.toUpperCase()}
                  </span>
                  <h5 className={`text-body-md font-bold text-midnight-void ${index === 0 ? 'line-clamp-1' : 'line-clamp-2'}`}>
                    {item.transcript || "Empty Capture"}
                  </h5>
                  {index === 0 && (
                    <p className="text-body-sm text-secondary mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {index !== 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
                    <span className="material-symbols-outlined text-secondary text-[18px]">chat</span>
                    <span className="text-body-sm text-secondary">Continue Session</span>
                  </div>
                )}
                {index === 0 && (
                  <button className="material-symbols-outlined text-secondary hover:text-primary transition-colors">
                    arrow_forward
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
