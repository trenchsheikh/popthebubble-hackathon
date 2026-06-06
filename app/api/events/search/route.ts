import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { buildQueryFromIntent } from "@/lib/events/intent";
import { searchEvents } from "@/lib/events/providers";
import type { EventIntent, EventKindTag, GroupType, BudgetTier } from "@/lib/events/types";
import type { MemoryFact } from "@/lib/types";

const VALID_KINDS: EventKindTag[] = ["comedy", "music", "arts", "sports", "nightlife", "film", "other"];
const VALID_GROUPS: GroupType[] = ["solo", "couple", "group"];
const VALID_BUDGETS: BudgetTier[] = ["low", "mid", "high"];

type SearchBody = {
  slug?: string;
  intent?: Partial<EventIntent>;
  memoryFacts?: MemoryFact[];
};

function sanitizeIntent(input: Partial<EventIntent> | undefined): EventIntent {
  const group = VALID_GROUPS.includes(input?.group as GroupType) ? (input!.group as GroupType) : "couple";
  const budget = VALID_BUDGETS.includes(input?.budget as BudgetTier) ? (input!.budget as BudgetTier) : "mid";
  const vibes = Array.isArray(input?.vibes)
    ? [...new Set(input!.vibes.filter((vibe): vibe is EventKindTag => VALID_KINDS.includes(vibe as EventKindTag)))]
    : [];
  return { group, budget, vibes };
}

export async function POST(request: Request) {
  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }
  const restaurant = getRestaurantBySlug(body.slug);
  if (!restaurant) {
    return NextResponse.json({ ok: false, error: "Unknown restaurant" }, { status: 404 });
  }

  const intent = sanitizeIntent(body.intent);
  const memoryFacts = Array.isArray(body.memoryFacts) ? body.memoryFacts.slice(0, 20) : [];
  const query = buildQueryFromIntent(intent, restaurant, memoryFacts);

  try {
    const events = await searchEvents(query);
    return NextResponse.json({ ok: true, events });
  } catch {
    return NextResponse.json({ ok: false, error: "Event search failed" }, { status: 502 });
  }
}
