import { conflicts } from "@/lib/conflicts";
import type { DinerProfile, MenuItem } from "@/lib/types";
import type { DinerCard, OrderItem } from "@/lib/orders/types";

// Builds the card the kitchen receives. Safety-critical data (allergies, diet,
// and per-dish conflicts computed by the deterministic filter) ALWAYS travels;
// soft preferences only when the diner opts in.
export function buildDinerCard(
  profile: DinerProfile,
  orderedDishes: MenuItem[],
  shareSoftPrefs: boolean
): DinerCard {
  const dishConflicts = orderedDishes
    .map((dish) => ({ itemId: dish.id, itemName: dish.name, flags: conflicts(dish, profile) }))
    .filter((entry) => entry.flags.length > 0);

  const card: DinerCard = {
    diet: profile.diet,
    allergies: profile.allergies,
    conflicts: dishConflicts
  };

  if (shareSoftPrefs) {
    card.softPrefs = {
      spice: profile.spice,
      appetite: profile.appetite,
      likes: profile.likes,
      dislikes: profile.dislikes
    };
  }

  return card;
}

export function buildOrderItems(
  orderedDishes: MenuItem[],
  quantities: Record<string, number>,
  requestsByDish: Record<string, string[]>,
  profile: DinerProfile
): OrderItem[] {
  return orderedDishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    price: dish.price,
    qty: quantities[dish.id] ?? 1,
    conflicts: conflicts(dish, profile),
    requests: requestsByDish[dish.id] ?? []
  }));
}
