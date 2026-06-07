import type { Allergen, Diet, DinerQuestionConfig } from "@/lib/types";

// Deterministic cuisine → relevant-allergen/diet map. This is the guaranteed
// baseline + fallback for the diner-question config: it makes onboarding
// cuisine-appropriate even with no LLM (and the enrichment pass only ever
// unions on top of this — it never removes a baseline allergen). Keyword-matched
// against the restaurant's free-text cuisine, so partial matches work
// ("Tokyo Izakaya" → east_asian).

const ALL_DIETS: Diet[] = ["none", "vegetarian", "vegan", "pescatarian", "halal"];

// The original six — sensible Western default when nothing matches.
const DEFAULT_ALLERGENS: Allergen[] = ["gluten", "shellfish", "fish", "dairy", "egg", "nuts"];

type Profile = { keywords: string[]; allergens: Allergen[]; diets: Diet[] };

const PROFILES: Profile[] = [
  {
    keywords: ["chinese", "sichuan", "szechuan", "cantonese", "dim sum", "japanese", "izakaya", "sushi", "ramen", "korean", "thai", "vietnamese", "asian", "noodle", "wok"],
    allergens: ["gluten", "soy", "sesame", "peanuts", "nuts", "shellfish", "fish", "molluscs", "egg"],
    diets: ["none", "vegetarian", "vegan", "pescatarian", "halal"]
  },
  {
    keywords: ["indian", "pakistani", "curry", "tandoori", "punjabi", "south asian"],
    allergens: ["gluten", "dairy", "nuts", "peanuts", "mustard", "sesame", "egg"],
    diets: ["none", "vegetarian", "vegan", "halal"]
  },
  {
    keywords: ["lebanese", "turkish", "persian", "kebab", "middle eastern", "mediterranean", "falafel", "shawarma"],
    allergens: ["gluten", "sesame", "nuts", "dairy", "egg"],
    diets: ["none", "vegetarian", "vegan", "halal"]
  },
  {
    keywords: ["mexican", "taco", "latin", "tex-mex", "burrito"],
    allergens: ["gluten", "dairy", "egg", "soy"],
    diets: ["none", "vegetarian", "vegan"]
  },
  {
    keywords: ["italian", "pizza", "pizzeria", "pasta", "trattoria"],
    allergens: ["gluten", "dairy", "egg", "fish", "shellfish", "nuts"],
    diets: ["none", "vegetarian", "vegan", "pescatarian"]
  },
  {
    keywords: ["seafood", "fish", "oyster", "sushi bar", "raw bar"],
    allergens: ["shellfish", "fish", "molluscs", "gluten", "dairy", "sesame"],
    diets: ["none", "pescatarian"]
  }
];

export function cuisineDinerConfig(cuisine: string | undefined): DinerQuestionConfig {
  const lower = (cuisine ?? "").toLowerCase();
  const match = PROFILES.find((profile) => profile.keywords.some((keyword) => lower.includes(keyword)));
  if (match) return { allergens: [...match.allergens], diets: [...match.diets] };
  return { allergens: [...DEFAULT_ALLERGENS], diets: [...ALL_DIETS] };
}
