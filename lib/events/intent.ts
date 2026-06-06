import type { MemoryFact, Restaurant } from "@/lib/types";
import type { BudgetTier, EventIntent, EventKindTag, GroupType } from "@/lib/events/types";
import type { EventQuery } from "@/lib/events/providers/types";

const ALL_KINDS: EventKindTag[] = ["comedy", "music", "arts", "sports", "nightlife", "film"];

const KIND_KEYWORDS: Record<EventKindTag, string[]> = {
  comedy: ["comedy", "stand up", "stand-up", "funny", "laugh", "improv"],
  music: ["music", "gig", "concert", "live band", "jazz", "dj set", "song"],
  arts: ["art", "gallery", "theatre", "theater", "museum", "exhibit", "play", "culture"],
  sports: ["sport", "game", "match", "football", "basketball"],
  nightlife: ["club", "clubbing", "dance", "party", "bar", "nightlife", "dj", "rooftop"],
  film: ["film", "movie", "cinema", "screening"],
  other: []
};

const GROUP_KEYWORDS: Record<GroupType, string[]> = {
  solo: ["solo", "alone", "by myself", "just me"],
  couple: ["date", "couple", "two of us", "partner", "girlfriend", "boyfriend", "wife", "husband"],
  group: ["group", "friends", "team", "everyone", "we ", "us ", "party of"]
};

const HIGH_BUDGET = ["splurge", "treat", "premium", "expensive", "nice", "fancy", "best"];
const LOW_BUDGET = ["cheap", "budget", "affordable", "low cost", "free", "inexpensive"];

/** Heuristic free-text → intent parse. Pure; used as the LLM fallback. */
export function parseIntentText(text: string): EventIntent {
  const lower = ` ${text.toLowerCase()} `;

  const vibes = ALL_KINDS.filter((kind) =>
    KIND_KEYWORDS[kind].some((keyword) => lower.includes(keyword))
  );

  let group: GroupType = "couple";
  for (const candidate of ["solo", "couple", "group"] as GroupType[]) {
    if (GROUP_KEYWORDS[candidate].some((keyword) => lower.includes(keyword))) {
      group = candidate;
      break;
    }
  }

  let budget: BudgetTier = "mid";
  if (HIGH_BUDGET.some((keyword) => lower.includes(keyword))) budget = "high";
  else if (LOW_BUDGET.some((keyword) => lower.includes(keyword))) budget = "low";

  return { group, vibes, budget, freeText: text.slice(0, 280) };
}

/** Bias vibes toward what memory says the diner enjoys. */
function vibesFromMemory(facts: MemoryFact[]): EventKindTag[] {
  const blob = facts.map((fact) => fact.text.toLowerCase()).join(" ");
  return ALL_KINDS.filter((kind) => KIND_KEYWORDS[kind].some((keyword) => blob.includes(keyword)));
}

/**
 * Build the provider query from the diner's intent + the restaurant's location,
 * folding in any vibe signals from their memory facts.
 */
export function buildQueryFromIntent(
  intent: EventIntent,
  restaurant: Restaurant,
  memoryFacts: MemoryFact[] = []
): EventQuery {
  const kinds = [...new Set([...intent.vibes, ...vibesFromMemory(memoryFacts)])];
  return {
    lat: restaurant.lat,
    lng: restaurant.lng,
    city: restaurant.city,
    radiusMi: 10,
    kinds,
    budget: intent.budget
  };
}
