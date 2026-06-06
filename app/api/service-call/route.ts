import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { addServiceCall, getServiceCall, listServiceCalls, updateServiceCallStatus } from "@/lib/service/store";
import { sendWhatsApp } from "@/lib/notify/whatsapp";
import type { ServiceCall, ServiceCallStatus } from "@/lib/service/types";

const VALID_STATUS: ServiceCallStatus[] = ["open", "acknowledged", "resolved"];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `call_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export async function POST(request: Request) {
  let body: { slug?: string; tableLabel?: string; dinerId?: string; reason?: string };
  try {
    body = (await request.json()) as { slug?: string; tableLabel?: string; dinerId?: string; reason?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.slug || !body.dinerId) {
    return NextResponse.json({ ok: false, error: "Missing slug or dinerId" }, { status: 400 });
  }

  const restaurant = getRestaurantBySlug(body.slug);
  if (!restaurant) return NextResponse.json({ ok: false, error: "Unknown restaurant" }, { status: 404 });

  const reason = (body.reason ?? "").slice(0, 120);
  const tableLabel = body.tableLabel || restaurant.tableLabel;

  const message = `🔔 ${tableLabel} would like a waiter${reason ? ` — ${reason}` : ""}.`;
  const notify = await sendWhatsApp(message);

  const call: ServiceCall = {
    id: newId(),
    slug: body.slug,
    tableLabel,
    dinerId: body.dinerId,
    reason,
    status: "open",
    channel: notify.channel,
    channelDetail: notify.detail,
    createdAt: Date.now()
  };
  addServiceCall(call);

  return NextResponse.json({ ok: true, callId: call.id, channel: notify.channel, detail: notify.detail });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (id) return NextResponse.json({ call: getServiceCall(id) });
  const slug = params.get("slug") ?? undefined;
  return NextResponse.json({ calls: listServiceCalls(slug) });
}

export async function PATCH(request: Request) {
  let body: { id?: string; status?: ServiceCallStatus };
  try {
    body = (await request.json()) as { id?: string; status?: ServiceCallStatus };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id || !body.status || !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid id/status" }, { status: 400 });
  }
  const updated = updateServiceCallStatus(body.id, body.status);
  if (!updated) return NextResponse.json({ ok: false, error: "Call not found" }, { status: 404 });
  return NextResponse.json({ ok: true, call: updated });
}
