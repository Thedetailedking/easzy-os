import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";

// Maximum audio file size: 25 MB (Deepgram supports up to 250MB, but 25MB is reasonable for voice notes)
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(request) {
  // Rate limiting: 10 transcription requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "localhost";
  const { success } = rateLimit(`transcribe:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio");

    if (!file) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    // --- File size validation ---
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Audio file is too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    // --- File type validation (basic MIME check) ---
    const allowedMimeTypes = [
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
    ];
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file." },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Transcription service not configured." }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": file.type || "audio/webm",
        },
        body: buffer,
      }
    );

    if (!response.ok) {
      console.error("Deepgram Error:", response.status);
      return NextResponse.json({ error: "Transcription service error. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription Error:", error?.message);
    return NextResponse.json({ error: "Transcription failed. Please try again." }, { status: 500 });
  }
}
