import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio");

    if (!file) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Send the audio buffer to Deepgram's ultra-fast Nova-2 model using native fetch
    const deepgramResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: buffer,
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error("Deepgram Error:", errorText);
      return NextResponse.json({ error: "Deepgram API Error" }, { status: 500 });
    }

    const data = await deepgramResponse.json();
    const transcript = data.results?.channels[0]?.alternatives[0]?.transcript;

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
