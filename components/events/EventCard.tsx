"use client";

import { ArrowUpRight, Check, Clock, Disc3, Film, Laugh, MapPin, Music, Palette, Sparkles, Ticket, Trophy } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n";
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

// Representative illustrative SVGs per kind, shown over the kind gradient when a
// provider gives no imageUrl (e.g. the mock demo events). currentColor inherits
// the thumb's translucent-white so they sit cleanly on the gradient.
const artProps = {
  viewBox: "0 0 96 96",
  className: "event-art",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true
};
const dot = { fill: "currentColor", stroke: "none" } as const;

const KIND_ART: Record<EventKindTag, ReactNode> = {
  comedy: (
    <svg {...artProps}>
      <rect x="38" y="16" width="20" height="36" rx="10" />
      <path d="M28 46a20 20 0 0 0 40 0" />
      <path d="M48 66v12" />
      <path d="M34 80h28" />
    </svg>
  ),
  music: (
    <svg {...artProps}>
      <path d="M40 64V30l30-7v34" />
      <circle cx="32" cy="64" r="8" {...dot} />
      <circle cx="62" cy="57" r="8" {...dot} />
    </svg>
  ),
  arts: (
    <svg {...artProps}>
      <path d="M48 18C29 18 16 31 16 48c0 13 10 18 19 18 6 0 7-4 7-7s2-6 7-6h7c12 0 21-7 21-20 0-9-12-15-29-15Z" />
      <circle cx="33" cy="40" r="3.5" {...dot} />
      <circle cx="48" cy="32" r="3.5" {...dot} />
      <circle cx="63" cy="40" r="3.5" {...dot} />
    </svg>
  ),
  sports: (
    <svg {...artProps}>
      <path d="M32 20h32v12c0 11-7 19-16 19s-16-8-16-19V20Z" />
      <path d="M32 24h-9a7 7 0 0 0 9 10" />
      <path d="M64 24h9a7 7 0 0 1-9 10" />
      <path d="M48 51v11" />
      <path d="M38 76h20l-3-8H41z" />
    </svg>
  ),
  nightlife: (
    <svg {...artProps}>
      <path d="M24 28h48L48 56Z" />
      <path d="M48 56v20" />
      <path d="M36 78h24" />
      <path d="M64 22l-8 9" />
      <circle cx="64" cy="22" r="3.5" {...dot} />
    </svg>
  ),
  film: (
    <svg {...artProps}>
      <circle cx="48" cy="48" r="28" />
      <circle cx="48" cy="48" r="6" {...dot} />
      <circle cx="48" cy="28" r="4" {...dot} />
      <circle cx="48" cy="68" r="4" {...dot} />
      <circle cx="28" cy="48" r="4" {...dot} />
      <circle cx="68" cy="48" r="4" {...dot} />
    </svg>
  ),
  other: (
    <svg {...artProps} fill="currentColor" stroke="none">
      <path d="M48 16l6 24 24 6-24 6-6 24-6-24-24-6 24-6z" />
      <path d="M75 24l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" />
    </svg>
  )
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
  const t = useT();
  const Icon = KIND_ICON[event.kind];
  const when = whenLabel(event.startsAt);

  return (
    <article className="event-card">
      {/* Always use the clean on-brand kind gradient + illustrative art — real
          provider photos were inconsistent/low-quality and looked off. */}
      <div className={`event-thumb kind-${event.kind}`}>
        {KIND_ART[event.kind]}
        <span className="event-badge">{t("Exclusive for guests")}</span>
      </div>

      <div className="event-body">
        <span className="event-kind">
          <Icon size={13} /> {t(KIND_LABEL[event.kind])}
        </span>
        <h3>{event.title}</h3>
        <p className="event-venue">
          <MapPin size={13} />
          {event.venueName}
          {event.distanceMi != null ? ` · ${event.distanceMi} mi` : ""}
        </p>
        {when && (
          <p className="event-when">
            <Clock size={13} /> {when.replace("Tonight", t("Tonight"))}
          </p>
        )}

        <div className="event-foot">
          <span className="event-price">
            {event.priceFrom != null ? `${t("from")} ${formatMoney(event.priceFrom, event.currency)}` : t("Free entry")}
          </span>
          <button
            className={`primary-button event-book ${referred ? "referred" : ""}`}
            onClick={() => onGetTickets(event)}
            disabled={busy}
          >
            {referred ? <Check size={16} /> : busy ? <Ticket size={16} /> : <ArrowUpRight size={16} />}
            {referred ? t("Opened") : busy ? t("Opening…") : t("Get tickets")}
          </button>
        </div>
      </div>
    </article>
  );
}
