import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

/**
 * Public paths that are reachable without a valid session.
 * Everything else is protected by default (default-deny).
 */
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/setup',
  '/api/auth/session',
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow explicitly public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verify the session cookie
  const token = request.cookies.get('easzy_session')?.value;
  const session = await verifySession(token);

  if (!session) {
    // API routes: return 401 JSON instead of an HTML redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    // Page routes: redirect to the login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session is valid — allow through
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
