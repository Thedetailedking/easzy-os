import OpenAI from "openai";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_PROMPT_LENGTH = 15_000;
const MAX_SYSTEM_LENGTH = 5_000;

const ALLOWED_COMMAND_TYPES = [
  "hormozi_hook",
  "warm_outreach",
  "lead_magnet",
  "seven_day_plan",
  "offer_calibrator",
  "style_calibrator",
  "launch_sequence",
  "",
];

export async function POST(request) {
  // Rate limiting: 15 requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "localhost";
  const { success } = rateLimit(`campaign-generate:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      prompt,
      systemContext = "You are an expert marketing strategist and product launch advisor.",
      provider = "openrouter",
      model = "anthropic/claude-3-haiku",
      commandType = "",
      // NOTE: apiKey is intentionally NOT accepted from the request body.
    } = body ?? {};

    // --- Input validation ---
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "A non-empty prompt is required." }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.` },
        { status: 400 }
      );
    }
    if (systemContext.length > MAX_SYSTEM_LENGTH) {
      return NextResponse.json(
        { error: `System context exceeds maximum length.` },
        { status: 400 }
      );
    }
    if (!ALLOWED_COMMAND_TYPES.includes(commandType)) {
      return NextResponse.json({ error: "Invalid commandType." }, { status: 400 });
    }

    // --- Load API key server-side ---
    let finalApiKey = process.env.OPENROUTER_API_KEY;
    let baseURL = "https://openrouter.ai/api/v1";

    try {
      const supabase = createServerSupabaseClient();
      const { data: profile } = await supabase
        .from("user_settings")
        .select("llm_provider, llm_model, llm_api_key")
        .eq("is_active", true)
        .single();

      if (profile) {
        const profileKey = profile.llm_api_key;
        const profileProvider = profile.llm_provider || provider;

        if (profileProvider === "openai") {
          baseURL = "https://api.openai.com/v1";
          finalApiKey = profileKey || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
        } else {
          baseURL = "https://openrouter.ai/api/v1";
          finalApiKey = profileKey || process.env.OPENROUTER_API_KEY;
        }
      }
    } catch {
      // Fall back to env key
    }

    if (!finalApiKey) {
      return NextResponse.json(
        { error: "No API key configured. Please add your API key in Settings → Deep Engine Config." },
        { status: 500 }
      );
    }

    // Specialized Alex Hormozi Marketing Guidelines
    let marketingSystemContext = systemContext;

    if (commandType) {
      const hormoziHeader = `\n\n[ALEX HORMOZI MARKETING STRATEGY PROTOCOL ACTIVE]
You are a brilliant growth consultant embodying the frameworks of Alex Hormozi ($100M Offers, $100M Leads). Your focus is absolute clarity, high value, low-friction, high leverage, and extreme focus on solving the audience's exact pain point. Write directly, using strong, punchy sentences, zero corporate fluff, and deep consumer psychology.

CRITICAL INSTRUCTION: DO NOT write generic templates, abstract bullet points, or placeholder texts like "[Insert problem here]", "[Describe your solution]", or "[Your name]". You MUST write FULLY FORMULATED, ready-to-publish copywriting, actual complete hooks, fully written DMs, and comprehensive scripts customized to the creator's solution, problem, and audience parameters.`;

      if (commandType === "hormozi_hook") {
        marketingSystemContext += `${hormoziHeader}
Your primary task is to generate scroll-stopping, high-converting hooks.
Generate exactly 4 fully-written hooks in different styles:
1. THE CURIO HOOK: Build deep curiosity (e.g. "I spent 30 days giving away lesson plans for free. Here is the exact checklist Accra schools are using.")
2. THE BENEFIT HOOK: Direct value promise (e.g. "How to build a custom tech curriculum in 12 minutes without grading a single paper.")
3. THE HYPER-TARGETED HOOK: Targeting a highly specific segment (e.g. "If you are a science teacher spending 5 hours a night on slide prep, stop.")
4. THE OUTRAGEOUS VALUE HOOK: Unbelievable value offer (e.g. "I built a database of 200 free AI grading prompts. No signup, no email required.")
Write complete, actual hooks ready to post. Spaced out perfectly.`;
      } else if (commandType === "warm_outreach") {
        marketingSystemContext += `${hormoziHeader}
Your primary task is to draft high-converting, relationship-first DM (Direct Message) outreach templates.
Follow Hormozi's Warm Outreach protocols:
- Establish low-pressure, genuine connection.
- OFFER A FREE GIFT/LEAD MAGNET first. Make the gift so valuable they feel stupid saying no, requiring ZERO email signups or commitments.
- The gift must solve a specific pain point in under 10 minutes.
- Only introduce a call-to-action or booked call once value is proven.
Provide fully formulated, complete DMs for:
1. LinkedIn DM Outreach Script
2. Instagram DM Outreach Script
3. Niche Cold Email Script
Write the actual message content. Spaced out, natural, and ready to use.`;
      } else if (commandType === "lead_magnet") {
        marketingSystemContext += `${hormoziHeader}
Your task is to outline a Grand Slam Lead Magnet with extreme value that solves a target problem immediately.
Provide a complete, fully written outline:
1. THE LEAD MAGNET NAME (A bold, benefit-driven actual title)
2. THE ASSET (Describe the exact resource database, checklist, or guide being given away)
3. 10-MINUTE QUICK WIN (How they get value instantly)
4. TWO-STEP FEED POST CTA: Write the exact social copy to post on LinkedIn to get comments (e.g., "I spent 40 hours building a lesson prep workbook. Comment PROMPT below and I'll send it to your DMs for free.")
5. THE DM HAND-OFF: Write the exact conversation path to turn comments into delivered guides and booked discovery calls.`;
      } else if (commandType === "seven_day_plan") {
        marketingSystemContext += `${hormoziHeader}
Your task is to generate a highly strategic organic 7-Day Posting Schedule.
For each day, write a complete hook, core content topic, and CTA:
- Day 1: Myth-Busting / Contrarian Value (Challenge a niche belief)
- Day 2: Step-by-Step Tutorial (Give away a high-value checklist)
- Day 3: Case Study / Client Story (Show proof of results)
- Day 4: High-Value Freebie Giveaway (Promote the Lead Magnet)
- Day 5: Problem Deep-Dive (Explain the root cause of their pain)
- Day 6: $100M Grand Slam Offer Pitch (Direct, low-friction pitch)
- Day 7: Lifestyle / Behind-the-Scenes Authority (Build personal trust)
Do not write placeholders. Write the actual ready-to-post hooks for each day.`;
      } else if (commandType === "offer_calibrator") {
        marketingSystemContext += `${hormoziHeader}
Your task is to calculate a Hormozi $100M Grand Slam Offer.
Outline exactly:
1. THE DREAM OUTCOME: Describe the ultimate dream transformation for the target audience.
2. PERCEIVED LIKELIHOOD: How your solution guarantees success, removing doubt.
3. TIME DELAY REDUCTION: How you help them get their first quick win in under 72 hours.
4. EFFORT & SACRIFICE MINIMIZATION: What painful tasks you completely handle or automate for them.
5. THE GRAND SLAM VALUE STACK: Define 3 valuable bonuses (checklists, standard operating procedures, templates) they get for free to multiply the perceived value.`;
      } else if (commandType === "style_calibrator") {
        marketingSystemContext = `You are a professional linguistic analyzer. Your job is to reverse-engineer voice sliders from pasted writer references.
Analyze the writing style, hooks, pacing, sentence length, and tone of the pasted posts.
Calculate three numerical slider scores (each on a scale of 0 to 100):
1. Tone (0 = Clinical/Analytical, 100 = Emotive/Passionate/Vulnerable)
2. Rawness (0 = Polished/Editorial/Academic, 100 = Rough/Authentic/Spoken)
3. Density (0 = Simple/Beginner-friendly, 100 = Complex/Jargon-rich/Expert)

Return ONLY a valid raw JSON object. Do not include markdown code block formatting. Follow this format exactly:
{
  "tone": 75,
  "rawness": 32,
  "density": 88,
  "explanation": "Provide a brief 2-sentence explanation of the reverse-engineered style scores."
}`;
      }
    }

    const openai = new OpenAI({
      baseURL,
      apiKey: finalApiKey,
      defaultHeaders:
        provider !== "openai"
          ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Easzy OS" }
          : undefined,
    });

    const finalMarketingSystemContext =
      marketingSystemContext +
      "\n\nCRITICAL CONSTRAINT: DO NOT include any introductory greetings, throat-clearing, conversational remarks, or polite headers (such as 'Here is your launch sequence:', 'Sure! Below is the details...'). Start IMMEDIATELY with the output strategy outline, hooks, or content copy itself. Returning conversational headers or intro sentences is strictly unacceptable.";

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: finalMarketingSystemContext },
        { role: "user", content: prompt },
      ],
    });

    let content = completion.choices[0].message.content;

    const cleanLlmIntro = (text) => {
      if (!text) return "";
      let lines = text.split("\n");
      const introRegex =
        /^(here is|here's|sure|certainly|absolutely|this is|below is|i have generated|i've generated|i can help|i've created|here are|sure!)/i;
      while (lines.length > 0) {
        const trimmed = lines[0].trim();
        if (!trimmed) { lines.shift(); continue; }
        if (trimmed.length < 150 && (trimmed.endsWith(":") || introRegex.test(trimmed))) {
          lines.shift();
          continue;
        }
        break;
      }
      return lines.join("\n").trim();
    };

    content = cleanLlmIntro(content);
    return NextResponse.json({ result: content });
  } catch (error) {
    console.error("Campaign Generation Error:", error?.status, error?.code);
    return NextResponse.json(
      { error: "Content generation failed. Please try again." },
      { status: 500 }
    );
  }
}
