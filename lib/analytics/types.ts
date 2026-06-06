// Diagnostics event model. Intentionally flexible: a known `type` union plus a
// free-form metadata bag so new capture points don't require schema changes.

export type AnalyticsEventType =
  | "scan" // diner opened a table menu (QR)
  | "onboarding_complete"
  | "open_chat"
  | "chat_ask"
  | "dish_view"
  | "order_placed"
  | "service_call"
  | "open_events" // diner opened the post-dinner event discovery flow
  | "book_event"; // diner booked a recommended event

export type AnalyticsEventInput = {
  type: AnalyticsEventType;
  dinerId?: string;
  restaurantId?: string;
  table?: string;
  returning?: boolean;
  referrer?: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

// Server-enriched, stored event.
export type AnalyticsEvent = AnalyticsEventInput & {
  id: string;
  at: number; // epoch ms
  country?: string;
  city?: string;
  device?: "mobile" | "desktop";
};

export type CountedRow = { key: string; count: number };

export type DiagnosticsSummary = {
  generatedAt: number;
  totalEvents: number;
  totalScans: number;
  uniqueDiners: number;
  returningDiners: number;
  newDiners: number;
  scansByRestaurant: CountedRow[];
  scansByTable: CountedRow[];
  scansByCountry: CountedRow[];
  scansByDevice: CountedRow[];
  topReferrers: CountedRow[];
  eventsByType: CountedRow[];
  scansByDay: CountedRow[]; // YYYY-MM-DD -> scans
  recent: AnalyticsEvent[];
};
