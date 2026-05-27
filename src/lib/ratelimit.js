/**
 * Simple in-memory rate limiter.
 * For production with multiple server instances, replace with Upstash Redis:
 * https://github.com/upstash/ratelimit
 *
 * Usage:
 *   const result = rateLimit(ip, { limit: 10, windowMs: 60_000 });
 *   if (!result.success) return 429;
 */

const store = new Map();

/**
 * @param {string} key      - Identifier to rate-limit (e.g. IP address)
 * @param {object} options
 * @param {number} options.limit     - Max requests per window (default 20)
 * @param {number} options.windowMs  - Window duration in ms (default 60s)
 * @returns {{ success: boolean, remaining: number }}
 */
export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - entry.count };
}

// Purge expired entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [k, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(k);
  }
}, 5 * 60_000);
