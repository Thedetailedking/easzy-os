import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      systemContext = "You are an expert content generation assistant.",  
      provider = "openrouter",
      model = "anthropic/claude-3-haiku",
      apiKey = ""
    } = body;

    let baseURL = "https://openrouter.ai/api/v1";
    let finalApiKey = process.env.OPENROUTER_API_KEY;

    if (provider === 'openai') {
      baseURL = "https://api.openai.com/v1";
      finalApiKey = apiKey || process.env.OPENAI_API_KEY; 
    } else if (provider === 'openrouter' || provider === 'anthropic') {
      // We route Anthropic through OpenRouter automatically for standard API shape compatibility
      baseURL = "https://openrouter.ai/api/v1";
      finalApiKey = apiKey || process.env.OPENROUTER_API_KEY;
    }

    if (!finalApiKey) {
      throw new Error("No API key provided. Please configure an API key in your Settings Persona.");
    }

    // Initialize dynamically per-request
    const openai = new OpenAI({
      baseURL: baseURL,
      apiKey: finalApiKey,
      defaultHeaders: (provider === 'openrouter' || provider === 'anthropic') ? {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Easzy OS",
      } : undefined
    });

    const finalSystemContext = systemContext + "\n\nCRITICAL CONSTRAINT: DO NOT include any introductory greetings, throat-clearing, conversational remarks, or polite headers (such as 'Here is your post:', 'Sure! Below is the content...'). Start IMMEDIATELY with the hook or the first line of generated copy. Returning conversational headers or intro sentences is strictly unacceptable.";

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: finalSystemContext },
        { role: "user", content: prompt }
      ],
    });

    let content = completion.choices[0].message.content;
    
    // Post-process to remove conversational throat-clearing intro lines
    const cleanLlmIntro = (text) => {
      if (!text) return "";
      let lines = text.split("\n");
      const introRegex = /^(here is|here's|sure|certainly|absolutely|this is|below is|i have generated|i've generated|i can help|i've created|here are|sure!)/i;
      
      while (lines.length > 0) {
        const trimmed = lines[0].trim();
        if (!trimmed) {
          lines.shift();
          continue;
        }
        
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
    console.error("OpenRouter Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
