import type { EventOption, EventReferral } from "@/lib/events/types";

// In-memory store for event referrals + a tiny TTL cache for provider results.
// Same globalThis pattern as lib/orders/store.ts: survives Next.js HMR, resets
// on a full server restart. No DB yet (MVP).

type CacheEntry = { events: EventOption[]; expiresAt: number };

type EventsStore = {
  referrals: EventReferral[];
  cache: Map<string, CacheEntry>;
};

const globalStore = globalThis as unknown as { __hinokiEvents?: EventsStore };
if (!globalStore.__hinokiEvents) {
  globalStore.__hinokiEvents = { referrals: [], cache: new Map() };
}

function store(): EventsStore {
  return globalStore.__hinokiEvents!;
}

// --- Referrals ---

export function addReferral(referral: EventReferral): EventReferral {
  store().referrals.unshift(referral);
  return referral;
}

export function listReferrals(slug?: string): EventReferral[] {
  const all = store().referrals;
  return slug ? all.filter((referral) => referral.slug === slug) : all;
}

// --- Provider result cache (rate-limit friendliness) ---

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCachedEvents(key: string): EventOption[] | null {
  const entry = store().cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store().cache.delete(key);
    return null;
  }
  return entry.events;
}

export function setCachedEvents(key: string, events: EventOption[]): void {
  store().cache.set(key, { events, expiresAt: Date.now() + CACHE_TTL_MS });
}
