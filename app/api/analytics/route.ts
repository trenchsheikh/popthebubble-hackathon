import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/analytics/store";
import type { AnalyticsEventInput } from "@/lib/analytics/types";

const KNOWN_TYPES = new Set([
  "scan",
  "onboarding_complete",
  "open_chat",
  "chat_ask",
  "dish_view",
  "order_placed",
  "service_call"
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AnalyticsEventInput | null;
  if (!body?.type || !KNOWN_TYPES.has(body.type)) {
    return NextResponse.json({ error: "A known event type is required." }, { status: 400 });
  }

  // Enrich from request headers. Geo headers are populated by Vercel/Cloudflare
  // in production; absent locally (→ "Unknown / local").
  const headers = request.headers;
  const country = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry") ?? undefined;
  const city = headers.get("x-vercel-ip-city") ?? undefined;
  const userAgent = headers.get("user-agent") ?? "";
  const device: "mobile" | "desktop" = /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? "mobile" : "desktop";

  recordEvent({
    type: body.type,
    dinerId: body.dinerId,
    restaurantId: body.restaurantId,
    table: body.table,
    returning: body.returning,
    referrer: body.referrer,
    path: body.path,
    metadata: body.metadata,
    country,
    city: city ? decodeURIComponent(city) : undefined,
    device
  });

  return NextResponse.json({ ok: true });
}
