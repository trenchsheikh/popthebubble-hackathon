import { NextResponse } from "next/server";
import { consolidate } from "@/lib/mubit";

type Body = { dinerId?: string; runId?: string; restaurantId?: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.dinerId || !body?.runId) {
    return NextResponse.json({ error: "dinerId and runId are required." }, { status: 400 });
  }

  const result = await consolidate({ dinerId: body.dinerId, runId: body.runId, restaurantId: body.restaurantId });
  return NextResponse.json(result);
}
