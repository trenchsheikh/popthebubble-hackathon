import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@/lib/supabase-server";

// Email + password auth, no email verification.
//   First time an email is seen → create the account (password locked in).
//   After that → the same password must match.
// We create users pre-confirmed via the admin API so it works regardless of the
// project's "Confirm email" setting, then write the session to an SSR cookie.
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Auth is not configured." }, { status: 500 });
  }

  const plain = createClient(url, anonKey, { auth: { persistSession: false } });

  // Try to sign in first (existing account).
  let signIn = await plain.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    // Not signed in — try to register this email as a new pre-confirmed account.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });

    if (created.error) {
      // Email already exists → the password was wrong (registration would have
      // succeeded for a brand-new email).
      const already = /registered|already/i.test(created.error.message);
      return NextResponse.json(
        { ok: false, error: already ? "Incorrect password for this email." : created.error.message },
        { status: 401 }
      );
    }

    // New account created — sign in to mint a session.
    signIn = await plain.auth.signInWithPassword({ email, password });
    if (signIn.error || !signIn.data.session) {
      return NextResponse.json({ ok: false, error: signIn.error?.message ?? "Could not sign in." }, { status: 401 });
    }
  }

  const session = signIn.data.session;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Could not sign in." }, { status: 401 });
  }

  const ssr = await createServerComponentClient();
  await ssr.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  return NextResponse.json({ ok: true });
}
