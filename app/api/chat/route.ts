import { NextResponse } from "next/server";
import { groundedChat } from "@/lib/ai/chat";
import { defaultProfile } from "@/lib/profile";
import { getMenuForRestaurant, getRestaurantBySlug } from "@/lib/restaurants";
import type { ChatMessage, DinerProfile, MemoryFact, MenuItem, Restaurant } from "@/lib/types";

type ChatBody = {
  restaurantSlug?: string;
  restaurant?: Restaurant;
  menu?: MenuItem[];
  profile?: DinerProfile;
  memoryFacts?: MemoryFact[];
  messages?: ChatMessage[];
  question?: string;
  locale?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatBody;
  const restaurant = body.restaurant ?? (body.restaurantSlug ? getRestaurantBySlug(body.restaurantSlug) : undefined);
  if (!restaurant) return NextResponse.json({ error: "Unknown restaurant." }, { status: 404 });
  if (!body.question?.trim()) return NextResponse.json({ error: "Question is required." }, { status: 400 });

  const response = await groundedChat({
    restaurant,
    menu: body.menu ?? getMenuForRestaurant(restaurant.id),
    profile: body.profile ?? defaultProfile,
    memoryFacts: body.memoryFacts ?? [],
    messages: body.messages ?? [],
    question: body.question,
    locale: body.locale
  });

  return NextResponse.json(response);
}
