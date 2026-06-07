import "server-only";
import { createServiceClient } from "@/lib/supabase-server";

// Durable diner-side usage events → Supabase (app_usage_events). Mirrors the
// in-memory analytics store so usage survives restarts and is queryable. Best-
// effort: never throws (analytics must not break the request).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function db(): any {
  return createServiceClient();
}

export type UsageSummary = { total: number; byType: { key: string; count: number }[] };

export async function getUsageSummary(limit = 2000): Promise<UsageSummary> {
  try {
    const { data } = await db()
      .from("app_usage_events")
      .select("type")
      .order("at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as { type: string }[];
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
    return {
      total: rows.length,
      byType: [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
    };
  } catch {
    return { total: 0, byType: [] };
  }
}

export async function recordUsageEvent(input: {
  type: string;
  restaurantId?: string;
  dinerId?: string;
  metadata?: Record<string, unknown>;
  country?: string;
  city?: string;
  device?: string;
}): Promise<void> {
  try {
    // restaurant_id is a uuid FK; the seed ("hinoki") isn't a uuid, so keep the
    // raw ref in metadata and leave the column null for non-uuid ids.
    const restaurantId = input.restaurantId && UUID_RE.test(input.restaurantId) ? input.restaurantId : null;
    const metadata = {
      ...(input.metadata ?? {}),
      ...(restaurantId ? {} : input.restaurantId ? { restaurantRef: input.restaurantId } : {})
    };
    await db()
      .from("app_usage_events")
      .insert([
        {
          restaurant_id: restaurantId,
          diner_id: input.dinerId ?? null,
          type: input.type,
          metadata,
          country: input.country ?? null,
          city: input.city ?? null,
          device: input.device ?? null
        }
      ]);
  } catch {
    // best-effort
  }
}
