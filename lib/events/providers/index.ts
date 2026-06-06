import "server-only";
import type { EventOption } from "@/lib/events/types";
import { getCachedEvents, setCachedEvents } from "@/lib/events/store";
import { BUDGET_CEILING, type EventProvider, type EventQuery } from "@/lib/events/providers/types";
import { ticketmasterProvider } from "@/lib/events/providers/ticketmaster";
import { seatgeekProvider } from "@/lib/events/providers/seatgeek";
import { skiddleProvider } from "@/lib/events/providers/skiddle";
import { mockProvider } from "@/lib/events/providers/mock";

const REAL_PROVIDERS: EventProvider[] = [ticketmasterProvider, seatgeekProvider, skiddleProvider];

function cacheKey(query: EventQuery): string {
  return JSON.stringify({
    lat: query.lat,
    lng: query.lng,
    city: query.city,
    radiusMi: query.radiusMi,
    kinds: [...query.kinds].sort(),
    budget: query.budget
  });
}

function dedupeKey(option: EventOption): string {
  return `${option.title.trim().toLowerCase()}|${option.venueName.trim().toLowerCase()}`;
}

// Rank by vibe match (event kind in the requested set), then budget fit, then
// proximity. Higher score sorts first.
function score(option: EventOption, query: EventQuery): number {
  let value = 0;
  if (query.kinds.length === 0 || query.kinds.includes(option.kind)) value += 100;
  if (option.priceFrom != null && option.priceFrom <= BUDGET_CEILING[query.budget]) value += 20;
  if (option.distanceMi != null) value += Math.max(0, 30 - option.distanceMi); // nearer = higher
  return value;
}

/**
 * Aggregate nearby events across all configured providers. Real providers run
 * only when their key is set; the mock provider is the sole source otherwise so
 * the demo always returns results. One provider failing never breaks the call.
 */
export async function searchEvents(query: EventQuery): Promise<EventOption[]> {
  const key = cacheKey(query);
  const cached = getCachedEvents(key);
  if (cached) return cached;

  const configuredReal = REAL_PROVIDERS.filter((provider) => provider.isConfigured());
  const providers = configuredReal.length > 0 ? [...configuredReal, mockProvider] : [mockProvider];

  const settled = await Promise.allSettled(providers.map((provider) => provider.search(query)));
  const all = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const deduped = new Map<string, EventOption>();
  for (const option of all) {
    const existing = deduped.get(dedupeKey(option));
    // Prefer a real provider's listing over the mock one on a title/venue clash.
    if (!existing || (existing.provider === "mock" && option.provider !== "mock")) {
      deduped.set(dedupeKey(option), option);
    }
  }

  const ranked = [...deduped.values()].sort((a, b) => score(b, query) - score(a, query)).slice(0, 12);
  setCachedEvents(key, ranked);
  return ranked;
}
