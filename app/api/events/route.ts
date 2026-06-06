import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.kind) {
    return NextResponse.json({ error: "Missing event kind" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    stored: "mock",
    next: "Persist to events table and optionally call memory.focus for notable signals."
  });
}
