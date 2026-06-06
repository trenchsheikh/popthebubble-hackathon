"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { recordEvent } from "@/lib/analytics-client";
import { IntentStep } from "@/components/events/IntentStep";
import { EventResults } from "@/components/events/EventResults";
import type { EventIntent, EventKindTag, EventOption } from "@/lib/events/types";
import type { MemoryFact, Restaurant } from "@/lib/types";

type Phase = "intent" | "loading" | "results" | "error";

// Light client-side guess at vibes from memory, only to pre-select chips. The
// server re-derives + ranks authoritatively from the memoryFacts we send.
const MEM_HINTS: { kind: EventKindTag; words: string[] }[] = [
  { kind: "comedy", words: ["comedy", "stand-up", "funny"] },
  { kind: "music", words: ["music", "jazz", "gig", "concert", "live"] },
  { kind: "nightlife", words: ["club", "dance", "dj", "party"] },
  { kind: "arts", words: ["art", "gallery", "theatre", "museum"] },
  { kind: "film", words: ["film", "movie", "cinema"] }
];

function guessVibes(facts: MemoryFact[]): EventKindTag[] {
  const blob = facts.map((fact) => fact.text.toLowerCase()).join(" ");
  return MEM_HINTS.filter((hint) => hint.words.some((word) => blob.includes(word))).map((hint) => hint.kind);
}

export function EventDiscovery({
  restaurant,
  dinerId,
  memoryFacts,
  onClose
}: {
  restaurant: Restaurant;
  dinerId: string;
  memoryFacts: MemoryFact[];
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intent");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [referredIds, setReferredIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const initialVibes = useMemo(() => guessVibes(memoryFacts), [memoryFacts]);

  async function handleIntent(intent: EventIntent) {
    setPhase("loading");
    setError("");
    try {
      const response = await fetch("/api/events/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: restaurant.slug, intent, memoryFacts })
      });
      const data = (await response.json()) as { ok: boolean; events?: EventOption[]; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Search failed");
      setEvents(data.events ?? []);
      setPhase("results");
    } catch {
      setError("We couldn't load events just now. Please try again.");
      setPhase("error");
    }
  }

  async function handleGetTickets(event: EventOption) {
    // Open the (affiliate) provider page immediately in a new tab — doing it
    // synchronously inside the click keeps the browser from blocking the popup.
    const tab = window.open("", "_blank", "noopener,noreferrer");
    setBusyId(event.id);
    recordEvent({
      type: "book_event",
      dinerId,
      restaurantId: restaurant.id,
      metadata: { eventId: event.id, provider: event.provider, title: event.title }
    });
    try {
      const response = await fetch("/api/events/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: restaurant.slug, dinerId, event })
      });
      const data = (await response.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) throw new Error(data.error ?? "Referral failed");
      if (tab) tab.location.href = data.url;
      else window.open(data.url, "_blank", "noopener,noreferrer");
      setReferredIds((current) => new Set(current).add(event.id));
    } catch {
      if (tab) tab.close();
      setError("We couldn't open that event. Please try again.");
      setPhase("error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="events-overlay" role="dialog" aria-modal aria-label="Plans after dinner">
      <header className="events-overlay-head">
        <div>
          <span className="live-dot" />
          {restaurant.shortName} · after dinner
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </header>

      <div className="events-overlay-body">
        {phase === "intent" && <IntentStep initialVibes={initialVibes} onSubmit={handleIntent} busy={false} />}

        {phase === "loading" && (
          <div className="event-loading">
            <Loader2 className="spin" size={30} />
            <p>Finding tonight&apos;s best nearby…</p>
          </div>
        )}

        {phase === "results" && (
          <EventResults
            events={events}
            busyId={busyId}
            referredIds={referredIds}
            onGetTickets={handleGetTickets}
            onBack={() => setPhase("intent")}
          />
        )}

        {phase === "error" && (
          <div className="event-empty">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button className="primary-button" onClick={() => setPhase("intent")}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
