import { NextResponse } from "next/server";
import { requireRestaurantOwner } from "@/lib/auth";
import { logOnboardingEvent, startOnboardingRun } from "@/lib/telemetry/onboarding";

// Records onboarding-flow telemetry from the studio client. `action: "start"`
// opens a run and returns its id; subsequent calls log a step against it.
export async function POST(request: Request) {
  let ownerId: string;
  try {
    const user = await requireRestaurantOwner();
    ownerId = user.id;
  } catch {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: { action?: string; runId?: string; step?: string; detail?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "start") {
    const runId = await startOnboardingRun(ownerId);
    return NextResponse.json({ ok: true, runId });
  }

  if (body.runId && body.step) {
    await logOnboardingEvent(body.runId, ownerId, body.step, body.detail ?? null);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Missing action or step" }, { status: 400 });
}
