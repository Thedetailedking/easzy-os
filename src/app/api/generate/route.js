import OpenAI from "openai";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Max prompt length (characters) to prevent cost attacks
const MAX_PROMPT_LENGTH = 15_000;
const MAX_SYSTEM_LENGTH = 5_000;

export async function POST(request) {
  // Rate limiting: 15 requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "localhost";
  const { success } = rateLimit(`generate:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      prompt,
      systemContext = "You are an expert content generation assistant.",
      provider = "openrouter",
      model = "anthropic/claude-3-haiku",
      // NOTE: apiKey is intentionally NOT accepted from the request body.
      // The active profile's API key is loaded server-side from the database.
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
        { error: `System context exceeds maximum length of ${MAX_SYSTEM_LENGTH} characters.` },
        { status: 400 }
      );
    }
    const ALLOWED_PROVIDERS = ["openrouter", "openai", "anthropic"];
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider specified." }, { status: 400 });
    }

    // --- Load API key server-side (never from request body) ---
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
        const profileProvider = profile.llm_provider || provider;
        const profileKey = profile.llm_api_key;

        if (profileProvider === "openai") {
          baseURL = "https://api.openai.com/v1";
          finalApiKey = profileKey || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
        } else {
          baseURL = "https://openrouter.ai/api/v1";
          finalApiKey = profileKey || process.env.OPENROUTER_API_KEY;
        }
      }
    } catch {
      // If we can't load the profile, fall back to the default env key
    }

    if (!finalApiKey) {
      return NextResponse.json(
        { error: "No API key configured. Please add your API key in Settings → Deep Engine Config." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      baseURL,
      apiKey: finalApiKey,
      defaultHeaders:
        provider !== "openai"
          ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Easzy OS" }
          : undefined,
    });

    const finalSystemContext =
      systemContext +
      "\n\nCRITICAL CONSTRAINT: DO NOT include any introductory greetings, throat-clearing, conversational remarks, or polite headers (such as 'Here is your post:', 'Sure! Below is the content...'). Start IMMEDIATELY with the hook or the first line of generated copy. Returning conversational headers or intro sentences is strictly unacceptable.";

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: finalSystemContext },
        { role: "user", content: prompt },
      ],
    });

    let content = completion.choices[0].message.content;

    // Post-process to remove conversational throat-clearing intro lines
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
    console.error("Generation Error:", error?.status, error?.code);
    // Return a generic error — do not expose internal details
    return NextResponse.json(
      { error: "Content generation failed. Please try again." },
      { status: 500 }
    );
  }
}
