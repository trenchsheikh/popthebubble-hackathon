import { formatMoney } from "@/lib/format";
import type { EventReferral } from "@/lib/events/types";

export function EventReferrals({
  referrals,
  totals
}: {
  referrals: EventReferral[];
  totals: { count: number; estimatedCommission: number; currency: string };
}) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <h2>Event referrals</h2>
        <span className="dash-count">{totals.count} sent</span>
      </div>

      <div className="dash-stats">
        <div className="dash-stat">
          <strong>{totals.count}</strong>
          <span>Guests sent to events</span>
        </div>
        <div className="dash-stat dash-stat-accent">
          <strong>{formatMoney(totals.estimatedCommission, totals.currency)}</strong>
          <span>Est. commission</span>
        </div>
      </div>

      {referrals.length === 0 ? (
        <p className="dash-empty">No referrals yet. Guests can book events after dinner from the menu.</p>
      ) : (
        <div className="dash-table">
          <div className="dash-row dash-row-head dash-row-bookings">
            <span>Event</span>
            <span>From</span>
            <span>Est. commission</span>
            <span>When</span>
          </div>
          {referrals.map((referral) => (
            <div className="dash-row dash-row-bookings" key={referral.id}>
              <span className="dash-cell-event">
                {referral.eventTitle}
                <small>{referral.provider}</small>
              </span>
              <span>{formatMoney(referral.estimatedPrice, referral.currency)}</span>
              <span>{formatMoney(referral.estimatedCommission, referral.currency)}</span>
              <span>{new Date(referral.referredAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
      <p className="dash-note">Commission is an estimate of your share — confirmed by the affiliate network when the guest completes a purchase.</p>
    </section>
  );
}
