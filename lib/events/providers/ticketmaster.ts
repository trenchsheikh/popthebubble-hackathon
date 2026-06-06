import "server-only";
import type { EventOption, EventKindTag } from "@/lib/events/types";
import { distanceMiles, normalizeKind, type EventProvider, type EventQuery } from "@/lib/events/providers/types";

// Ticketmaster Discovery API v2. Free tier (~5k calls/day). Filters by
// latlong + radius + classificationName. Docs:
// https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
const BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const TIMEOUT_MS = 8000;

// Our tag → a Discovery classificationName keyword (matched across segment/
// genre/subgenre by the API).
const KIND_TO_CLASSIFICATION: Record<EventKindTag, string> = {
  comedy: "Comedy",
  music: "Music",
  arts: "Arts & Theatre",
  sports: "Sports",
  nightlife: "Music",
  film: "Film",
  other: ""
};

type TmImage = { url?: string; width?: number };
type TmEvent = {
  id?: string;
  name?: string;
  url?: string;
  images?: TmImage[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  priceRanges?: { min?: number; currency?: string }[];
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      address?: { line1?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
};
type TmResponse = { _embedded?: { events?: TmEvent[] } };

function pickImage(images: TmImage[] | undefined): string | undefined {
  if (!images?.length) return undefined;
  const wide = images.filter((image) => image.url && (image.width ?? 0) >= 640);
  return (wide[0] ?? images.find((image) => image.url))?.url;
}

function classificationFor(kinds: EventKindTag[]): string {
  const names = kinds
    .map((kind) => KIND_TO_CLASSIFICATION[kind])
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)].join(",");
}

function toOption(event: TmEvent, query: EventQuery): EventOption | null {
  const id = event.id;
  const title = event.name;
  const url = event.url;
  if (!id || !title || !url) return null;

  const venue = event._embedded?.venues?.[0];
  const segment = event.classifications?.[0]?.segment?.name;
  const genre = event.classifications?.[0]?.genre?.name;
  const price = event.priceRanges?.[0];
  const venueLat = venue?.location?.latitude ? Number(venue.location.latitude) : undefined;
  const venueLng = venue?.location?.longitude ? Number(venue.location.longitude) : undefined;

  return {
    id: `ticketmaster:${id}`,
    provider: "ticketmaster",
    title,
    kind: normalizeKind(genre ?? segment),
    venueName: venue?.name ?? venue?.city?.name ?? "Venue TBA",
    address: venue?.address?.line1,
    distanceMi: distanceMiles({ lat: query.lat, lng: query.lng }, { lat: venueLat, lng: venueLng }),
    startsAt: event.dates?.start?.dateTime ?? event.dates?.start?.localDate,
    imageUrl: pickImage(event.images),
    priceFrom: typeof price?.min === "number" ? price.min : undefined,
    currency: price?.currency ?? "GBP",
    url
  };
}

export const ticketmasterProvider: EventProvider = {
  name: "ticketmaster",

  isConfigured(): boolean {
    return Boolean(process.env.TICKETMASTER_API_KEY);
  },

  async search(query: EventQuery): Promise<EventOption[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
      apikey: apiKey,
      size: "20",
      sort: "date,asc",
      unit: "miles",
      radius: String(Math.round(query.radiusMi))
    });
    if (query.lat != null && query.lng != null) {
      params.set("latlong", `${query.lat},${query.lng}`);
    } else if (query.city) {
      params.set("city", query.city);
    }
    const classification = classificationFor(query.kinds);
    if (classification) params.set("classificationName", classification);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return [];
      const data = (await response.json()) as TmResponse;
      const events = data._embedded?.events ?? [];
      return events
        .map((event) => toOption(event, query))
        .filter((option): option is EventOption => option !== null);
    } catch {
      // One provider failing must never break the aggregate search.
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
};
