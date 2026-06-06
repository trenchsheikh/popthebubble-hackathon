import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.runId) {
    return NextResponse.json({ error: "Missing runId" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    consolidated: "mock",
    next: "Distill session events into durable Mubit facts and diner profile cache."
  });
}
