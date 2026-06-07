import "server-only";
import type { EventOption, EventKindTag } from "@/lib/events/types";
import { distanceMiles, normalizeKind, type EventProvider, type EventQuery } from "@/lib/events/providers/types";

// Skiddle Events API — strongest UK what's-on catalog (150k+ events) and pays a
// 30% affiliate commission. Free API key on request.
// Docs: https://www.skiddle.com/api/   Affiliate: https://www.skiddle.com/affiliates/
const BASE_URL = "https://www.skiddle.com/api/v1/events/search/";
const TIMEOUT_MS = 8000;

// Our tag → Skiddle `eventcode` category. Skiddle takes one code; when the diner
// picks several vibes we omit the filter and rank locally.
const KIND_TO_EVENTCODE: Record<EventKindTag, string> = {
  comedy: "COMEDY",
  music: "LIVE",
  arts: "ARTS",
  sports: "SPORT",
  nightlife: "CLUB",
  film: "FILM",
  other: ""
};

// Reverse map for classifying Skiddle results by their EventCode (LIVE→music,
// CLUB→nightlife, …) — otherwise everything falls through to "other" and vibe
// ranking can't work.
const EVENTCODE_TO_KIND: Record<string, EventKindTag> = {
  COMEDY: "comedy",
  LIVE: "music",
  CLUB: "nightlife",
  ARTS: "arts",
  THEATRE: "arts",
  FILM: "film",
  SPORT: "sports"
};

type SkiddleVenue = {
  name?: string;
  town?: string;
  postcode?: string;
  latitude?: string | number;
  longitude?: string | number;
};

type SkiddleEvent = {
  id?: string | number;
  eventname?: string;
  description?: string;
  venue?: SkiddleVenue;
  date?: string; // YYYY-MM-DD
  openingtimes?: { doorsopen?: string };
  imageurl?: string;
  largeimageurl?: string;
  link?: string;
  entryprice?: string | number;
  EventCode?: string;
  genres?: { name?: string }[];
};

type SkiddleResponse = { results?: SkiddleEvent[] };

function parsePrice(value: string | number | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value === "string") {
    const num = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }
  return undefined;
}

function startsAtIso(event: SkiddleEvent): string | undefined {
  if (!event.date) return undefined;
  const door = event.openingtimes?.doorsopen;
  // doorsopen is like "20:00:00"; combine with the date for a local ISO string.
  return door ? `${event.date}T${door}` : event.date;
}

function toOption(event: SkiddleEvent, query: EventQuery): EventOption | null {
  const id = event.id != null ? String(event.id) : undefined;
  const title = event.eventname;
  const url = event.link;
  if (!id || !title || !url) return null;

  const venue = event.venue;
  const venueLat = venue?.latitude != null ? Number(venue.latitude) : undefined;
  const venueLng = venue?.longitude != null ? Number(venue.longitude) : undefined;
  const genre = event.genres?.[0]?.name;

  const codeKind = event.EventCode ? EVENTCODE_TO_KIND[event.EventCode.toUpperCase()] : undefined;

  return {
    id: `skiddle:${id}`,
    provider: "skiddle",
    title,
    kind: codeKind ?? normalizeKind(genre ?? event.EventCode),
    venueName: venue?.name ?? venue?.town ?? "Venue TBA",
    address: venue?.town,
    distanceMi: distanceMiles({ lat: query.lat, lng: query.lng }, { lat: venueLat, lng: venueLng }),
    startsAt: startsAtIso(event),
    imageUrl: event.largeimageurl ?? event.imageurl,
    priceFrom: parsePrice(event.entryprice),
    currency: "GBP",
    url
  };
}

export const skiddleProvider: EventProvider = {
  name: "skiddle",

  isConfigured(): boolean {
    return Boolean(process.env.SKIDDLE_API_KEY);
  },

  async search(query: EventQuery): Promise<EventOption[]> {
    const apiKey = process.env.SKIDDLE_API_KEY;
    if (!apiKey) return [];

    function baseParams(): URLSearchParams {
      const params = new URLSearchParams({
        api_key: apiKey!,
        limit: "20",
        description: "1",
        minDate: new Date().toISOString().slice(0, 10) // upcoming only
      });
      if (query.lat != null && query.lng != null) {
        params.set("latitude", String(query.lat));
        params.set("longitude", String(query.lng));
        params.set("radius", String(Math.round(query.radiusMi)));
        params.set("order", "distance");
      } else if (query.city) {
        params.set("keyword", query.city);
      }
      return params;
    }

    async function fetchOnce(eventcode?: string): Promise<EventOption[]> {
      const params = baseParams();
      if (eventcode) params.set("eventcode", eventcode);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(`${BASE_URL}?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" }
        });
        if (!response.ok) return [];
        const data = (await response.json()) as SkiddleResponse;
        return (data.results ?? [])
          .map((event) => toOption(event, query))
          .filter((option): option is EventOption => option !== null);
      } catch {
        return []; // one call failing must never break the aggregate search
      } finally {
        clearTimeout(timer);
      }
    }

    // When the diner picks vibes, query Skiddle once per matching category (it
    // only takes one eventcode per call) and merge — so multiple vibes return
    // relevant events instead of whatever's nearest. No vibes → one broad call.
    const codes = [...new Set(query.kinds.map((kind) => KIND_TO_EVENTCODE[kind]).filter(Boolean))].slice(0, 4);
    const batches = codes.length > 0 ? await Promise.all(codes.map((code) => fetchOnce(code))) : [await fetchOnce()];

    const byId = new Map<string, EventOption>();
    for (const option of batches.flat()) {
      if (!byId.has(option.id)) byId.set(option.id, option);
    }
    return [...byId.values()];
  }
};
