/**
 * Server-only authentication helpers for restaurants.
 *
 * - Magic-link OTP: signInWithOtp, verifyOtp (passwordless email auth)
 * - Session: getRestaurantSession, requireRestaurantOwner (SSR + RLS)
 *
 * All exports are server-only.
 * For diner authentication, see lib/auth-diner.ts (client-side).
 */

import 'server-only';
import { createBrowserSupabase } from '@/lib/supabase';
import { createServerComponentClient } from '@/lib/supabase-server';

// ============================================================================
// Restaurant auth (server-only)
// ============================================================================

/**
 * SERVER: Retrieve the current authenticated restaurant owner from the
 * request's auth cookies. Uses SSR-aware cookie reading.
 * Returns the Supabase user object if authenticated, null otherwise.
 */
export async function getRestaurantSession() {
  try {
    const db = await createServerComponentClient();
    const { data, error } = await db.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

/**
 * SERVER: Require a restaurant owner session. Throws if not authenticated.
 * Use in route handlers that require auth.
 */
export async function requireRestaurantOwner() {
  const user = await getRestaurantSession();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

/**
 * SERVER: Send a passwordless magic link to a restaurant owner's email.
 * Uses the anon client (not service client) to initiate the OTP flow.
 * Client redirects to /auth/callback after email confirmation.
 */
export async function sendRestaurantMagicLink(email: string): Promise<void> {
  const db = createBrowserSupabase();

  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(`Magic link send failed: ${error.message}`);
  }
}

/**
 * SERVER: Exchange an OTP token (from email link) for a session.
 * Uses the anon client (not service client) to verify the OTP.
 * Called in the /auth/callback route.
 */
export async function verifyRestaurantOtp(
  email: string,
  otp: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const db = createBrowserSupabase();

  const { data, error } = await db.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });

  if (error || !data.session) {
    throw new Error(`OTP verification failed: ${error?.message || 'No session'}`);
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

