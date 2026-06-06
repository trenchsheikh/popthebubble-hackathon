import { NextResponse } from "next/server";
import { memoryService } from "@/lib/memory/service";
import type { DinerProfile, MemoryFact } from "@/lib/types";

type CommitBody = {
  dinerId?: string;
  restaurantId?: string;
  facts?: MemoryFact[];
  profile?: DinerProfile;
};

export async function POST(request: Request) {
  const body = (await request.json()) as CommitBody;
  if (!body.dinerId) return NextResponse.json({ error: "dinerId is required." }, { status: 400 });
  if (!body.restaurantId) return NextResponse.json({ error: "restaurantId is required." }, { status: 400 });

  const response = await memoryService.commit({
    dinerId: body.dinerId,
    restaurantId: body.restaurantId,
    facts: body.facts ?? [],
    profile: body.profile
  });

  return NextResponse.json(response);
}
