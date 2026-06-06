import "server-only";

import type { AnalyticsEvent, AnalyticsEventInput, CountedRow, DiagnosticsSummary } from "@/lib/analytics/types";

/**
 * In-memory diagnostics store (globalThis-backed, like the restaurant store).
 * Zero-config and always available; resets on server restart and does not
 * aggregate across serverless instances. The clean record()/getDiagnostics()
 * seam means a durable backend (e.g. a Supabase app_events table) can drop in
 * later without touching callers.
 */
const MAX_EVENTS = 10_000;

type Store = { events: AnalyticsEvent[] };
const globalRef = globalThis as unknown as { __bubbleAnalytics?: Store };

function store(): Store {
  if (!globalRef.__bubbleAnalytics) globalRef.__bubbleAnalytics = { events: [] };
  return globalRef.__bubbleAnalytics;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `evt_${counter}`;
}

export function recordEvent(input: AnalyticsEventInput & Partial<Pick<AnalyticsEvent, "country" | "city" | "device" | "at">>): void {
  const events = store().events;
  events.push({ ...input, id: nextId(), at: input.at ?? Date.now() });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

function tally(values: Array<string | undefined>, fallback = "Unknown"): CountedRow[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw && raw.trim() ? raw : fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

function dayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

function shortReferrer(referrer?: string): string {
  if (!referrer) return "Direct / QR";
  try {
    return new URL(referrer).hostname || "Direct / QR";
  } catch {
    return referrer;
  }
}

export function getDiagnostics(): DiagnosticsSummary {
  const events = store().events;
  const scans = events.filter((event) => event.type === "scan");

  const dinerIds = new Set(events.map((event) => event.dinerId).filter(Boolean) as string[]);
  const returningDinerIds = new Set(
    scans.filter((event) => event.returning && event.dinerId).map((event) => event.dinerId as string)
  );

  return {
    generatedAt: Date.now(),
    totalEvents: events.length,
    totalScans: scans.length,
    uniqueDiners: dinerIds.size,
    returningDiners: returningDinerIds.size,
    newDiners: Math.max(0, dinerIds.size - returningDinerIds.size),
    scansByRestaurant: tally(scans.map((event) => event.restaurantId)),
    scansByTable: tally(scans.map((event) => event.table)),
    scansByCountry: tally(scans.map((event) => event.country), "Unknown / local"),
    scansByDevice: tally(scans.map((event) => event.device)),
    topReferrers: tally(scans.map((event) => shortReferrer(event.referrer))).slice(0, 8),
    eventsByType: tally(events.map((event) => event.type)),
    scansByDay: tally(scans.map((event) => dayKey(event.at))).sort((a, b) => a.key.localeCompare(b.key)),
    recent: [...events].slice(-25).reverse()
  };
}
