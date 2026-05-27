/**
 * Server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS) if provided.
 * Falls back to the anon key if the service role key is not set.
 *
 * IMPORTANT: Only import this in API routes (Node.js runtime), never in:
 *   - middleware.js  (Edge Runtime)
 *   - Client components ("use client")
 */
import { createClient } from '@supabase/supabase-js';

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service role key; fall back to anon key
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[easzy-os] Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and either ' +
      'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
