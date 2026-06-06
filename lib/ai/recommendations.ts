import { chatCompletion, parseJsonObject } from "@/lib/ai/provider";
import type { RecommendationServiceInput } from "@/lib/ai/types";
import { conflicts } from "@/lib/conflicts";
import { defaultIntro, heuristicRecommendations } from "@/lib/recommend";
import type { MenuItem, Recommendation, RecommendationResponse } from "@/lib/types";

type AiRecommendationPayload = {
  picks?: Array<{
    id?: unknown;
    reason?: unknown;
  }>;
  intro?: unknown;
};

function cleanReason(reason: unknown) {
  return typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 180) : "A strong fit for your current preferences.";
}

function safeAvailable(menu: MenuItem[], input: RecommendationServiceInput) {
  return menu.filter((dish) => dish.available && conflicts(dish, input.profile).length === 0);
}

function validatePicks(payload: AiRecommendationPayload | null, input: RecommendationServiceInput): Recommendation[] {
  const safeIds = new Set(safeAvailable(input.menu, input).map((dish) => dish.id));
  const seen = new Set<string>();
  const picks: Recommendation[] = [];

  for (const pick of payload?.picks ?? []) {
    if (typeof pick.id !== "string" || !safeIds.has(pick.id) || seen.has(pick.id)) continue;
    seen.add(pick.id);
    picks.push({ id: pick.id, reason: cleanReason(pick.reason) });
    if (picks.length === 3) break;
  }

  return picks;
}

function fillWithHeuristic(picks: Recommendation[], input: RecommendationServiceInput) {
  const safeIds = new Set(safeAvailable(input.menu, input).map((dish) => dish.id));
  const seen = new Set(picks.map((pick) => pick.id));
  const heuristic = heuristicRecommendations(input);

  for (const pick of heuristic.picks) {
    if (!safeIds.has(pick.id) || seen.has(pick.id)) continue;
    seen.add(pick.id);
    picks.push(pick);
    if (picks.length === 3) break;
  }

  if (picks.length < 3) {
    for (const dish of safeAvailable(input.menu, input)) {
      if (seen.has(dish.id)) continue;
      seen.add(dish.id);
      picks.push({ id: dish.id, reason: "A safe fit for your profile." });
      if (picks.length === 3) break;
    }
  }

  return picks.slice(0, 3);
}

export async function recommendDishes(input: RecommendationServiceInput): Promise<RecommendationResponse> {
  const heuristic = heuristicRecommendations(input);
  const safeCount = safeAvailable(input.menu, input).length;
  if (safeCount === 0) return { ...heuristic, picks: [], source: "heuristic" };

  const ai = await chatCompletion({
    json: true,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You recommend restaurant menu items. Return JSON only: { intro: string, picks: [{ id: string, reason: string }] }. Use only supplied menu ids. Recommend exactly 3 if possible. Never pick unavailable dishes or dishes marked unsafe."
      },
      {
        role: "user",
        content: JSON.stringify({
          restaurant: input.restaurant,
          profile: input.profile,
          memoryFacts: input.memoryFacts ?? [],
          menu: input.menu.map((dish) => ({
            id: dish.id,
            name: dish.name,
            category: dish.category,
            spice: dish.spice,
            vegetarian: dish.vegetarian,
            vegan: dish.vegan,
            available: dish.available,
            tags: dish.tags,
            blurb: dish.blurb,
            unsafe: conflicts(dish, input.profile)
          }))
        })
      }
    ]
  });

  if (!ai) return { ...heuristic, picks: fillWithHeuristic([], input), source: "heuristic" };

  const parsed = parseJsonObject<AiRecommendationPayload>(ai.content);
  const picks = fillWithHeuristic(validatePicks(parsed, input), input);
  const intro = typeof parsed?.intro === "string" && parsed.intro.trim()
    ? parsed.intro.trim().slice(0, 220)
    : defaultIntro(input.profile, input.restaurant, Boolean(input.returning));

  return {
    intro,
    picks,
    source: ai.source
  };
}
