import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { upsertSession } from "@/lib/sessions/store";

function stableId(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    table?: string;
    deviceToken?: string;
  };

  if (!body.slug) {
    return NextResponse.json({ error: "Missing restaurant slug" }, { status: 400 });
  }

  const restaurant = await getRestaurantBySlug(body.slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const token = body.deviceToken || `anonymous-${Date.now()}`;
  const dinerId = `diner_${stableId(token)}`;
  const runId = `${restaurant.id}:${dinerId}:${Date.now()}`;
  const tableLabel = body.table ? `Table ${body.table}` : restaurant.tableLabel;

  // Record live presence so the restaurant dashboard can show who's here now.
  upsertSession({ dinerId, slug: restaurant.slug, tableLabel, returning: Boolean(body.deviceToken) });

  return NextResponse.json({
    dinerId,
    runId,
    returning: Boolean(body.deviceToken),
    memory: [],
    restaurantId: restaurant.id,
    tableLabel
  });
}
