import { formatPrice } from "@/lib/format";

export type PriorGuestVM = {
  dinerId: string;
  orders: number;
  lifetimeSpend: number;
  lastVisit: number;
  returning: boolean;
};

export function PriorGuests({ guests }: { guests: PriorGuestVM[] }) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <h2>Prior guests</h2>
        <span className="dash-count">{guests.length} on record</span>
      </div>

      {guests.length === 0 ? (
        <p className="dash-empty">No past guests yet.</p>
      ) : (
        <div className="dash-table">
          <div className="dash-row dash-row-head">
            <span>Guest</span>
            <span>Orders</span>
            <span>Lifetime</span>
            <span>Last seen</span>
          </div>
          {guests.map((guest) => (
            <div className="dash-row" key={guest.dinerId}>
              <span className="dash-cell-id">
                {guest.dinerId.replace(/^diner_/, "#")}
                {guest.returning && <span className="dash-tag">Returning</span>}
              </span>
              <span>{guest.orders}</span>
              <span>{formatPrice(guest.lifetimeSpend)}</span>
              <span>{new Date(guest.lastVisit).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
