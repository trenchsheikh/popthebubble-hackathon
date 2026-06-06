import type { EventOption, EventKindTag } from "@/lib/events/types";
import { distanceMiles, type EventProvider, type EventQuery } from "@/lib/events/providers/types";

// Seeded central-London events so the post-dinner flow works with zero API keys
// (matches the project's mock-first philosophy). Always available; the sole
// source when no real provider is configured.

type Seed = {
  providerId: string;
  title: string;
  kind: EventKindTag;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  priceFrom: number;
  hoursFromNow: number;
};

const SEEDS: Seed[] = [
  { providerId: "comedy-store", title: "Late Comedy at The Comedy Store", kind: "comedy", venueName: "The Comedy Store", address: "1a Oxendon St, Soho", lat: 51.5103, lng: -0.1318, priceFrom: 18, hoursFromNow: 2 },
  { providerId: "ronnie-scotts", title: "Ronnie Scott's — Late Jazz Set", kind: "music", venueName: "Ronnie Scott's", address: "47 Frith St, Soho", lat: 51.5138, lng: -0.1316, priceFrom: 35, hoursFromNow: 2.5 },
  { providerId: "skylight-dj", title: "Rooftop DJ Night — Skylight", kind: "nightlife", venueName: "Skylight Soho", address: "Tobacco Dock", lat: 51.5072, lng: -0.0556, priceFrom: 20, hoursFromNow: 3 },
  { providerId: "gallery-lates", title: "National Gallery: Friday Lates", kind: "arts", venueName: "The National Gallery", address: "Trafalgar Square", lat: 51.5089, lng: -0.1283, priceFrom: 12, hoursFromNow: 1.5 },
  { providerId: "jazz-cafe", title: "Soul & Funk — Jazz Café", kind: "music", venueName: "Jazz Café", address: "5 Parkway, Camden", lat: 51.539, lng: -0.1426, priceFrom: 28, hoursFromNow: 3 },
  { providerId: "backyard-improv", title: "Improv Night — Backyard Comedy", kind: "comedy", venueName: "Backyard Comedy Club", address: "Bethnal Green Rd", lat: 51.5246, lng: -0.0686, priceFrom: 15, hoursFromNow: 2 },
  { providerId: "prince-charles", title: "Cult Classic Late — Prince Charles", kind: "film", venueName: "Prince Charles Cinema", address: "7 Leicester Pl", lat: 51.5113, lng: -0.1303, priceFrom: 10, hoursFromNow: 2 },
  { providerId: "van-gogh", title: "Van Gogh Immersive — Late Entry", kind: "arts", venueName: "Lightroom", address: "Kings Cross", lat: 51.5354, lng: -0.1257, priceFrom: 22, hoursFromNow: 1 }
];

function startsAt(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

// Mock events aren't real listings, so point "Get tickets" at a search that
// surfaces the actual event/venue rather than a dead link.
function searchUrl(title: string, venueName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} ${venueName} London tickets`)}`;
}

export const mockProvider: EventProvider = {
  name: "mock",

  isConfigured(): boolean {
    return true;
  },

  async search(query: EventQuery): Promise<EventOption[]> {
    return SEEDS.map((seed) => ({
      id: `mock:${seed.providerId}`,
      provider: "mock" as const,
      title: seed.title,
      kind: seed.kind,
      venueName: seed.venueName,
      address: seed.address,
      distanceMi: distanceMiles({ lat: query.lat, lng: query.lng }, { lat: seed.lat, lng: seed.lng }),
      startsAt: startsAt(seed.hoursFromNow),
      imageUrl: undefined, // EventCard renders an on-brand gradient fallback by kind
      priceFrom: seed.priceFrom,
      currency: "GBP",
      url: searchUrl(seed.title, seed.venueName)
    }));
  }
};
