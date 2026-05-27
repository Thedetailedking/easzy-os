import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

/**
 * GET /api/auth/session
 * Returns the current user from the session cookie, or { user: null } if not logged in.
 * This route is in the public allowlist in middleware.js so it's always reachable.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('easzy_session')?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: { id: session.userId, username: session.username },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
