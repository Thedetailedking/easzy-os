import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove garbage elements
    $('script, style, noscript, nav, header, footer, iframe, svg, aside').remove();

    // Try to extract main content or just grab body text
    const mainContent = $('main, article').text() || $('body').text();
    
    // Clean up whitespace
    const cleanText = mainContent.replace(/\s+/g, ' ').trim();

    return NextResponse.json({ result: cleanText });
  } catch (error) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
