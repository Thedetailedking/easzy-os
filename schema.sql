-- Run this script in your Supabase SQL Editor to create the necessary tables

-- 1. User Settings (To store the Module 1 Voice Config & Personas)
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT NOT NULL DEFAULT 'Master Profile',
  is_active BOOLEAN DEFAULT FALSE,
  user_name TEXT NOT NULL,
  primary_role TEXT NOT NULL DEFAULT 'Creator & Educator',
  target_audience TEXT NOT NULL,
  core_topics TEXT NOT NULL,
  positioning_statement TEXT,
  
  -- Sliders / Voice Dynamics
  tone INTEGER DEFAULT 75,
  rawness INTEGER DEFAULT 32,
  density INTEGER DEFAULT 88,
  
  -- Training Data Array (e.g. text blocks of good posts)
  training_data JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Deep Engine Configuration
  llm_provider TEXT DEFAULT 'openrouter',
  llm_model TEXT DEFAULT 'anthropic/claude-3-haiku',
  llm_api_key TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Captures (To store Voice Notes, Text Ideas, and transcribed text)
CREATE TABLE public.captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('Voice Note', 'Text Idea', 'Media Sync', 'URL Capture')),
  transcript TEXT NOT NULL,
  raw_audio_url TEXT, -- For voice notes, if you want to store the actual audio later
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Drafts (To store the AI-generated posts)
CREATE TABLE public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID REFERENCES public.captures(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('LinkedIn', 'Substack', 'YouTube', 'Instagram', 'Facebook')),
  post_type TEXT NOT NULL, -- e.g., 'Text Post', 'Newsletter', 'Video Script'
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Review', 'Ready', 'Scheduled', 'Published')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Interview Sessions (To store the chat history)
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID REFERENCES public.captures(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {role: 'user' | 'assistant', content: string}
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow anonymous access for development
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon" ON public.user_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.captures FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.drafts FOR ALL USING (true);
CREATE POLICY "Allow all operations for anon" ON public.interview_sessions FOR ALL USING (true);

-- 5. Marketing Campaigns (To store campaign metadata, chat threads, and structured plans)
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
  
  -- Interactive Chat thread specific to this campaign
  chat_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Structured results generated and refined by the AI
  launch_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  outreach_scripts TEXT DEFAULT '',
  lead_gen_plan TEXT DEFAULT '',
  posting_strategy TEXT DEFAULT '',
  offer_calibrator TEXT DEFAULT '',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for marketing_campaigns
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for anon access in development
CREATE POLICY "Allow all operations for anon" ON public.marketing_campaigns FOR ALL USING (true);

