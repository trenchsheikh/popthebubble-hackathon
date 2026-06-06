import { formatPrice } from "@/lib/format";
import type { JoySignal } from "@/lib/dashboard/joy";

export type LiveGuestVM = {
  dinerId: string;
  tableLabel: string;
  returning: boolean;
  spend: number;
  statusLabel: string;
  joy: JoySignal;
};

const JOY_LABEL: Record<JoySignal["level"], string> = { low: "Needs love", ok: "Happy", great: "Delighted" };

export function LiveGuests({ guests }: { guests: LiveGuestVM[] }) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <h2>Live guests</h2>
        <span className="dash-count">{guests.length} seated</span>
      </div>

      {guests.length === 0 ? (
        <p className="dash-empty">No one&apos;s scanned a menu in the last 90 minutes.</p>
      ) : (
        <div className="dash-guest-grid">
          {guests.map((guest) => (
            <article key={guest.dinerId} className="dash-guest">
              <div className="dash-guest-top">
                <strong>{guest.tableLabel}</strong>
                {guest.returning && <span className="dash-tag">Returning</span>}
              </div>
              <div className="dash-guest-spend">{formatPrice(guest.spend)}</div>
              <div className="dash-guest-meta">
                <span>{guest.statusLabel}</span>
                <span className={`dash-joy joy-${guest.joy.level}`}>{JOY_LABEL[guest.joy.level]}</span>
              </div>
              {guest.joy.reasons.length > 0 && <p className="dash-guest-why">{guest.joy.reasons.join(" · ")}</p>}
            </article>
          ))}
        </div>
      )}
      <p className="dash-note">Joy is a heuristic from activity (placing an order, returning status, open help requests) — not a measured rating.</p>
    </section>
  );
}
