import { menuItems as seedMenu, restaurants as seedRestaurants } from "@/data/mock-restaurants";
import type { MenuItem, MenuPhoto, Restaurant } from "@/lib/types";

/**
 * In-memory, server-side restaurant store. Seeded from the static fixtures so
 * the existing demo restaurant keeps working, and extended at runtime when a
 * restaurant publishes through the studio onboarding flow.
 *
 * This is intentionally the single seam to a real database later: swap the
 * function bodies for Supabase/Postgres queries and the rest of the app is
 * unchanged. State lives on `globalThis` so it survives Next.js dev HMR and is
 * shared across route handlers within one server process. It resets on restart.
 */
type StoreShape = {
  restaurants: Map<string, Restaurant>; // keyed by restaurant id
  menus: Map<string, MenuItem[]>; // restaurantId -> items
  menuPhotos: Map<string, MenuPhoto[]>; // restaurantId -> uploaded menu snapshots
};

const globalRef = globalThis as unknown as { __bubbleStore?: StoreShape };

function seed(): StoreShape {
  const store: StoreShape = {
    restaurants: new Map(),
    menus: new Map(),
    menuPhotos: new Map()
  };
  for (const restaurant of seedRestaurants) {
    store.restaurants.set(restaurant.id, restaurant);
    store.menus.set(
      restaurant.id,
      seedMenu.filter((item) => item.restaurantId === restaurant.id)
    );
  }
  return store;
}

function store(): StoreShape {
  if (!globalRef.__bubbleStore) globalRef.__bubbleStore = seed();
  return globalRef.__bubbleStore;
}

export function listRestaurants(): Restaurant[] {
  return [...store().restaurants.values()];
}

export function getRestaurantById(id: string): Restaurant | undefined {
  return store().restaurants.get(id);
}

export function getRestaurantBySlug(slug: string): Restaurant | undefined {
  return [...store().restaurants.values()].find((restaurant) => restaurant.slug === slug);
}

export function getMenuForRestaurant(restaurantId: string): MenuItem[] {
  return store().menus.get(restaurantId) ?? [];
}

export function getMenuPhotos(restaurantId: string): MenuPhoto[] {
  return store().menuPhotos.get(restaurantId) ?? [];
}

export function slugTaken(slug: string): boolean {
  return [...store().restaurants.values()].some((restaurant) => restaurant.slug === slug);
}

/**
 * Create or replace a restaurant and its menu. Returns the persisted restaurant.
 */
export function upsertRestaurant(input: {
  restaurant: Restaurant;
  menu: MenuItem[];
  menuPhotos: MenuPhoto[];
}): Restaurant {
  const current = store();
  current.restaurants.set(input.restaurant.id, input.restaurant);
  current.menus.set(input.restaurant.id, input.menu);
  current.menuPhotos.set(input.restaurant.id, input.menuPhotos);
  return input.restaurant;
}
