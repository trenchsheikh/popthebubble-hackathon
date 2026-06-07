import { NextResponse } from "next/server";
import { draftToEntities, validateDraft, slugify, type RestaurantDraft } from "@/lib/studio/draft";
import { requireRestaurantOwner } from "@/lib/auth";
import {
  createRestaurant,
  getRestaurantBySlug,
  setRestaurantDinerConfig,
  upsertMenuItems,
  uploadDishImage
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

// Decode a base64 data URL (the studio downscales photos to JPEG data URLs) into
// a File the storage upload helper can take.
function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
  const buffer = Buffer.from(b64, "base64");
  return new File([buffer], name, { type: mime });
}

export async function POST(request: Request) {
  // Onboarding writes require a signed-in restaurant owner.
  let ownerId: string;
  try {
    const user = await requireRestaurantOwner();
    ownerId = user.id;
  } catch {
    return NextResponse.json({ error: "Please sign in as a restaurant first." }, { status: 401 });
  }

  let draft: RestaurantDraft & { runId?: string };
  try {
    draft = (await request.json()) as RestaurantDraft & { runId?: string };
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
    const named = draft.items.filter((item) => item.name.trim()); // aligns 1:1 with `menu`

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

    // 2) Upload each dish photo to the dish-images bucket; collect public URLs.
    let imagesUploaded = 0;
    const items = await Promise.all(
      menu.map(async (item, index) => {
        const dataUrl = named[index]?.photoDataUrl;
        let imageUrl = item.imageUrl;
        if (dataUrl && dataUrl.startsWith("data:image")) {
          try {
            const file = dataUrlToFile(dataUrl, `${item.id}.jpg`);
            imageUrl = await uploadDishImage(saved.id, file, item.id);
            imagesUploaded += 1;
          } catch {
            imageUrl = undefined; // never fail the publish on one bad image
          }
        }
        return {
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
          imageUrl,
          available: item.available,
          tags: item.tags,
          notes: item.notes,
          allowExclusions: item.allowExclusions,
          removable: item.removable
        };
      })
    );

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
        imagesUploaded
      });
    }

    return NextResponse.json({
      slug: saved.slug,
      restaurantId: saved.id,
      url: `/r/${saved.slug}`,
      itemCount: items.length,
      imagesUploaded
    });
  } catch {
    return NextResponse.json({ error: "Could not publish your menu." }, { status: 500 });
  }
}
