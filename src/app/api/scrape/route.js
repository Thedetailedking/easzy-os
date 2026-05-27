import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";

// Maximum character length for scraped content returned to client
const MAX_CONTENT_LENGTH = 50_000;

// Private/reserved IP ranges to block (SSRF prevention)
const PRIVATE_IP_PATTERNS = [
  /^127\./,           // Loopback
  /^10\./,            // RFC 1918
  /^192\.168\./,      // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC 1918
  /^169\.254\./,      // Link-local (cloud metadata)
  /^::1$/,            // IPv6 loopback
  /^fc00:/,           // IPv6 private
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA
  /^localhost$/i,     // Hostname
  /^0\./,             // Reserved
  /^100\.6[4-9]\./,   // Carrier-grade NAT
  /^100\.[7-9]\d\./,  // Carrier-grade NAT
  /^100\.1[0-2]\d\./, // Carrier-grade NAT
];

/**
 * Validate that a URL is safe to scrape (no SSRF risk).
 * Returns null if valid, or an error string if blocked.
 */
function validateUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "Invalid URL format.";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "Only HTTP and HTTPS URLs are allowed.";
  }

  const hostname = parsed.hostname;

  // Block private/reserved hostnames and IPs
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return "Requests to private or internal network addresses are not allowed.";
  }

  // Block cloud metadata endpoints by hostname
  const blockedHostnames = [
    "metadata.google.internal",
    "169.254.169.254",
    "metadata.azure.com",
  ];
  if (blockedHostnames.includes(hostname)) {
    return "Requests to cloud metadata endpoints are not allowed.";
  }

  return null; // valid
}

export async function POST(request) {
  // Rate limiting: 15 scrape requests per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "localhost";
  const { success } = rateLimit(`scrape:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { url } = body ?? {};

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "A URL is required." }, { status: 400 });
    }

    // --- SSRF Prevention: validate URL before fetching ---
    const urlError = validateUrl(url.trim());
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const response = await fetch(url.trim(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EaszyOS-Scraper/1.0; +https://easzyos.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Enforce a timeout to prevent resource exhaustion
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `The URL returned an error (HTTP ${response.status}).` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "Only HTML pages can be scraped." },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, aside, [aria-hidden='true'], .ad, .advertisement").remove();

    // Extract readable text
    const bodyText = $("article, main, .content, .post, .entry-content, body")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // Truncate to prevent sending enormous payloads
    const truncated = bodyText.slice(0, MAX_CONTENT_LENGTH);

    return NextResponse.json({ content: truncated });
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return NextResponse.json({ error: "Request timed out. The URL took too long to respond." }, { status: 504 });
    }
    console.error("Scrape Error:", error?.message);
    return NextResponse.json({ error: "Failed to scrape the URL. Please try again." }, { status: 500 });
  }
}
