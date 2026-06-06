// Thin façade over the restaurant store so callers (pages + API routes) read
// both the seeded demo data and anything published through the studio flow.
import {
  getMenuForRestaurant as storeGetMenuForRestaurant,
  getRestaurantBySlug as storeGetRestaurantBySlug
} from "@/lib/store/restaurant-store";

export function getRestaurantBySlug(slug: string) {
  return storeGetRestaurantBySlug(slug);
}

export function getMenuForRestaurant(restaurantId: string) {
  return storeGetMenuForRestaurant(restaurantId);
}
