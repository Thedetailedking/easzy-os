/**
 * Session signing and verification using Web Crypto API (HMAC-SHA256).
 * Compatible with both Next.js Edge Runtime (middleware) and Node.js Runtime (API routes).
 * Requires Node.js 18+ (globalThis.crypto is available).
 */

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.warn(
      '[easzy-os] SESSION_SECRET is missing or too short. Set a strong secret in .env.local'
    );
  }
  return secret || 'fallback-insecure-secret-set-SESSION_SECRET-in-env';
}

async function getKey() {
  const raw = new TextEncoder().encode(getSecret());
  return globalThis.crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex) {
  if (hex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Create a signed session token from a payload object.
 * The token format is: base64url(payload).hmac_hex
 */
export async function signSession(payload) {
  const data = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const key = await getKey();
  const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${bufferToHex(sigBuf)}`;
}

/**
 * Verify a session token and return the payload, or null if invalid/expired.
 */
export async function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === token.length - 1) return null;

  const data = token.substring(0, lastDot);
  const sigHex = token.substring(lastDot + 1);

  try {
    const key = await getKey();
    const sigBytes = hexToBuffer(sigHex);
    if (sigBytes.length === 0) return null;

    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(data)
    );
    if (!valid) return null;

    // Decode the base64url payload
    const json = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);

    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
