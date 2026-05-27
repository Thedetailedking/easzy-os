import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { verifySession } from '@/lib/session';

/**
 * PUT /api/auth/credentials
 * Allows the authenticated user to update their username and password.
 * The new password is hashed with bcrypt before storage.
 * The user's ID comes from the verified session — never from the request body.
 */
export async function PUT(request) {
  try {
    // Verify the session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('easzy_session')?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const { username, password } = body ?? {};

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    if (password.trim().length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hash = await bcrypt.hash(password.trim(), 12);

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update({ username: username.trim(), password: hash })
      .eq('id', session.userId); // identity always comes from the session, not request body

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update credentials. Please try again.' },
      { status: 500 }
    );
  }
}
