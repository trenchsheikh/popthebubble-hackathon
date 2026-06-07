import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/restaurants";
import { addServiceCall, getServiceCall, listServiceCalls, updateServiceCallStatus } from "@/lib/service/store";
import { sendWhatsApp } from "@/lib/notify/whatsapp";
import type { ServiceCall, ServiceCallItem, ServiceCallKind, ServiceCallStatus } from "@/lib/service/types";

const VALID_STATUS: ServiceCallStatus[] = ["open", "acknowledged", "resolved"];

function sanitizeItems(input: unknown): ServiceCallItem[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(item.id ?? ""),
      name: String(item.name ?? "Item").slice(0, 80),
      qty: Math.max(1, Math.min(20, Math.floor(Number(item.qty) || 1))),
      price: Number(item.price) || 0,
      requests: Array.isArray(item.requests)
        ? item.requests.map((request) => String(request).slice(0, 80)).slice(0, 6)
        : undefined
    };
  });
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `call_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export async function POST(request: Request) {
  let body: {
    slug?: string;
    tableLabel?: string;
    dinerId?: string;
    reason?: string;
    kind?: ServiceCallKind;
    items?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.slug || !body.dinerId) {
    return NextResponse.json({ ok: false, error: "Missing slug or dinerId" }, { status: 400 });
  }

  const restaurant = await getRestaurantBySlug(body.slug);
  if (!restaurant) return NextResponse.json({ ok: false, error: "Unknown restaurant" }, { status: 404 });

  const reason = (body.reason ?? "").slice(0, 120);
  const tableLabel = body.tableLabel || restaurant.tableLabel;
  const kind: ServiceCallKind = body.kind === "order" ? "order" : "help";
  const items = kind === "order" ? sanitizeItems(body.items) : [];
  const basketTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const message =
    kind === "order"
      ? `📝 ${tableLabel} is ready to order:\n${items.map((item) => `• ${item.qty}× ${item.name}`).join("\n")}`
      : `🔔 ${tableLabel} would like a waiter${reason ? ` — ${reason}` : ""}.`;
  const notify = await sendWhatsApp(message);

  const call: ServiceCall = {
    id: newId(),
    slug: body.slug,
    tableLabel,
    dinerId: body.dinerId,
    reason,
    kind,
    items: kind === "order" ? items : undefined,
    basketTotal: kind === "order" ? basketTotal : undefined,
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
