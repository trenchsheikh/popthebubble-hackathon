"use client";

import type { AnalyticsEventInput } from "@/lib/analytics/types";

/**
 * Fire-and-forget diagnostics capture. Uses sendBeacon when available so events
 * survive page unloads; never throws and never blocks the UI.
 */
export function recordEvent(input: AnalyticsEventInput): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      ...input,
      referrer: input.referrer ?? document.referrer,
      path: input.path ?? window.location.pathname
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    });
  } catch {
    // analytics is best-effort
  }
}
