/**
 * Server-only Supabase clients. This module is poisoned with `server-only` so
 * it can NEVER be pulled into a client bundle — the service-role key and
 * cookie/session handling must stay on the server.
 *
 * The public browser client lives in `lib/supabase.ts` (no server-only) so it
 * can be imported from client components without dragging these in.
 *
 * - createServiceClient: admin client, service-role key, BYPASSES RLS. Use only
 *   for trusted server operations that do their own authorization.
 * - createServerAuthClient: anon client seeded with a user's tokens (RLS-scoped).
 * - createServerComponentClient: SSR client that reads the auth cookie.
 */

import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/db/types';

// Admin client: service-role key (bypasses RLS). Server-trusted code only.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase server env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// Anon client seeded with a user's session tokens (RLS-scoped to that user).
export async function createServerAuthClient(accessToken?: string, refreshToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const client = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  if (accessToken && refreshToken) {
    await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }

  return client;
}

// SSR client that reads/writes the Supabase auth cookie via Next.js cookies().
export async function createServerComponentClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookies are read-only in some contexts (e.g. Server Components)
          }
        },
      },
    }
  );
}
