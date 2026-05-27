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

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemContext },
        { role: "user", content: prompt }
      ],
    });

    const content = completion.choices[0].message.content;
    
    return NextResponse.json({ result: content });
  } catch (error) {
    console.error("OpenRouter Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
