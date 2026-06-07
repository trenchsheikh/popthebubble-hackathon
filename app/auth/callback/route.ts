import { NextResponse } from "next/server";
import { createClient, type EmailOtpType } from "@supabase/supabase-js";
import { createServerComponentClient } from "@/lib/supabase-server";

// Handles a clicked magic link. We verify with a plain client (the @supabase/ssr
// client defaults to PKCE and rejects OTP token_hash verification), then persist
// the session onto the SSR cookie client via setSession.
//   ?token_hash=...&type=magiclink → verifyOtp
//   ?code=...                      → exchangeCodeForSession (SSR client)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/studio";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=not_configured", url.origin));
  }

  try {
    const ssr = await createServerComponentClient();

    if (tokenHash && type) {
      const plain = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
      const { data, error } = await plain.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error || !data.session) throw error ?? new Error("No session");
      await ssr.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } else if (code) {
      const { error } = await ssr.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      return NextResponse.redirect(new URL("/login?error=missing_token", url.origin));
    }
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
