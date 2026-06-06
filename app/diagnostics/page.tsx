import type { Metadata } from "next";
import { getDiagnostics } from "@/lib/analytics/store";
import type { CountedRow } from "@/lib/analytics/types";

export const metadata: Metadata = { title: "Diagnostics · Bubble", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DiagnosticsPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const token = process.env.DIAGNOSTICS_TOKEN;
  const { key } = await searchParams;

  if (token && key !== token) {
    return (
      <main className="app-shell diag-shell">
        <section className="diag-screen">
          <h1>Diagnostics</h1>
          <p className="diag-denied">Access denied. Append <code>?key=&lt;DIAGNOSTICS_TOKEN&gt;</code> to view.</p>
        </section>
      </main>
    );
  }

  const d = getDiagnostics();

  return (
    <main className="app-shell diag-shell">
      <section className="diag-screen">
        <header className="diag-header">
          <p className="eyebrow">Diagnostics</p>
          <h1>Who&apos;s using Bubble</h1>
          <p className="diag-sub">Live, in-process metrics · {new Date(d.generatedAt).toLocaleString()}</p>
          {!token && <p className="diag-warn">⚠ Unprotected — set <code>DIAGNOSTICS_TOKEN</code> to gate this page in production.</p>}
        </header>

        <div className="diag-stats">
          <Stat label="QR scans" value={d.totalScans} />
          <Stat label="Unique diners" value={d.uniqueDiners} />
          <Stat label="Returning" value={d.returningDiners} />
          <Stat label="New" value={d.newDiners} />
          <Stat label="Total events" value={d.totalEvents} />
        </div>

        <div className="diag-grid">
          <BarList title="Scans by restaurant" rows={d.scansByRestaurant} />
          <BarList title="Scans by table" rows={d.scansByTable} />
          <BarList title="Where from (country)" rows={d.scansByCountry} />
          <BarList title="Device" rows={d.scansByDevice} />
          <BarList title="Top sources" rows={d.topReferrers} />
          <BarList title="Use cases (events)" rows={d.eventsByType} />
          <BarList title="Scans by day" rows={d.scansByDay} sortByKey />
        </div>

        <section className="diag-recent">
          <h2>Recent activity</h2>
          {d.recent.length === 0 ? (
            <p className="diag-sub">No events yet. Open a menu (e.g. <code>/r/hinoki</code>) to generate some.</p>
          ) : (
            <div className="diag-table">
              {d.recent.map((event) => (
                <div className="diag-row" key={event.id}>
                  <span className="diag-time">{new Date(event.at).toLocaleTimeString()}</span>
                  <span className="diag-type">{event.type}</span>
                  <span className="diag-meta">
                    {[event.restaurantId, event.table, event.country, event.device, event.returning ? "returning" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="diag-stat">
      <strong>{value.toLocaleString()}</strong>
      <span>{label}</span>
    </div>
  );
}

function BarList({ title, rows, sortByKey }: { title: string; rows: CountedRow[]; sortByKey?: boolean }) {
  const data = sortByKey ? rows : rows.slice(0, 8);
  const max = data.reduce((peak, row) => Math.max(peak, row.count), 0) || 1;
  return (
    <div className="diag-card">
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className="diag-sub">—</p>
      ) : (
        <ul className="diag-bars">
          {data.map((row) => (
            <li key={row.key}>
              <span className="diag-bar-track">
                <span className="diag-bar-fill" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
              </span>
              <span className="diag-bar-label">{row.key}</span>
              <span className="diag-bar-count">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
