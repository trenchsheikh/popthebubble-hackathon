'use client';

/**
 * Client-side diner identity — zero-friction, device-persistent.
 *
 * A diner never signs up. On the first QR scan we mint a Supabase ANONYMOUS
 * user; the Supabase SDK persists that session in localStorage automatically,
 * so every later scan on the same device — at ANY restaurant on this origin —
 * resolves to the same `user_id`. That `user_id` IS the durable identity:
 * it keys the diner's row, their profile, and their Mubit memory, which is how
 * cross-restaurant context ("we already know what they like") works.
 *
 * Same-device persistence is handled by Supabase, not a custom token. The only
 * way to carry identity to a DIFFERENT device or survive a storage wipe is to
 * link a phone/email later (linkDinerPhone) — optional, never required.
 */

import { createBrowserSupabase } from '@/lib/supabase';

type BrowserSupabase = ReturnType<typeof createBrowserSupabase>;

export interface DinerSession {
  /** Supabase anonymous auth user id — stable per device, the durable memory key. */
  dinerId: string;
  /** True when a session already existed on this device (a prior scan). */
  isReturning: boolean;
}

/**
 * Resolve the diner's identity with zero friction. Reuses the device-persisted
 * anonymous session if present, otherwise mints a new one. Always ensures a
 * `diners` row exists for the identity (RLS permits self-insert where
 * id = auth.uid()).
 */
export async function ensureDinerSession(): Promise<DinerSession> {
  const supabase = createBrowserSupabase();

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) {
    await ensureDinerRow(supabase, existing.session.user.id);
    return { dinerId: existing.session.user.id, isReturning: true };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Anonymous sign-in failed: ${error?.message ?? 'no user returned'}`);
  }

  await ensureDinerRow(supabase, data.user.id);
  return { dinerId: data.user.id, isReturning: false };
}

async function ensureDinerRow(supabase: BrowserSupabase, dinerId: string): Promise<void> {
  const { error } = await supabase.from('diners').upsert({ id: dinerId }, { onConflict: 'id' });
  if (error) throw new Error(`Could not persist diner identity: ${error.message}`);
}

/**
 * Optional: link a phone number to the diner for cross-device durability.
 * Only called when a diner opts in to "remember me across devices". The
 * underlying anonymous user_id is unchanged, so all existing memory carries
 * over. Stores the phone on its own column — never touches identity.
 */
export async function linkDinerPhone(dinerId: string, phone: string): Promise<void> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from('diners').update({ phone }).eq('id', dinerId);
  if (error) throw new Error(`Could not link phone: ${error.message}`);
}
