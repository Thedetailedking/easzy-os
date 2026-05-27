import OpenAI from "openai";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";

// Max base64 image payload size: ~10MB encoded (≈7.5MB raw image)
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;

export async function POST(request) {
  // Rate limiting: 10 extract requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "localhost";
  const { success } = rateLimit(`extract-image:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { base64Image } = body ?? {};

    if (!base64Image || typeof base64Image !== "string") {
      return NextResponse.json({ error: "Image data is required." }, { status: 400 });
    }

    // Validate size to prevent enormous payloads consuming excessive tokens/memory
    if (base64Image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: "Image is too large. Please use an image under 7MB." },
        { status: 413 }
      );
    }

    // Basic check that it's actually a data URL / base64 image
    const isDataUrl = base64Image.startsWith("data:image/");
    const isBase64 = /^[A-Za-z0-9+/=]{100,}$/.test(base64Image);
    if (!isDataUrl && !isBase64) {
      return NextResponse.json({ error: "Invalid image format." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Image extraction service not configured." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Easzy OS",
      },
    });

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all visible text from this image exactly as it appears. Return ONLY the raw text. Do not add any conversational filler or formatting.",
            },
            {
              type: "image_url",
              image_url: { url: base64Image },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const content = completion.choices[0].message.content;
    return NextResponse.json({ result: content });
  } catch (error) {
    console.error("Image Extract Error:", error?.status, error?.code);
    return NextResponse.json(
      { error: "Image extraction failed. Please try again." },
      { status: 500 }
    );
  }
}
