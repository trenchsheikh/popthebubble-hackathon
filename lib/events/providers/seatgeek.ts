import "server-only";
import type { EventOption, EventKindTag } from "@/lib/events/types";
import { distanceMiles, normalizeKind, type EventProvider, type EventQuery } from "@/lib/events/providers/types";

// SeatGeek Platform API. Partner program pays commission on referred sales.
// https://platform.seatgeek.com/  — auth via client_id query param.
const BASE_URL = "https://api.seatgeek.com/2/events";
const TIMEOUT_MS = 8000;

// Our tag → SeatGeek `type` filter value.
const KIND_TO_TYPE: Partial<Record<EventKindTag, string>> = {
  comedy: "comedy",
  music: "concert",
  arts: "theater",
  sports: "sports",
  nightlife: "concert"
};

type SgPerformer = { image?: string };
type SgEvent = {
  id?: number;
  title?: string;
  url?: string;
  type?: string;
  datetime_local?: string;
  stats?: { lowest_price?: number | null };
  performers?: SgPerformer[];
  venue?: {
    name?: string;
    display_location?: string;
    address?: string;
    location?: { lat?: number; lon?: number };
  };
};
type SgResponse = { events?: SgEvent[] };

function toOption(event: SgEvent, query: EventQuery): EventOption | null {
  const id = event.id;
  const title = event.title;
  const url = event.url;
  if (id == null || !title || !url) return null;

  const venue = event.venue;
  const lowest = event.stats?.lowest_price;

  return {
    id: `seatgeek:${id}`,
    provider: "seatgeek",
    title,
    kind: normalizeKind(event.type),
    venueName: venue?.name ?? venue?.display_location ?? "Venue TBA",
    address: venue?.address ?? venue?.display_location,
    distanceMi: distanceMiles(
      { lat: query.lat, lng: query.lng },
      { lat: venue?.location?.lat, lng: venue?.location?.lon }
    ),
    startsAt: event.datetime_local,
    imageUrl: event.performers?.find((performer) => performer.image)?.image,
    priceFrom: typeof lowest === "number" ? lowest : undefined,
    currency: "USD", // SeatGeek prices are USD; surfaced per-card
    url
  };
}

export const seatgeekProvider: EventProvider = {
  name: "seatgeek",

  isConfigured(): boolean {
    return Boolean(process.env.SEATGEEK_CLIENT_ID);
  },

  async search(query: EventQuery): Promise<EventOption[]> {
    const clientId = process.env.SEATGEEK_CLIENT_ID;
    if (!clientId) return [];

    const params = new URLSearchParams({
      client_id: clientId,
      per_page: "20",
      sort: "datetime_local.asc",
      range: `${Math.round(query.radiusMi)}mi`
    });
    if (query.lat != null && query.lng != null) {
      params.set("lat", String(query.lat));
      params.set("lon", String(query.lng));
    } else if (query.city) {
      params.set("venue.city", query.city);
    }
    const types = [...new Set(query.kinds.map((kind) => KIND_TO_TYPE[kind]).filter(Boolean))];
    types.forEach((type) => params.append("type", type as string));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return [];
      const data = (await response.json()) as SgResponse;
      return (data.events ?? [])
        .map((event) => toOption(event, query))
        .filter((option): option is EventOption => option !== null);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
};
