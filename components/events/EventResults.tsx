"use client";

import { CalendarX } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import type { EventOption } from "@/lib/events/types";

export function EventResults({
  events,
  busyId,
  referredIds,
  onGetTickets,
  onBack
}: {
  events: EventOption[];
  busyId: string | null;
  referredIds: Set<string>;
  onGetTickets: (event: EventOption) => void;
  onBack: () => void;
}) {
  if (events.length === 0) {
    return (
      <div className="event-empty">
        <CalendarX size={32} />
        <h3>Nothing nearby right now</h3>
        <p>We couldn&apos;t find events matching that. Try a different vibe.</p>
        <button className="ghost-button" onClick={onBack}>
          Adjust
        </button>
      </div>
    );
  }

  return (
    <div className="event-results">
      <div className="question-block">
        <p className="eyebrow">Tonight, near you</p>
        <h2>Keep the night going</h2>
      </div>
      <div className="event-list">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            busy={busyId === event.id}
            referred={referredIds.has(event.id)}
            onGetTickets={onGetTickets}
          />
        ))}
      </div>
      <button className="ghost-button event-adjust" onClick={onBack}>
        Adjust preferences
      </button>
    </div>
  );
}
