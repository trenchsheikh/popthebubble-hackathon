import { NextResponse } from "next/server";
import { draftToEntities, validateDraft, slugify, type RestaurantDraft } from "@/lib/studio/draft";
import { requireRestaurantOwner } from "@/lib/auth";
import {
  createRestaurant,
  getRestaurantBySlug,
  setRestaurantDinerConfig,
  upsertMenuItems
} from "@/lib/db/queries";
import { enrichMenu } from "@/lib/menu/enrich";
import { completeOnboardingRun, logOnboardingEvent } from "@/lib/telemetry/onboarding";
import type { Allergen } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

async function resolveSlug(name: string): Promise<string> {
  const base = slugify(name) || "restaurant";
  for (const candidate of [base, ...Array.from({ length: 50 }, (_, i) => `${base}-${i + 2}`)]) {
    if (!(await getRestaurantBySlug(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// Publishes the restaurant + menu as TEXT only. Dish photos are uploaded
// separately via /api/studio/upload-image afterwards — sending 50+ base64 images
// in one request blows past the platform body-size limit (~4.5 MB on Vercel) and
// fails the whole publish.
export async function POST(request: Request) {
  // Onboarding writes require a signed-in restaurant owner.
  let ownerId: string;
  try {
    const user = await requireRestaurantOwner();
    ownerId = user.id;
  } catch {
    return NextResponse.json({ error: "Please sign in as a restaurant first." }, { status: 401 });
  }

  let draft: RestaurantDraft & { runId?: string; photoCount?: number };
  try {
    draft = (await request.json()) as RestaurantDraft & { runId?: string; photoCount?: number };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validation = validateDraft(draft);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 422 });
  }

  try {
    const slug = await resolveSlug(draft.name);
    const { restaurant, menu } = draftToEntities(draft, slug);

    // 1) Create the restaurant row (real uuid id, owned by the signed-in user).
    const saved = await createRestaurant({
      slug,
      name: restaurant.name,
      shortName: restaurant.shortName,
      cuisine: restaurant.cuisine,
      city: restaurant.city,
      serviceStyle: restaurant.serviceStyle,
      tableLabel: restaurant.tableLabel,
      welcomeLine: restaurant.welcomeLine,
      tone: restaurant.tone,
      theme: restaurant.theme as unknown as Record<string, string>,
      categories: restaurant.categories,
      ownerId,
      exclusionPolicy: restaurant.exclusionPolicy,
      currency: restaurant.currency
    });

    // 2) Build menu items (text only — photos are uploaded afterwards).
    const items = menu.map((item) => ({
      id: item.id,
      name: item.name,
      nativeName: item.nativeName,
      category: item.category,
      price: item.price,
      spice: item.spice,
      vegetarian: item.vegetarian,
      vegan: item.vegan,
      contains: item.contains,
      hue: item.hue,
      blurb: item.blurb,
      explainer: item.explainer,
      imageUrl: undefined as string | undefined,
      available: item.available,
      tags: item.tags,
      notes: item.notes,
      allowExclusions: item.allowExclusions,
      removable: item.removable
    }));

    // 3) Menu-intelligence pass: enrich allergens (additive) + derive the
    //    cuisine-adaptive diner question config. Fail-soft (falls back to the
    //    deterministic cuisine baseline).
    const enrichment = await enrichMenu(
      restaurant.cuisine,
      items.map((item) => ({
        id: item.id,
        name: item.name,
        nativeName: item.nativeName,
        description: item.notes || item.blurb,
        contains: item.contains as Allergen[]
      }))
    );
    const enrichedItems = items.map((item) => ({
      ...item,
      contains: enrichment.dishAllergens[item.id] ?? item.contains
    }));

    // 4) Persist menu items + the diner-question config against the restaurant.
    await upsertMenuItems(saved.id, enrichedItems);
    try {
      await setRestaurantDinerConfig(saved.id, enrichment.config);
    } catch {
      /* config is best-effort; diner flow falls back to the cuisine baseline */
    }

    // 5) Close out the onboarding telemetry run (durable evidence).
    if (draft.runId) {
      await logOnboardingEvent(draft.runId, ownerId, "menu_enriched", {
        allergensAsked: enrichment.config.allergens,
        dietsAsked: enrichment.config.diets
      });
      await completeOnboardingRun(draft.runId, ownerId, {
        restaurantId: saved.id,
        slug: saved.slug,
        itemCount: enrichedItems.length,
        imagesUploaded: draft.photoCount ?? 0
      });
    }

    return NextResponse.json({
      slug: saved.slug,
      restaurantId: saved.id,
      url: `/r/${saved.slug}`,
      itemCount: items.length,
      // ids in the same order as the published (named) items, so the client can
      // attach each dish photo via /api/studio/upload-image.
      itemIds: enrichedItems.map((item) => item.id)
    });
  } catch {
    return NextResponse.json({ error: "Could not publish your menu." }, { status: 500 });
  }
}
