// Post-dinner event recommendations — shared domain types.
// EventOption is the normalized shape every provider (Ticketmaster, SeatGeek,
// mock) maps into; EventIntent is what the diner tells us they want; and
// EventBooking is the ledger row we keep when they book + pay.

export type EventKindTag =
  | "comedy"
  | "music"
  | "arts"
  | "sports"
  | "nightlife"
  | "film"
  | "other";

export type GroupType = "solo" | "couple" | "group";
export type BudgetTier = "low" | "mid" | "high";
export type EventProviderName = "ticketmaster" | "seatgeek" | "skiddle" | "mock";

export type EventOption = {
  id: string; // `${provider}:${providerId}`
  provider: EventProviderName;
  title: string;
  kind: EventKindTag;
  venueName: string;
  address?: string;
  distanceMi?: number;
  startsAt?: string; // ISO 8601
  imageUrl?: string;
  priceFrom?: number; // decimal in `currency`
  currency: string; // ISO 4217, e.g. "GBP"
  url: string; // provider deep link (affiliate-ready)
};

export type EventIntent = {
  group: GroupType;
  vibes: EventKindTag[];
  budget: BudgetTier;
  freeText?: string;
};

// We don't take payment — we refer the diner to the provider via an affiliate
// deep link and earn commission on conversion. A referral is the click-out we
// record; the restaurant's commission is an ESTIMATE until the affiliate
// network confirms the sale out-of-band (no in-app payment state).
export type EventReferral = {
  id: string;
  slug: string; // restaurant slug
  dinerId: string;
  eventId: string;
  eventTitle: string;
  provider: EventProviderName;
  estimatedPrice: number; // per-ticket "from" price the diner saw
  currency: string;
  commissionPct: number; // 0..1, restaurant's share of the referral commission
  estimatedCommission: number; // estimatedPrice * commissionPct, rounded
  url: string; // affiliate deep link opened
  referredAt: number; // epoch ms
};
