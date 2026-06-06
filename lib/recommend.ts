import { conflicts } from "@/lib/conflicts";
import type { DinerProfile, MemoryFact, MenuItem, RecommendationResponse, Restaurant } from "@/lib/types";

function reasonFor(dish: MenuItem, profile: DinerProfile, memoryFacts: MemoryFact[]) {
  const memoryText = memoryFacts.map((fact) => fact.text.toLowerCase()).join(" ");
  if (memoryText.includes(dish.name.toLowerCase())) return "You came back to this kind of dish before.";
  if (dish.spice >= 2 && profile.spice >= 2) return "It brings the heat you asked for.";
  if (dish.vegan && profile.diet === "vegan") return "It fits you cleanly without swaps.";
  if (dish.vegetarian && profile.diet === "vegetarian") return "It keeps things vegetarian and satisfying.";
  if (profile.appetite === "light" && ["Snacks", "Garden", "Sea"].includes(dish.category)) return "Bright enough to keep tonight light.";
  if (profile.appetite === "feast" && ["Grill", "Sea"].includes(dish.category)) return "It has the weight for a proper feast.";
  if (profile.adventure >= 2 && dish.tags.includes("adventurous")) return "A bolder pick without going off-piste.";
  return "A strong fit for your current preferences.";
}

export function defaultIntro(profile: DinerProfile, restaurant: Restaurant, returning: boolean) {
  const bits: string[] = [];
  if (profile.appetite === "light") bits.push("keeping it light");
  if (profile.appetite === "feast") bits.push("ready for a feast");
  if (profile.spice >= 2) bits.push("after some heat");
  if (profile.diet !== "none") bits.push(profile.diet);
  const tail = bits.length ? `, ${bits.slice(0, 2).join(" and ")}` : "";
  return returning
    ? `Welcome back to ${restaurant.shortName}${tail}. I tuned these from what you saved.`
    : `Here is where I would start at ${restaurant.shortName}${tail}.`;
}

export function heuristicRecommendations({
  menu,
  profile,
  restaurant,
  memoryFacts = [],
  returning = false
}: {
  menu: MenuItem[];
  profile: DinerProfile;
  restaurant: Restaurant;
  memoryFacts?: MemoryFact[];
  returning?: boolean;
}): RecommendationResponse {
  const safe = menu.filter((dish) => dish.available && conflicts(dish, profile).length === 0);
  const pool = safe.length > 0 ? safe : menu.filter((dish) => dish.available);

  const scored = pool
    .map((dish) => {
      let score = 0;
      score -= Math.abs(dish.spice - profile.spice) * 1.2;
      if (profile.appetite === "light" && ["Snacks", "Garden", "Sea"].includes(dish.category)) score += 2.2;
      if (profile.appetite === "normal") score += 0.8;
      if (profile.appetite === "feast" && ["Grill", "Sea"].includes(dish.category)) score += 2.4;
      if (profile.adventure === 0 && !dish.tags.includes("adventurous")) score += 1.2;
      if (profile.adventure === 2 && (dish.tags.includes("adventurous") || dish.tags.includes("smoky"))) score += 1.8;
      if (profile.diet === "vegan" && dish.vegan) score += 2;
      if (profile.diet === "vegetarian" && dish.vegetarian) score += 1.5;
      for (const fact of memoryFacts) {
        if (fact.text.toLowerCase().includes(dish.category.toLowerCase())) score += fact.confidence;
        if (dish.tags.some((tag) => fact.text.toLowerCase().includes(tag))) score += fact.confidence;
      }
      return { dish, score };
    })
    .sort((a, b) => b.score - a.score);

  return {
    intro: defaultIntro(profile, restaurant, returning),
    picks: scored.slice(0, 3).map(({ dish }) => ({ id: dish.id, reason: reasonFor(dish, profile, memoryFacts) })),
    source: "heuristic"
  };
}
