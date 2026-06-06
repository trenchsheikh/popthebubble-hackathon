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

// Representative cached stock images per kind (in /public/events). Used when a
// provider doesn't supply its own imageUrl (e.g. the mock demo events), so cards
// look enticing. Two per kind for a little variety; picked deterministically.
const KIND_IMAGES: Record<EventKindTag, string[]> = {
  comedy: ["/events/comedy-1.jpg", "/events/comedy-2.jpg"],
  music: ["/events/music-1.jpg", "/events/music-2.jpg"],
  arts: ["/events/arts-1.jpg", "/events/arts-2.jpg"],
  sports: ["/events/sports-1.jpg", "/events/sports-2.jpg"],
  nightlife: ["/events/nightlife-1.jpg", "/events/nightlife-2.jpg"],
  film: ["/events/film-1.jpg", "/events/film-2.jpg"],
  other: ["/events/other-1.jpg", "/events/other-2.jpg"]
};

function fallbackImage(event: EventOption): string {
  const pool = KIND_IMAGES[event.kind] ?? KIND_IMAGES.other;
  let sum = 0;
  for (const ch of event.id) sum += ch.charCodeAt(0);
  return pool[sum % pool.length];
}

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
  const imageSrc = event.imageUrl ?? fallbackImage(event);

  return (
    <article className="event-card">
      <div className={`event-thumb kind-${event.kind}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          onError={(e) => {
            // Reveal the kind gradient behind if an image ever fails to load.
            e.currentTarget.style.display = "none";
          }}
        />
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
