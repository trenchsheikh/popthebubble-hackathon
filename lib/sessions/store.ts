// Lightweight live-presence store so the restaurant dashboard can show who's
// currently dining. Written on /api/session POST, read by /dashboard. Same
// globalThis pattern as the orders store; resets on full server restart.

export type LiveSession = {
  dinerId: string;
  slug: string;
  tableLabel: string;
  returning: boolean;
  startedAt: number; // epoch ms, first seen this visit
  lastSeen: number; // epoch ms, most recent activity
};

const ACTIVE_WINDOW_MS = 90 * 60 * 1000; // a diner is "here" if seen in last 90 min

const globalStore = globalThis as unknown as { __hinokiSessions?: Map<string, LiveSession> };
if (!globalStore.__hinokiSessions) globalStore.__hinokiSessions = new Map();

function sessions(): Map<string, LiveSession> {
  return globalStore.__hinokiSessions!;
}

function key(slug: string, dinerId: string): string {
  return `${slug}:${dinerId}`;
}

export function upsertSession(input: {
  dinerId: string;
  slug: string;
  tableLabel: string;
  returning: boolean;
}): LiveSession {
  const now = Date.now();
  const existing = sessions().get(key(input.slug, input.dinerId));
  const session: LiveSession = existing
    ? { ...existing, tableLabel: input.tableLabel, returning: input.returning, lastSeen: now }
    : { ...input, startedAt: now, lastSeen: now };
  sessions().set(key(input.slug, input.dinerId), session);
  return session;
}

export function listActiveSessions(slug?: string): LiveSession[] {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  return [...sessions().values()]
    .filter((session) => session.lastSeen >= cutoff)
    .filter((session) => (slug ? session.slug === slug : true))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}
