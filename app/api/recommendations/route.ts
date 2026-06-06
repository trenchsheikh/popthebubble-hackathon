import { NextResponse } from "next/server";
import { recommendDishes } from "@/lib/ai/recommendations";
import { defaultProfile } from "@/lib/profile";
import { getMenuForRestaurant, getRestaurantBySlug } from "@/lib/restaurants";
import type { DinerProfile, MemoryFact, MenuItem, Restaurant } from "@/lib/types";

type RecommendationsBody = {
  restaurantSlug?: string;
  restaurant?: Restaurant;
  menu?: MenuItem[];
  profile?: DinerProfile;
  memoryFacts?: MemoryFact[];
  returning?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RecommendationsBody;
  const restaurant = body.restaurant ?? (body.restaurantSlug ? getRestaurantBySlug(body.restaurantSlug) : undefined);
  if (!restaurant) return NextResponse.json({ error: "Unknown restaurant." }, { status: 404 });

  const menu = body.menu ?? getMenuForRestaurant(restaurant.id);
  const response = await recommendDishes({
    restaurant,
    menu,
    profile: body.profile ?? defaultProfile,
    memoryFacts: body.memoryFacts ?? [],
    returning: Boolean(body.returning)
  });

  return NextResponse.json(response);
}
