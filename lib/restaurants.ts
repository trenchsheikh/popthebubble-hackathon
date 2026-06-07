// Façade over restaurant data. Reads Supabase first (onboarded restaurants) and
// falls back to the in-memory seed (the Hinoki demo) when a slug isn't in the DB
// or Supabase is unreachable — so onboarded venues render at /r/<slug> while the
// demo keeps working with zero config.
import "server-only";
import type { MenuItem, Restaurant } from "@/lib/types";
import { getRestaurantBySlug as dbGetBySlug, listMenuItems as dbListMenu } from "@/lib/db/queries";
import {
  getMenuForRestaurant as seedGetMenu,
  getRestaurantBySlug as seedGetBySlug
} from "@/lib/store/restaurant-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | undefined> {
  try {
    const fromDb = await dbGetBySlug(slug);
    if (fromDb) return fromDb;
  } catch {
    // Supabase unreachable — fall back to the seed.
  }
  return seedGetBySlug(slug);
}

export async function getMenuForRestaurant(restaurantId: string): Promise<MenuItem[]> {
  // Onboarded restaurants have uuid ids (→ Supabase); the seed uses plain ids
  // like "hinoki" (→ in-memory). Skip the DB query for non-uuid ids to avoid a
  // guaranteed invalid-uuid error.
  if (UUID_RE.test(restaurantId)) {
    try {
      const items = await dbListMenu(restaurantId);
      if (items.length > 0) return items;
    } catch {
      // fall through to seed
    }
  }
  return seedGetMenu(restaurantId);
}
