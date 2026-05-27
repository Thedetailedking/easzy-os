"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function ChatContent() {
  const searchParams = useSearchParams();
  const captureId = searchParams.get("capture_id");
  const router = useRouter();

  const [activeCaptureId, setActiveCaptureId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setActiveCaptureId(captureId);
  }, [captureId]);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (inputText === "" && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [inputText]);

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Scroll to bottom on messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!activeCaptureId) {
      setMessages([{ role: "assistant", content: "Hi! What would you like to work on today? You can share a topic, and I'll help you develop it into content." }]);
      return;
    }

    const loadSession = async () => {
      setIsLoading(true);
      try {
        // Fetch Active Persona Profile
        let personaContext = "You are an expert content interviewer.";
        let llmProvider = "openrouter";
        let llmModel = "anthropic/claude-3-haiku";
        let llmApiKey = "";

        const { data: profile } = await supabase.from('user_settings').select('*').eq('is_active', true).single();
        if (profile) {
          llmProvider = profile.llm_provider || "openrouter";
          llmModel = profile.llm_model || "anthropic/claude-3-haiku";
          llmApiKey = profile.llm_api_key || "";
          
          const trainingStr = (profile.training_data || []).map((t, i) => `REFERENCE ${i+1}:\n${t.content}`).join("\n\n");
          personaContext = `You are an expert content interviewer. You are interviewing the user to help them craft content that fits the following Persona:
Name: ${profile.user_name}
Role: ${profile.primary_role}
Target Audience: ${profile.target_audience}
Goal/Positioning: ${profile.positioning_statement}

Voice Dynamics (Scale 0-100): Tone: ${profile.tone}, Rawness: ${profile.rawness}, Density: ${profile.density}

TRAINING DATA:
${trainingStr || "No training data provided."}

YOUR INSTRUCTIONS:
- You are helping the user develop their content.
- Be highly flexible and context-aware! Acknowledge the user's intent. If they are "brain dumping" or want to write a simple post/text directly without an intensive interview, DO NOT persistently badger them with target audience, CTA, or niche questions. Instead, suggest a quick layout or outline immediately, and state "Feel free to click 'I'm Done! Generate Content' below to see the formatted post, or let me know if you want to tweak anything."
- If the user explicitly asks you to draft/write a post or seems ready, suggest a natural, human-sounding draft immediately instead of asking more clarifying questions.
- Never use sterile AI buzzwords or cliché transitional phrases ("delve", "tapestry", "leveraging", "landscape"). Avoid forcing regional/national context ("African business", "Nigerian market") awkwardly into the conversation unless the user specifically initiates it.
- Ask exactly ONE short, conversational follow-up or clarifying question to refine the idea. Keep it natural, human, warm, and engaging.`;
        }
        const { data: captureData } = await supabase.from('captures').select('*').eq('id', activeCaptureId).single();
        const { data: sessions } = await supabase.from('interview_sessions').select('*').eq('capture_id', activeCaptureId).order('created_at', { ascending: false }).limit(1);
        const sessionData = sessions?.[0];
        
        if (sessionData && sessionData.messages && sessionData.messages.length > 0) {
          setSessionId(sessionData.id);
          setMessages(sessionData.messages);
        } else if (captureData) {
          const prompt = `The user captured this thought: "${captureData.transcript}". Ask exactly ONE short, clarifying question to help them expand this into a full piece of content.`;
          
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
          
          const firstMsgUser = { role: "user", content: captureData.transcript };
          const firstMsgAi = { role: "assistant", content: data.result };
          
          const initialMessages = [firstMsgUser, firstMsgAi];
          setMessages(initialMessages);
          
          // Save session
          const { data: newSession } = await supabase.from('interview_sessions').insert([{ capture_id: activeCaptureId, messages: initialMessages }]).select().single();
          if (newSession) setSessionId(newSession.id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSession();
  }, [activeCaptureId]);

  const handleSend = async (textToSend = inputText) => {
    if (!textToSend.trim() || isLoading) return;
    
    const userMsg = { role: "user", content: textToSend };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (textToSend === inputText) setInputText("");
    setIsLoading(true);

    try {
      let currentCaptureId = activeCaptureId;
      let currentSessionId = sessionId;

      // Direct chat auto-registration flow
      if (!currentCaptureId) {
        // Create a new capture for this direct chat session
        const { data: newCap, error: capErr } = await supabase
          .from('captures')
          .insert([{ type: 'Text Idea', transcript: textToSend }])
          .select()
          .single();
        if (capErr) throw capErr;
        
        currentCaptureId = newCap.id;
        setActiveCaptureId(newCap.id);
        
        // Create a new interview session
        const { data: newSession, error: sessErr } = await supabase
          .from('interview_sessions')
          .insert([{ capture_id: newCap.id, messages: [userMsg] }])
          .select()
          .single();
        if (sessErr) throw sessErr;
        
        currentSessionId = newSession.id;
        setSessionId(newSession.id);
        
        // Silently update the URL so if the user refreshes or clicks "I'm Done", the ID is set
        router.replace(`/chat?capture_id=${newCap.id}`, { scroll: false });
      }

      // Fetch Active Persona Profile
      let personaContext = "You are an expert content interviewer.";
      let llmProvider = "openrouter";
      let llmModel = "anthropic/claude-3-haiku";
      let llmApiKey = "";

      const { data: profile } = await supabase.from('user_settings').select('*').eq('is_active', true).single();
      if (profile) {
        llmProvider = profile.llm_provider || "openrouter";
        llmModel = profile.llm_model || "anthropic/claude-3-haiku";
        llmApiKey = profile.llm_api_key || "";
        
        const trainingStr = (profile.training_data || []).map((t, i) => `REFERENCE ${i+1}:\n${t.content}`).join("\n\n");
        personaContext = `You are an expert content interviewer. You are interviewing the user to help them craft content that fits the following Persona:
Name: ${profile.user_name}
Role: ${profile.primary_role}
Target Audience: ${profile.target_audience}
Goal/Positioning: ${profile.positioning_statement}

Voice Dynamics (Scale 0-100): Tone: ${profile.tone}, Rawness: ${profile.rawness}, Density: ${profile.density}

TRAINING DATA:
${trainingStr || "No training data provided."}

YOUR INSTRUCTIONS:
- You are helping the user develop their content.
- Be highly flexible and context-aware! Acknowledge the user's intent. If they are "brain dumping" or want to write a simple post/text directly without an intensive interview, DO NOT persistently badger them with target audience, CTA, or niche questions. Instead, suggest a quick layout or outline immediately, and state "Feel free to click 'I'm Done! Generate Content' below to see the formatted post, or let me know if you want to tweak anything."
- If the user explicitly asks you to draft/write a post or seems ready, suggest a natural, human-sounding draft immediately instead of asking more clarifying questions.
- Never use sterile AI buzzwords or cliché transitional phrases ("delve", "tapestry", "leveraging", "landscape"). Avoid forcing regional/national context ("African business", "Nigerian market") awkwardly into the conversation unless the user specifically initiates it.
- Ask exactly ONE short, conversational follow-up or clarifying question to refine the idea. Keep it natural, human, warm, and engaging.`;
      }
      
      // Save user message immediately so it's not lost if they navigate away
      if (currentSessionId) {
        await supabase.from('interview_sessions').update({ messages: newMessages }).eq('id', currentSessionId);
      } else {
        await supabase.from('interview_sessions').update({ messages: newMessages }).eq('capture_id', currentCaptureId);
      }

      // Build conversation history for context
      const historyStr = newMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      const prompt = `Here is the conversation so far:\n${historyStr}\n\nRespond as the expert content assistant. Ask exactly ONE follow-up question or suggest a structure based on what we've discussed.`;

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
      const aiMsg = { role: "assistant", content: data.result };
      
      const updatedMessages = [...newMessages, aiMsg];
      setMessages(updatedMessages);

      // Update session in DB with AI response
      if (currentSessionId) {
        await supabase.from('interview_sessions').update({ messages: updatedMessages }).eq('id', currentSessionId);
      } else {
        await supabase.from('interview_sessions').update({ messages: updatedMessages }).eq('capture_id', currentCaptureId);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice recording functions
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
      
      // Populate input field for editing instead of auto-sending
      setInputText(transcript);
    } catch (error) {
      console.error(error);
      toast.error("Error processing voice note.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const jumpToOutput = () => {
    router.push(`/output?capture_id=${activeCaptureId}`);
  };

  return (
    <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-8 md:py-12 px-4 md:px-gutter-desktop pb-64 md:pb-56 w-full"
      >
        <div className="w-full max-w-3xl space-y-8 md:space-y-12">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-secondary mt-20">No active session found. Go to the Capture page to start a new thought!</div>
          )}
          
          {messages.map((msg, idx) => (
            msg.role === 'assistant' ? (
              <div key={idx} className="flex flex-col items-start max-w-2xl group animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center gap-3 mb-2 md:mb-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-midnight-void text-primary-fixed flex items-center justify-center rounded-lg shrink-0">
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]">psychology</span>
                  </div>
                  <span className="font-label-sm md:font-label-md text-secondary">CLAUDE (INTERVIEW ENGINE)</span>
                </div>
                <div className="bg-surface-main border border-midnight-void p-5 md:p-8 rounded-xl relative shadow-sm">
                  <p className="text-body-lg md:text-headline-md font-headline-md leading-relaxed text-on-surface whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            ) : (
              <div key={idx} className="flex flex-col items-end self-end max-w-2xl ml-auto animate-[fadeIn_0.5s_ease-out]">
                <div className="flex items-center gap-3 mb-2 md:mb-4">
                  <span className="font-label-sm md:font-label-md text-secondary">YOU</span>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-container text-on-primary-container flex items-center justify-center rounded-lg overflow-hidden shrink-0">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                </div>
                <div className="bg-surface-main border border-midnight-void p-5 md:p-8 rounded-xl shadow-sm text-left md:text-right">
                  <p className="text-body-md md:text-body-lg text-on-surface leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            )
          ))}
          
          {isLoading && messages.length > 0 && (
             <div className="flex flex-col items-start max-w-2xl animate-[fadeIn_0.5s_ease-out]">
               <div className="flex items-center gap-3 mb-2 md:mb-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-midnight-void text-primary-fixed flex items-center justify-center rounded-lg shrink-0">
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]">psychology</span>
                  </div>
                  <span className="font-label-sm md:font-label-md text-secondary">THINKING...</span>
               </div>
               <div className="bg-surface-main border border-midnight-void p-5 md:p-8 rounded-xl relative shadow-sm flex gap-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></div>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Input Dock (Sticky Bottom) - Changed to Absolute to stay inside flex-1 */}
      <div className="absolute bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 p-4 md:p-gutter-desktop z-30 pointer-events-none">
        
        {/* Action Bar (Top of Dock) */}
        {messages.length > 2 && (
          <div className="max-w-3xl mx-auto flex justify-end mb-4 pointer-events-auto">
            <button onClick={jumpToOutput} className="bg-success-vibrant text-midnight-void font-label-md px-6 py-2 rounded-full shadow-lg hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">magic_button</span>
              I'm Done! Generate Content
            </button>
          </div>
        )}

        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md border border-midnight-void rounded-2xl p-4 md:p-6 pointer-events-auto flex items-center gap-3 md:gap-6 shadow-xl relative overflow-hidden">
          {/* Progress bar for transcription */}
          {isTranscribing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-surface-subtle overflow-hidden">
              <div className="h-full bg-primary w-1/3 animate-[slide_1s_ease-in-out_infinite]"></div>
            </div>
          )}
          
          <div className="flex-1 relative">
            <textarea 
              ref={inputRef}
              value={inputText}
              onChange={e => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  // If on mobile viewports (screen width < 768px), allow Enter key to make a newline instead of sending
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    return; // Let default behavior insert newline
                  }
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading || isRecording || isTranscribing}
              className="w-full bg-surface-subtle border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl px-4 py-3 md:px-6 md:py-4 text-body-sm md:text-body-md pr-28 md:pr-32 transition-all outline-none disabled:opacity-50 resize-none custom-scrollbar overflow-y-auto block" 
              style={{ minHeight: '52px', maxHeight: '150px' }}
              placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "Type your response to Claude..."}
              rows={1}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 md:gap-3">
              <button 
                onClick={isRecording ? stopRecording : startRecording} 
                disabled={isLoading || isTranscribing} 
                className={`material-symbols-outlined flex items-center justify-center w-8 h-8 rounded-full transition-all disabled:opacity-50 ${isRecording ? 'bg-error text-white animate-pulse' : 'text-secondary hover:bg-surface-main hover:text-primary'}`}
                title="Send Voice Note"
              >
                {isRecording ? 'stop' : 'mic'}
              </button>
              <div className="w-px h-6 bg-border-subtle"></div>
              <button onClick={() => handleSend()} disabled={isLoading || isRecording || isTranscribing || !inputText.trim()} className="material-symbols-outlined text-primary hover:scale-110 transition-transform disabled:opacity-50">
                send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadHistory() {
      const { data } = await supabase.from('captures').select('*').order('created_at', { ascending: false }).limit(20);
      if (data) setHistoryItems(data);
    }
    loadHistory();
  }, []);

  const handleDeleteCapture = (e, id) => {
    e.stopPropagation(); // Prevent card onClick trigger
    setDeleteConfirmId(id);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteCapture = async () => {
    if (!deleteConfirmId) return;
    try {
      const { error } = await supabase.from('captures').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      
      toast.success("Session deleted successfully.", { icon: '🗑️' });
      
      // Update local state list
      setHistoryItems(prev => prev.filter(item => item.id !== deleteConfirmId));
      
      // If we deleted the active capture session, redirect to fresh /chat
      const activeId = new URLSearchParams(window.location.search).get("capture_id");
      if (activeId === deleteConfirmId) {
        router.push('/chat');
      }
    } catch (err) {
      console.error("Delete capture error:", err);
      toast.error("Failed to delete session.");
    } finally {
      setShowDeleteConfirmModal(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <main className="md:ml-64 h-[100dvh] md:h-screen flex flex-col md:flex-row relative pt-16 bg-surface-subtle overflow-hidden">
      
      {/* Mobile History Toggle */}
      <div className="md:hidden bg-surface-main p-4 border-b border-border-subtle flex justify-between items-center z-40 shadow-sm relative">
         <span className="font-jetbrains-mono text-label-sm uppercase font-bold text-secondary">Session Status</span>
         <button onClick={() => setShowHistory(!showHistory)} className={`font-label-sm flex items-center gap-1 transition-colors ${showHistory ? 'text-primary' : 'text-secondary'}`}>
           <span className="material-symbols-outlined text-[18px]">{showHistory ? 'close' : 'history'}</span>
           {showHistory ? 'Close History' : 'History'}
         </button>
      </div>

      {/* History Sidebar */}
      <div className={`${showHistory ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static top-[120px] md:top-0 left-0 bottom-16 md:bottom-0 w-full md:w-80 bg-surface-main md:border-r border-border-subtle flex flex-col z-30 transition-transform duration-300 shadow-xl md:shadow-none`}>
         <div className="p-4 border-b border-border-subtle hidden md:block">
            <h2 className="font-headline-sm text-on-surface">Recent Sessions</h2>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {historyItems.map(item => (
               <div 
                 key={item.id} 
                 onClick={() => {
                   setShowHistory(false);
                   router.push(`/chat?capture_id=${item.id}`);
                 }}
                 className="p-4 bg-surface-subtle hover:bg-surface-dim rounded-xl cursor-pointer border border-border-subtle hover:border-primary/50 transition-all flex flex-col gap-2 group relative"
               >
                 <div className="flex justify-between items-center w-full">
                   <span className={`text-[10px] font-jetbrains-mono font-bold px-2 py-0.5 rounded w-fit ${item.type === 'Voice Note' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                     {item.type.toUpperCase()}
                   </span>
                   <button 
                     onClick={(e) => handleDeleteCapture(e, item.id)}
                     className="text-secondary hover:text-error opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 flex rounded hover:bg-surface-main"
                     title="Delete Conversation"
                   >
                     <span className="material-symbols-outlined text-[16px]">delete</span>
                   </button>
                 </div>
                 <p className="text-body-sm font-medium text-on-surface line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">{item.transcript || "Empty"}</p>
                 <p className="text-[10px] text-secondary font-jetbrains-mono">{new Date(item.created_at).toLocaleDateString()}</p>
               </div>
            ))}
            {historyItems.length === 0 && (
              <div className="text-center text-secondary py-10 flex flex-col items-center opacity-70">
                <svg className="w-12 h-12 mb-3 text-border-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-[11px] font-jetbrains-mono uppercase tracking-widest text-on-surface mb-1">No History</span>
                <span className="text-[10px]">Your chats will be saved here.</span>
              </div>
            )}
         </div>
      </div>

      <div className="flex-1 flex flex-col relative h-full w-full">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center font-jetbrains-mono text-secondary">Loading Engine...</div>}>
          <ChatContent />
        </Suspense>
      </div>

      {/* Custom Premium Glassmorphic Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-midnight-void/40 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface-main border border-border-subtle p-6 rounded-3xl max-w-sm w-full mx-4 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="w-12 h-12 bg-error/10 text-error rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">Delete Chat Session?</h3>
            <p className="text-body-sm text-secondary mb-6 leading-relaxed">
              This will permanently delete this conversation and all associated history from your vault. This action is irreversible.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmId(null);
                }} 
                className="flex-1 py-3 bg-surface-subtle hover:bg-surface-dim text-on-surface rounded-xl font-label-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteCapture}
                className="flex-1 py-3 bg-error text-white rounded-xl font-label-md hover:bg-error/90 active:scale-[0.98] transition-all shadow-md shadow-error/10 font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
