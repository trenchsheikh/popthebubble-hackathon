/**
 * Public, client-safe Supabase entry point.
 *
 * This module must NOT import `server-only` or any server-only code, because
 * client components (e.g. the diner anonymous-auth flow in lib/auth-diner.ts)
 * import the browser client from here. Server-only clients — service role, SSR
 * cookie session — live in lib/supabase-server.ts.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/types';

// Browser client: public anon key (safe to expose; RLS protects the data).
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
