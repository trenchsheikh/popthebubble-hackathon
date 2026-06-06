import "server-only";
import type { EventOption } from "@/lib/events/types";

// Default restaurant share of the referral commission when a restaurant has no
// explicit `eventCutPct`. 10% — a plausible affiliate split.
export const DEFAULT_EVENT_COMMISSION_PCT = 0.1;

/** Restaurant's estimated commission on a referral, rounded to 2 decimals. */
export function estimateCommission(price: number, pct: number): number {
  const safePct = Math.max(0, Math.min(1, pct));
  return Math.round(price * safePct * 100) / 100;
}

/**
 * Wrap a provider event URL with affiliate tracking when configured.
 * - SeatGeek: documented `aid` (affiliate id) query param — real commission.
 * - Ticketmaster: real commission comes from network-generated Impact/
 *   Partnerize links; absent that we attach a partner tag for attribution.
 * Returns the original URL unchanged when no affiliate id is set (or for mock
 * events, whose URLs are plain search links).
 */
export function affiliateUrl(event: EventOption): string {
  try {
    if (event.provider === "seatgeek") {
      const aid = process.env.SEATGEEK_AFFILIATE_ID;
      if (!aid) return event.url;
      const url = new URL(event.url);
      url.searchParams.set("aid", aid);
      return url.toString();
    }
    if (event.provider === "ticketmaster") {
      const tag = process.env.TICKETMASTER_AFFILIATE_ID;
      if (!tag) return event.url;
      const url = new URL(event.url);
      url.searchParams.set("camefrom", tag);
      return url.toString();
    }
    if (event.provider === "skiddle") {
      // Skiddle pays 30% via their affiliate program; attribution rides an `aff`
      // param on the event link (set SKIDDLE_AFFILIATE_ID once enrolled).
      const aff = process.env.SKIDDLE_AFFILIATE_ID;
      if (!aff) return event.url;
      const url = new URL(event.url);
      url.searchParams.set("aff", aff);
      return url.toString();
    }
    return event.url;
  } catch {
    return event.url;
  }
}
