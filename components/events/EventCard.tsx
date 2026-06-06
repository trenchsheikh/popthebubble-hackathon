"use client";

import { ArrowUpRight, Check, Clock, Disc3, Film, Laugh, MapPin, Music, Palette, Sparkles, Ticket, Trophy } from "lucide-react";
import type { ComponentType } from "react";
import { formatMoney } from "@/lib/format";
import type { EventKindTag, EventOption } from "@/lib/events/types";

const KIND_ICON: Record<EventKindTag, ComponentType<{ size?: number }>> = {
  comedy: Laugh,
  music: Music,
  arts: Palette,
  sports: Trophy,
  nightlife: Disc3,
  film: Film,
  other: Sparkles
};

const KIND_LABEL: Record<EventKindTag, string> = {
  comedy: "Comedy",
  music: "Live music",
  arts: "Arts & culture",
  sports: "Sport",
  nightlife: "Nightlife",
  film: "Film",
  other: "Event"
};

function whenLabel(startsAt: string | undefined): string | null {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Tonight · ${time}`;
  return `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

export function EventCard({
  event,
  busy,
  referred,
  onGetTickets
}: {
  event: EventOption;
  busy: boolean;
  referred: boolean;
  onGetTickets: (event: EventOption) => void;
}) {
  const Icon = KIND_ICON[event.kind];
  const when = whenLabel(event.startsAt);

  return (
    <article className="event-card">
      <div className={`event-thumb kind-${event.kind}`}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" draggable={false} />
        ) : (
          <Icon size={30} />
        )}
        <span className="event-badge">Exclusive for guests</span>
      </div>

      <div className="event-body">
        <span className="event-kind">
          <Icon size={13} /> {KIND_LABEL[event.kind]}
        </span>
        <h3>{event.title}</h3>
        <p className="event-venue">
          <MapPin size={13} />
          {event.venueName}
          {event.distanceMi != null ? ` · ${event.distanceMi} mi` : ""}
        </p>
        {when && (
          <p className="event-when">
            <Clock size={13} /> {when}
          </p>
        )}

        <div className="event-foot">
          <span className="event-price">
            {event.priceFrom != null ? `from ${formatMoney(event.priceFrom, event.currency)}` : "Free entry"}
          </span>
          <button
            className={`primary-button event-book ${referred ? "referred" : ""}`}
            onClick={() => onGetTickets(event)}
            disabled={busy}
          >
            {referred ? <Check size={16} /> : busy ? <Ticket size={16} /> : <ArrowUpRight size={16} />}
            {referred ? "Opened" : busy ? "Opening…" : "Get tickets"}
          </button>
        </div>
      </div>
    </article>
  );
}
