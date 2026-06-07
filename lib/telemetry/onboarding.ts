import "server-only";
import { createServiceClient } from "@/lib/supabase-server";

/**
 * Durable onboarding telemetry → Supabase (onboarding_runs / onboarding_events).
 * This is the hard, queryable evidence that an onboarding happened and exactly
 * which steps were completed. All writes are best-effort: telemetry must never
 * break the onboarding flow, so every call swallows its errors.
 */

// The query layer's typed Database doesn't include these new tables yet, so we
// use an untyped client here (same `as any` pattern as lib/db/queries.ts).
function db(): any {
  return createServiceClient();
}

export async function startOnboardingRun(ownerId: string): Promise<string | null> {
  try {
    const { data, error } = await db()
      .from("onboarding_runs")
      .insert([{ owner_id: ownerId, status: "started", step_reached: "signed_in" }])
      .select("id")
      .single();
    if (error || !data) return null;
    await db()
      .from("onboarding_events")
      .insert([{ run_id: data.id, owner_id: ownerId, step: "signed_in", detail: null }]);
    return data.id as string;
  } catch {
    return null;
  }
}

export async function logOnboardingEvent(
  runId: string,
  ownerId: string,
  step: string,
  detail: Record<string, unknown> | null
): Promise<void> {
  try {
    await db().from("onboarding_events").insert([{ run_id: runId, owner_id: ownerId, step, detail }]);

    const patch: Record<string, unknown> = { step_reached: step, updated_at: new Date().toISOString() };
    if (step === "ocr_completed" && detail) {
      patch.status = "extracted";
      patch.dishes_extracted = Number(detail.dishCount ?? 0);
      patch.ocr_model = detail.model ?? null;
      patch.ocr_ms = detail.ms != null ? Number(detail.ms) : null;
      patch.languages = Array.isArray(detail.languages) ? detail.languages : null;
    }
    await db().from("onboarding_runs").update(patch).eq("id", runId);
  } catch {
    // best-effort
  }
}

export type OnboardingRunRow = {
  id: string;
  owner_id: string;
  restaurant_id: string | null;
  status: string;
  step_reached: string | null;
  dishes_extracted: number;
  images_uploaded: number;
  ocr_model: string | null;
  ocr_ms: number | null;
  languages: string[] | null;
  started_at: string;
  published_at: string | null;
};

export type OnboardingEventRow = {
  id: string;
  run_id: string;
  step: string;
  detail: Record<string, unknown> | null;
  at: string;
};

export async function listOnboardingRuns(limit = 20): Promise<OnboardingRunRow[]> {
  try {
    const { data } = await db()
      .from("onboarding_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as OnboardingRunRow[];
  } catch {
    return [];
  }
}

export async function listOnboardingEventsForRuns(runIds: string[]): Promise<OnboardingEventRow[]> {
  if (runIds.length === 0) return [];
  try {
    const { data } = await db()
      .from("onboarding_events")
      .select("id, run_id, step, detail, at")
      .in("run_id", runIds)
      .order("at", { ascending: true });
    return (data ?? []) as OnboardingEventRow[];
  } catch {
    return [];
  }
}

export async function completeOnboardingRun(
  runId: string,
  ownerId: string,
  detail: { restaurantId: string; slug: string; itemCount: number; imagesUploaded: number }
): Promise<void> {
  try {
    await db()
      .from("onboarding_events")
      .insert([{ run_id: runId, owner_id: ownerId, step: "published", detail }]);
    await db()
      .from("onboarding_runs")
      .update({
        status: "published",
        restaurant_id: detail.restaurantId,
        images_uploaded: detail.imagesUploaded,
        step_reached: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", runId);
  } catch {
    // best-effort
  }
}
