import { menuItems, restaurants } from "@/data/mock-restaurants";
import { defaultProfile } from "@/lib/profile";
import type { DinerProfile, MemoryFact } from "@/lib/types";

const restaurant = restaurants[0];
const menu = menuItems.filter((item) => item.restaurantId === restaurant.id);

export const aiServiceFixtures = {
  allergyDietEdgeCase: {
    restaurant,
    menu,
    profile: {
      ...defaultProfile,
      diet: "vegan",
      allergies: ["nuts", "shellfish"],
      spice: 2,
      appetite: "normal"
    } satisfies DinerProfile
  },
  badJsonProfileFallback: {
    text: "I am vegan, allergic to nuts, and want a light meal with mild spice.",
    invalidModelOutput: "{ profile: definitely not valid json"
  },
  returningDinerMemory: {
    restaurant,
    menu,
    memoryFacts: [
      { id: "likes-smoky", kind: "preference", text: "Enjoys smoky vegan dishes", confidence: 0.9 },
      { id: "avoid-shellfish", kind: "allergy", text: "Must avoid shellfish", confidence: 1 }
    ] satisfies MemoryFact[]
  },
  unsafeRecommendationFiltering: {
    restaurant,
    menu,
    profile: {
      ...defaultProfile,
      allergies: ["shellfish", "gluten"],
      spice: 2
    } satisfies DinerProfile,
    unsafeModelIds: ["brown-crab", "charred-bread", "mushroom-steak"]
  }
};
