import type { Metadata } from "next";
import { listActiveSessions } from "@/lib/sessions/store";
import { listServiceCalls } from "@/lib/service/store";
import { listReferrals } from "@/lib/events/store";
import { joyFor } from "@/lib/dashboard/joy";
import { LiveGuests, type LiveGuestVM } from "@/components/dashboard/LiveGuests";
import { PriorGuests, type PriorGuestVM } from "@/components/dashboard/PriorGuests";
import { EventReferrals } from "@/components/dashboard/EventReferrals";
import type { ServiceCall } from "@/lib/service/types";

export const metadata: Metadata = { title: "Dashboard · Bubble", robots: { index: false } };
export const dynamic = "force-dynamic";

const DEFAULT_SLUG = "hinoki";

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const id = key(item);
    map.set(id, [...(map.get(id) ?? []), item]);
  }
  return map;
}

function spendFrom(calls: ServiceCall[]): number {
  return calls.reduce((sum, call) => sum + (call.basketTotal ?? 0), 0);
}

function statusFrom(calls: ServiceCall[]): string {
  if (calls.some((call) => call.kind === "order")) return "Ordering with waiter";
  if (calls.some((call) => call.kind === "help" && call.status === "open")) return "Waiting on staff";
  return "Browsing the menu";
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ key?: string; slug?: string }>;
}) {
  const token = process.env.DASHBOARD_TOKEN;
  const { key, slug: slugParam } = await searchParams;
  const slug = slugParam ?? DEFAULT_SLUG;

  if (token && key !== token) {
    return (
      <main className="app-shell diag-shell">
        <section className="diag-screen">
          <h1>Dashboard</h1>
          <p className="diag-denied">
            Access denied. Append <code>?key=&lt;DASHBOARD_TOKEN&gt;</code> to view.
          </p>
        </section>
      </main>
    );
  }

  const sessions = listActiveSessions(slug);
  const calls = listServiceCalls(slug);
  const referrals = listReferrals(slug);

  const callsByDiner = groupBy(calls, (call) => call.dinerId);
  const orderCalls = calls.filter((call) => call.kind === "order");
  const orderCallsByDiner = groupBy(orderCalls, (call) => call.dinerId);
  const activeIds = new Set(sessions.map((session) => session.dinerId));

  const liveGuests: LiveGuestVM[] = sessions.map((session) => {
    const dinerCalls = callsByDiner.get(session.dinerId) ?? [];
    return {
      dinerId: session.dinerId,
      tableLabel: session.tableLabel,
      returning: session.returning,
      spend: spendFrom(dinerCalls.filter((call) => call.kind === "order")),
      statusLabel: statusFrom(dinerCalls),
      joy: joyFor({ serviceCalls: dinerCalls, returning: session.returning })
    };
  });

  const priorGuests: PriorGuestVM[] = [...orderCallsByDiner.entries()]
    .filter(([dinerId]) => !activeIds.has(dinerId))
    .map(([dinerId, dinerOrderCalls]) => ({
      dinerId,
      orders: dinerOrderCalls.length,
      lifetimeSpend: spendFrom(dinerOrderCalls),
      lastVisit: Math.max(...dinerOrderCalls.map((call) => call.createdAt)),
      returning: dinerOrderCalls.length > 1
    }))
    .sort((a, b) => b.lastVisit - a.lastVisit);

  const referralTotals = {
    count: referrals.length,
    estimatedCommission: referrals.reduce((sum, referral) => sum + referral.estimatedCommission, 0),
    currency: referrals[0]?.currency ?? "GBP"
  };

  return (
    <main className="app-shell dash-shell">
      <section className="dash-screen">
        <header className="dash-header">
          <p className="eyebrow">Dashboard</p>
          <h1>Tonight at {slug}</h1>
          <p className="dash-sub">Live, in-process view · {new Date().toLocaleString()}</p>
          {!token && (
            <p className="diag-warn">
              ⚠ Unprotected — set <code>DASHBOARD_TOKEN</code> to gate this page in production.
            </p>
          )}
        </header>

        <LiveGuests guests={liveGuests} />
        <EventReferrals referrals={referrals} totals={referralTotals} />
        <PriorGuests guests={priorGuests} />
      </section>
    </main>
  );
}
