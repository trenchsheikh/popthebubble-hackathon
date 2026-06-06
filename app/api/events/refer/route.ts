import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { addReferral } from "@/lib/events/store";
import { affiliateUrl, DEFAULT_EVENT_COMMISSION_PCT, estimateCommission } from "@/lib/events/affiliate";
import type { EventOption, EventReferral } from "@/lib/events/types";

type ReferBody = {
  slug?: string;
  dinerId?: string;
  event?: EventOption;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evrf_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export async function POST(request: Request) {
  let body: ReferBody;
  try {
    body = (await request.json()) as ReferBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, dinerId, event } = body;
  if (!slug || !dinerId || !event?.id || !event.title || !event.provider || !event.url) {
    return NextResponse.json({ ok: false, error: "Missing slug, dinerId, or event" }, { status: 400 });
  }

  const restaurant = getRestaurantBySlug(slug);
  if (!restaurant) {
    return NextResponse.json({ ok: false, error: "Unknown restaurant" }, { status: 404 });
  }

  const estimatedPrice = typeof event.priceFrom === "number" && event.priceFrom > 0 ? event.priceFrom : 0;
  const commissionPct = restaurant.eventCutPct ?? DEFAULT_EVENT_COMMISSION_PCT;
  const url = affiliateUrl(event);

  const referral: EventReferral = {
    id: newId(),
    slug,
    dinerId,
    eventId: event.id,
    eventTitle: event.title,
    provider: event.provider,
    estimatedPrice,
    currency: event.currency || "GBP",
    commissionPct,
    estimatedCommission: estimateCommission(estimatedPrice, commissionPct),
    url,
    referredAt: Date.now()
  };
  addReferral(referral);

  return NextResponse.json({ ok: true, referralId: referral.id, url });
}
