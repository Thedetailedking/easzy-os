import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { signSession } from '@/lib/session';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body ?? {};

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password')
      .eq('username', username.trim())
      .single();

    if (error || !user) {
      // Return the same error for both "not found" and "wrong password"
      // to prevent username enumeration attacks
      return NextResponse.json(
        { error: 'Invalid workspace username or password.' },
        { status: 401 }
      );
    }

    // Determine if the stored password is a bcrypt hash
    const isBcryptHash = user.password?.startsWith('$2');
    let valid = false;

    if (isBcryptHash) {
      valid = await bcrypt.compare(password.trim(), user.password);
    } else {
      // --- Plaintext migration path ---
      // If the stored password is not a bcrypt hash (legacy plaintext),
      // compare directly and silently upgrade on success.
      valid = user.password === password.trim();
      if (valid) {
        const hash = await bcrypt.hash(password.trim(), 12);
        await supabase
          .from('users')
          .update({ password: hash })
          .eq('id', user.id);
      }
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid workspace username or password.' },
        { status: 401 }
      );
    }

    // Create a signed session token (7-day expiry)
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
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
