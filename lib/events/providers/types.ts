import type { BudgetTier, EventKindTag, EventOption } from "@/lib/events/types";

// A normalized query handed to every provider. Built from the diner's intent +
// the restaurant's location by lib/events/intent.ts.
export type EventQuery = {
  lat?: number;
  lng?: number;
  city?: string;
  radiusMi: number;
  kinds: EventKindTag[]; // empty = any
  budget: BudgetTier;
};

export interface EventProvider {
  name: EventOption["provider"];
  isConfigured(): boolean;
  search(query: EventQuery): Promise<EventOption[]>;
}

// Rough budget → per-ticket price ceiling (used by providers that support a
// price filter, and by ranking). Decimal in the restaurant's currency.
export const BUDGET_CEILING: Record<BudgetTier, number> = {
  low: 25,
  mid: 60,
  high: 250
};

const KNOWN_KINDS = new Set<EventKindTag>([
  "comedy",
  "music",
  "arts",
  "sports",
  "nightlife",
  "film",
  "other"
]);

// Map a free-form provider segment/genre string to our tag set.
export function normalizeKind(raw: string | undefined): EventKindTag {
  const value = (raw ?? "").toLowerCase();
  if (KNOWN_KINDS.has(value as EventKindTag)) return value as EventKindTag;
  if (value.includes("comedy")) return "comedy";
  if (value.includes("music") || value.includes("concert")) return "music";
  if (value.includes("art") || value.includes("theat") || value.includes("thea")) return "arts";
  if (value.includes("sport")) return "sports";
  if (value.includes("club") || value.includes("night") || value.includes("dj")) return "nightlife";
  if (value.includes("film") || value.includes("movie") || value.includes("cinema")) return "film";
  return "other";
}

// Approximate great-circle distance in miles (haversine). Returns undefined if
// either coordinate is missing.
export function distanceMiles(
  from: { lat?: number; lng?: number },
  to: { lat?: number; lng?: number }
): number | undefined {
  if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) return undefined;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMi = 3958.8;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadiusMi * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
