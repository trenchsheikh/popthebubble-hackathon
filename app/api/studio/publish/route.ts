import { NextResponse } from "next/server";
import { draftToEntities, slugify, validateDraft, type RestaurantDraft } from "@/lib/studio/draft";
import { slugTaken, upsertRestaurant } from "@/lib/store/restaurant-store";
import type { MenuPhoto } from "@/lib/types";

function resolveSlug(name: string): string {
  const base = slugify(name) || "restaurant";
  if (!slugTaken(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!slugTaken(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function sanitizePhotos(photos: MenuPhoto[] | undefined): MenuPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((photo) => typeof photo?.dataUrl === "string" && photo.dataUrl.startsWith("data:image"))
    .slice(0, 8)
    .map((photo) => ({ id: String(photo.id), name: String(photo.name ?? "menu"), dataUrl: photo.dataUrl }));
}

export async function POST(request: Request) {
  let draft: RestaurantDraft;
  try {
    draft = (await request.json()) as RestaurantDraft;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validation = validateDraft(draft);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 422 });
  }

  const slug = resolveSlug(draft.name);
  const { restaurant, menu } = draftToEntities(draft, slug);
  upsertRestaurant({ restaurant, menu, menuPhotos: sanitizePhotos(draft.menuPhotos) });

  return NextResponse.json({
    slug: restaurant.slug,
    restaurantId: restaurant.id,
    url: `/r/${restaurant.slug}`,
    itemCount: menu.length
  });
}
