import { NextResponse } from "next/server";
import { commit } from "@/lib/mubit";
import type { MemoryFact } from "@/lib/types";

type Body = { dinerId?: string; runId?: string; facts?: MemoryFact[]; restaurantId?: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.dinerId || !body?.runId || !Array.isArray(body.facts)) {
    return NextResponse.json({ error: "dinerId, runId and facts are required." }, { status: 400 });
  }

  const result = await commit({
    dinerId: body.dinerId,
    runId: body.runId,
    facts: body.facts,
    restaurantId: body.restaurantId
  });
  return NextResponse.json(result);
}
