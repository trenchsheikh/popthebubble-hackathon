import { NextResponse } from "next/server";
import { getMenuForRestaurant, getRestaurantBySlug } from "@/lib/restaurants";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const restaurant = getRestaurantBySlug(slug);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json({
    restaurant,
    categories: restaurant.categories,
    items: getMenuForRestaurant(restaurant.id)
  });
}
