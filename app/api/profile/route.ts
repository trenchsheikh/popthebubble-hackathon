import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.dinerId || !body?.profile) {
    return NextResponse.json({ error: "Missing dinerId or profile" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    persisted: "mock",
    next: "Wire this route to Supabase diner_profiles and Mubit storage.insert."
  });
}
