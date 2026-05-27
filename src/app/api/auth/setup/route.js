import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { signSession } from '@/lib/session';

/**
 * GET /api/auth/setup
 * Returns { needsSetup: true } if no users exist yet, { needsSetup: false } otherwise.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({ needsSetup: true });
    }

    return NextResponse.json({ needsSetup: count === 0 });
  } catch {
    return NextResponse.json({ needsSetup: true });
  }
}

/**
 * POST /api/auth/setup
 * Creates the first admin user (only allowed if no users exist).
 * Password is hashed with bcrypt before storage.
 */
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();

    // Guard: only allow if no users exist
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (count > 0) {
      return NextResponse.json(
        { error: 'Workspace already initialized. Use the login form.' },
        { status: 403 }
      );
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

    // Hash the password before storing
    const hash = await bcrypt.hash(password.trim(), 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ username: username.trim(), password: hash }])
      .select('id, username')
      .single();

    if (error) throw error;

    // Create session cookie
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = await signSession({ userId: user.id, username: user.username, exp });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
    });

    response.cookies.set('easzy_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Setup failed. Please try again.' }, { status: 500 });
  }
}
