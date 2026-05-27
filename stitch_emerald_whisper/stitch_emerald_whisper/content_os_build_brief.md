# Content OS — Build Brief
### Personal AI-Powered Content System | LinkedIn-First | Africa-Grounded

---

## How to Use This Brief

This document is structured for **phased development**. Do not build everything at once.

Each module is self-contained. Build it, test it fully, confirm it works as described, then move to the next. The order matters — earlier modules are dependencies for later ones.

**Read the full brief first for context, then return to Module 1 and start there.**

---

## 1. What This Is

A personal web app for a single user. Not a SaaS product. No multi-tenancy required.

It functions as a **content chief of staff** — capturing raw thoughts, voice notes, videos, and lived experiences, then turning them into structured content distributed across LinkedIn, YouTube Shorts, Instagram, and Facebook.

The app has a built-in perspective: the user is an AI educator and builder targeting the African market. Every piece of content this app produces is filtered through that lens.

---

## 2. The User

- Works a 9-5 job Monday to Friday
- Weekday content sessions: 10–20 minutes (capture and quick drafts only)
- Weekend sessions: 1–3 hours (longer video, production, scheduling)
- Content style: raw, practical, experience-driven — not polished corporate
- Niche: AI for business productivity, specifically for the African market
- Goal: Build genuine public authority as an AI educator and builder over 12 months. Let trust attract opportunities — never chase.
- Audience: African business owners, professionals wanting to use AI in their careers, tech-curious beginners

---

## 3. Core Philosophy (Must Inform Every AI Prompt in the App)

**Three things must be true about every content output:**

1. **Africa-grounded** — tools, examples, pricing, and cultural framing must reflect African market realities. Not adapted from Western content — built from the ground up for this context.
2. **Experience-first** — content comes from what the user has lived, built, or observed. The app pulls this out. It does not generate generic AI posts.
3. **Lowest friction possible** — a weekday session is 10–20 minutes. The app must produce something genuinely useful in that window.

**On CTAs:** The app never generates "hire me" language. Every call to action points to the next value exchange — a free tool, a follow, a comment prompt, a resource. Business opportunities come as a byproduct of trust, not as a response to pitching.

---

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React | Fully mobile-responsive. User is frequently on the go. |
| Backend / DB | Supabase | Auth, database, file storage |
| Auth | Supabase Auth | Single user. Email login only. No multi-tenant. |
| AI / Content Generation | Claude API (Anthropic) | Model: `claude-sonnet-4-20250514`. All generation, interview engine, Africa Lens filter. |
| Transcription | Whisper API (OpenAI) or Deepgram | For voice notes and video uploads |
| Trend Feed | Claude web search tool or Perplexity API | Weekly pull, not live feed in v1 |
| File Storage | Supabase Storage | Voice notes, video uploads, generated drafts |

**V1 has no social media API integrations.** All content is copy/export only. Auto-posting is a v2 feature.

---

## 5. The Seven Modules (Build in This Order)

---

### MODULE 1 — Settings & Voice Configuration
**Build this first. Every other module depends on it.**

This is the user's identity layer. The data collected here is injected into every AI prompt the app makes.

**Fields to collect:**
- Name and role/title
- Positioning statement (2–3 sentences: who they help, how, what makes them different)
- Primary niche (pre-filled: AI for business productivity, African market)
- Audience description (pre-filled: business owners, professionals, curious beginners in Africa)
- Tone slider: Casual ↔ Professional (1–5 scale)
- Rawness slider: Raw & unfiltered ↔ Polished & structured (1–5 scale)
- Topics/sectors they cover (multi-select + ability to add custom)
- Up to 5 example LinkedIn posts they like (pasted text — used as style reference)
- Industries they want to be known in (e.g. fintech, agriculture, government/compliance, retail)

**How this is used:**
Every AI call in the app prepends a system context block built from this config. It is never shown to the user mid-flow — it works silently in the background.

**Screen:** Single settings page. Accessible from nav at all times. Changes apply immediately to all future generations.

---

### MODULE 2 — Capture
**The starting point for all content creation.**

Three input modes on one screen. User picks the mode that matches what they have in the moment.

#### Mode A — Voice Note
- In-browser audio recorder (must work on mobile Chrome and Safari)
- Record button, pause, stop, playback before submitting
- On submit: audio sent to Whisper/Deepgram for transcription
- Transcript displayed to user for quick review (editable)
- Then routed to the Interview Engine (Module 3)

#### Mode B — Video Upload
- Accepts mp4, mov, webm. Max 500MB in v1.
- Upload progress indicator
- On upload complete: audio extracted, sent to transcription
- Transcript displayed, key ideas highlighted
- User can tag the video type: Talking Head | Screen Recording | Mixed
- Then routed to Content Generation Engine (Module 4) — video uploads skip the interview and go straight to generation with an option to add context manually

#### Mode C — Text / Idea Entry
- Simple large textarea
- Placeholder: "Drop a raw idea, a topic you want to cover, or paste something you read..."
- Optional: "I have experience with this" checkbox — if checked, routes to Interview Engine first
- If unchecked, routes directly to Content Generation Engine

**Important:** Capture screen should also show a "What should I work on today?" prompt at the top — a single contextual suggestion based on day of week, what's in the queue, and what's been posted recently. (This logic can be simple in v1 — e.g. Monday = new idea, Wednesday = repurpose existing draft, Friday = schedule for weekend.)

---

### MODULE 3 — Interview Engine
**The most important module. The heart of the product.**

This module runs after a voice note or text idea capture. Its job is to pull out the specific, practical, Africa-grounded story before any content is written.

**Flow:**
1. App reads the transcript or idea text
2. Generates 3–5 targeted follow-up questions (not generic — specific to what was said)
3. Questions displayed one at a time in a chat-style UI
4. User types or voice-records their answers
5. After each answer, the AI decides: ask a follow-up OR mark as ready
6. When ready, app shows: *"I have enough to work with. Ready to generate your content?"*
7. User confirms → routed to Content Generation Engine (Module 4)

**What the interview questions must try to extract:**
- The specific practical example, result, or observation (not the abstract concept)
- The Africa/local context angle (what's different here vs. what Western creators say)
- The "so what" for the audience (why does this matter to an African business owner right now)
- Any contrarian or surprising take the user holds
- A concrete action the audience can take today

**AI prompt design note:**
The system prompt for this module must be given the full user config from Module 1. It must be instructed to ask questions that unlock specificity. Questions like "Can you give me a specific example from your work or your market?" are good. Questions like "Can you tell me more about that?" are not acceptable.

The interview must feel like talking to a smart content strategist who knows African business — not filling in a form.

**Chat UI requirements:**
- Clean, message-bubble style
- AI questions on the left, user answers on the right
- Voice input option on each answer field (transcribes inline)
- "Skip this question" option on each question
- Session is saved automatically — user can leave and return

---

### MODULE 4 — Content Generation Engine
**Takes interview output (or video transcript) and produces the full content package.**

**Input:** Compiled interview answers + Africa Lens filter result (see below) + user config from Module 1

**Africa Lens Filter (runs before generation, not a visible screen):**
Before writing any content, a pre-processing prompt checks:
- Is the tool/concept referenced actually accessible in African markets? (cost, data requirements, availability)
- Is there a local business example that can replace a Western one?
- Does the framing assume infrastructure, culture, or systems that don't apply in Africa?
- What angle would matter specifically to an African professional or business owner that a US/UK creator would miss?

The output of this filter is appended as additional context to the generation prompt. It is not shown to the user.

**Outputs generated:**

| Platform | Format | Notes |
|---|---|---|
| LinkedIn | Long text post | Hook → context → value bullets → CTA to next value. 150–300 words. |
| LinkedIn | Carousel outline | 6–10 slides. Each slide: headline + 2–3 body lines. |
| LinkedIn | Poll idea | When topic suits debate or opinion-gathering |
| YouTube Shorts | 45–60 sec script | Energetic hook, core insight, closing prompt |
| Instagram | Reel caption | 2–3 punchy lines + relevant hashtag block |
| Facebook | Community post | Warmer, conversational tone, ends with question to drive comments |

**UI requirements:**
- Tabbed by platform (LinkedIn | YouTube | Instagram | Facebook)
- Within LinkedIn tab: sub-tabs for Post | Carousel | Poll
- Each output has three buttons: **Regenerate** | **Edit** | **Copy**
- Edit opens an inline text editor — no separate screen
- "Generate all" button and "Generate selected" option
- A **"Suggest a free resource idea"** button — looks at the content topic and suggests a simple practical thing the user could build and give away (template, mini-tool, checklist). Informational only in v1, no build functionality.
- All generated content is auto-saved as a draft

---

### MODULE 5 — Build Launch Campaign Generator
**For when the user finishes building a tool, app, or resource and wants to launch it publicly.**

This is a separate entry point from Capture — it's specifically for announcing something built.

**Input fields:**
- Project name
- What it does (plain language, 2–3 sentences)
- Who it's for
- Link or screenshot (optional)
- What problem it solves
- Is it free? (yes/no)

**Output:**
A 4-part LinkedIn content sequence:

| Post | Purpose | Timing Suggestion |
|---|---|---|
| Post 1 | The problem it solves | Day of launch |
| Post 2 | Behind the build — process and decisions | 2 days later |
| Post 3 | Demo or show it working | 4 days later |
| Post 4 | Reaction, lessons learned, open door | 1 week later |

Each post is generated in full, with the same Africa Lens filter applied. All four are saved as drafts and can be dragged onto the calendar.

**Why this module exists:**
The user's builds are not separate from their content — they are the most credible content. This module makes every build a content event with a structured distribution plan.

---

### MODULE 6 — Content Calendar
**Build after Modules 1–4 are solid.**

Week and month view. Shows all scheduled and draft content across platforms.

**Features:**
- Toggle between week view and month view
- Drag draft cards from a sidebar queue onto calendar slots
- Platform colour coding: LinkedIn (blue) | YouTube (red) | Instagram (purple) | Facebook (dark blue)
- Weekend slots visually distinct — labelled "deep work" with a different background
- **Content health indicator** — a simple weekly summary: e.g. "This week: 3 LinkedIn posts, 1 carousel, 1 Short. Consider adding variety." Flags if the week is too heavy on one format or one platform.
- Click any card to open the draft in the Content Generation Engine for editing
- "What to work on today" logic: surfaces the most relevant action based on day of week and queue state

**Data model:**
Each calendar entry stores: platform, format, draft content, scheduled date, status (draft / scheduled / posted — posted is manually marked by user in v1).

---

### MODULE 7 — Idea Bank & History
**Build last.**

A simple searchable library of everything captured and created.

**Contains:**
- All voice note transcripts (with original audio playable)
- All raw ideas entered
- All generated content packages (linked to their source capture)
- All interview sessions (readable as a transcript)
- Tags by topic, platform, format, and date

**Features:**
- Search by keyword
- Filter by type (voice note | video | text | generated post | interview)
- Any past idea can be "reactivated" — sent back through the Interview Engine or straight to the Content Generation Engine
- A simple conversation log: when a piece of content leads to a real enquiry or opportunity, user can note it here. Over time this shows which topics and formats generate the most real-world response.

---

## 6. Weekly Rhythm the App Is Designed Around

The app is built for this pattern. Every design decision should support it:

**Monday–Friday (10–20 min windows)**
- Open app → see "What to work on today"
- Record a voice note from something that happened or something read
- Answer interview questions
- Queue a draft
- OR: pick a trend topic, answer 3 questions, generate a LinkedIn post

**Saturday–Sunday (1–3 hour sessions)**
- Record a longer practical video
- App processes and generates full multi-platform package
- Review, edit, schedule the coming week
- Work on a build launch campaign if a tool was completed

---

## 7. Screens Summary

| Screen | Module | Priority |
|---|---|---|
| Settings / Voice Config | 1 | Build first |
| Capture (Voice / Video / Text) | 2 | Build second |
| Interview Engine (chat UI) | 3 | Build third |
| Content Output (tabbed by platform) | 4 | Build fourth |
| Build Launch Campaign | 5 | Build fifth |
| Content Calendar | 6 | Build sixth |
| Idea Bank & History | 7 | Build last |
| Dashboard / Home | Wrapper | Build after Modules 1–4 |

---

## 8. Dashboard / Home Screen

Assembled after core modules are working. Should show:

- "What to work on today" — single contextual prompt
- Recent drafts (last 3, with quick-edit access)
- Week at a glance (mini calendar strip)
- Quick capture button (always visible, opens Capture screen)
- Content health summary for the current week

---

## 9. What Makes This Different

Existing tools (Taplio, Hypefury, Buffer, Publer) are scheduling and light-AI writing tools. They have no niche intelligence, no interview engine, no cultural filter.

This app's advantage:
- **Interview engine** pulls content from lived experience — not templates
- **Africa Lens** is a perspective layer no other tool has
- **Rhythm design** is built for someone with a 9-5 who wants to build real authority without burning out
- **Build launcher** connects the user's actual work to their content — proof, not just talk

---

## 10. V1 Scope — Build Only This

- [ ] Module 1: Settings & Voice Config
- [ ] Module 2: Capture (all three modes)
- [ ] Module 3: Interview Engine
- [ ] Module 4: Content Generation Engine
- [ ] Module 5: Build Launch Campaign Generator
- [ ] Module 6: Content Calendar (basic)
- [ ] Module 7: Idea Bank & History (basic)
- [ ] Dashboard / Home

**Not in V1 — do not build yet:**
- Social media API integrations (LinkedIn, Instagram, Facebook, YouTube)
- Analytics or post performance tracking
- Lead gen campaign planner
- Team or collaborator access
- Notification system

---

## 11. AI Prompt Design — Critical Notes for the Dev Agent

The quality of this app lives or dies in the prompt layer. These are non-negotiable:

**Every AI call must include:**
- Full user config from Module 1 (name, niche, audience, tone settings, example posts)
- The Africa Lens context block (pre-processed before generation)
- The output format specification (which platform, which format, what structure)

**The Interview Engine prompt must:**
- Be given the raw transcript or idea text in full
- Be instructed to identify what's missing — the specific example, the local angle, the actionable insight
- Generate questions that sound like a smart strategist, not a chatbot
- Never ask generic follow-ups like "Can you elaborate?" or "Tell me more"
- Know when it has enough — stop after 5 questions maximum

**The Africa Lens filter prompt must:**
- Run silently before every generation
- Check cost accessibility, cultural fit, infrastructure assumptions, local examples
- Output additional context paragraphs (not visible to user) that are appended to the generation prompt

**Content generation prompts must:**
- Match the platform's native format and tone exactly
- LinkedIn: hook-first, scannable, arrow bullets, value-dense, ends with CTA to next value
- Shorts script: fast, direct, one idea only, ends with a prompt
- Instagram: short, punchy, visual-first mindset even in text
- Facebook: warmer, community feel, question at the end
- Never produce generic AI content. Every output must sound like a specific person with a specific point of view about AI in Africa.

---

## 12. Starting Prompt for Claude Code

When beginning each module, give Claude Code this instruction before any other:

> "We are building one module at a time. Today we are building **[Module Name]** only. Do not scaffold or stub out other modules. Do not connect to modules that don't exist yet. Build this module completely — all states, all edge cases, all error handling — before we move on. When this module is done and tested, I will give you the next one."

---

*Brief version: 1.0 | Ready for development*
