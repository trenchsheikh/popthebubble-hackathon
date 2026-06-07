import "server-only";
import { chatCompletion, parseJsonObject } from "@/lib/ai/provider";
import { ALLERGEN_KEYS } from "@/lib/profile";
import { cuisineDinerConfig } from "@/lib/menu/cuisine-allergens";
import type { Allergen, Diet, DinerQuestionConfig } from "@/lib/types";

// Background "menu intelligence" run, once at publish. Given the cuisine + the
// reviewed dishes it (a) infers a fuller allergen list per dish — catching hidden
// allergens the OCR misses (soy in soy sauce, peanuts in satay, sesame across
// East-Asian dishes) — and (b) recommends which allergen/diet questions to ask
// diners. Strictly ADDITIVE and fail-soft: it only ever adds allergens on top of
// what the owner/OCR set, unions onto the deterministic cuisine baseline, and
// falls back to that baseline if the model is unavailable.

type EnrichDish = { id: string; name: string; nativeName?: string; description?: string; contains: Allergen[] };
export type MenuEnrichment = { dishAllergens: Record<string, Allergen[]>; config: DinerQuestionConfig };

const VALID_DIETS = new Set<Diet>(["none", "vegetarian", "vegan", "pescatarian", "halal"]);

function asAllergens(value: unknown): Allergen[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((x): x is Allergen => typeof x === "string" && ALLERGEN_KEYS.has(x as Allergen)))];
}

export async function enrichMenu(cuisine: string | undefined, dishes: EnrichDish[]): Promise<MenuEnrichment> {
  const baseline = cuisineDinerConfig(cuisine);
  const fallback: MenuEnrichment = {
    dishAllergens: Object.fromEntries(dishes.map((dish) => [dish.id, dish.contains])),
    config: baseline
  };
  if (dishes.length === 0) return fallback;

  const allergenList = [...ALLERGEN_KEYS];
  const system = `You are a food-safety assistant for a ${cuisine || "restaurant"}. For each dish, list the allergens it most likely contains, choosing ONLY from this set: ${JSON.stringify(allergenList)}. Be thorough about typical/hidden allergens for this cuisine (e.g. soy sauce → soy + gluten; satay/kung pao → peanuts; many East-Asian dishes → sesame; tempura → gluten + egg). Then recommend which allergens and diets this venue should ask diners about.
Respond with ONLY JSON: {"dishes":[{"id":string,"allergens":string[]}],"ask":{"allergens":string[],"diets":string[]}}. diets must come from ["none","vegetarian","vegan","pescatarian","halal"].`;
  const user = JSON.stringify({
    dishes: dishes.map((dish) => ({ id: dish.id, name: dish.name, nativeName: dish.nativeName, description: dish.description }))
  });

  try {
    const ai = await chatCompletion({
      json: true,
      temperature: 0,
      maxTokens: 1500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });
    if (!ai) return fallback;

    const parsed = parseJsonObject<{
      dishes?: { id?: string; allergens?: unknown }[];
      ask?: { allergens?: unknown; diets?: unknown };
    }>(ai.content);
    if (!parsed) return fallback;

    const aiById = new Map<string, Allergen[]>();
    for (const entry of parsed.dishes ?? []) {
      if (entry?.id) aiById.set(entry.id, asAllergens(entry.allergens));
    }

    // Additive: union AI allergens with what was already set — never drop any.
    const dishAllergens: Record<string, Allergen[]> = {};
    for (const dish of dishes) {
      dishAllergens[dish.id] = [...new Set([...dish.contains, ...(aiById.get(dish.id) ?? [])])];
    }

    const askDiets = Array.isArray(parsed.ask?.diets)
      ? parsed.ask!.diets.filter((x): x is Diet => typeof x === "string" && VALID_DIETS.has(x as Diet))
      : [];
    const config: DinerQuestionConfig = {
      allergens: [...new Set([...baseline.allergens, ...asAllergens(parsed.ask?.allergens)])],
      diets: [...new Set([...baseline.diets, ...askDiets])]
    };

    return { dishAllergens, config };
  } catch {
    return fallback;
  }
}
