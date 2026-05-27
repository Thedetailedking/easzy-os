import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { base64Image } = await request.json();

    if (!base64Image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Initialize OpenAI using OpenRouter for backend service tasks.
    // For this utility, we'll use a reliable vision model like gpt-4o-mini via openrouter.
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Easzy OS",
      }
    });

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini", // Very cheap, fast, supports Vision
      messages: [
        { 
          role: "user", 
          content: [
            { type: "text", text: "Extract all visible text from this image exactly as it appears. Return ONLY the raw text. Do not add any conversational filler or formatting." },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ],
      max_tokens: 1500,
    });

    const content = completion.choices[0].message.content;
    
    return NextResponse.json({ result: content });
  } catch (error) {
    console.error("Image Extract Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
