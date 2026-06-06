import { NextResponse } from "next/server";
import { appendOrderMessage } from "@/lib/orders/store";
import { sendWhatsApp } from "@/lib/notify/whatsapp";
import type { OrderMessage } from "@/lib/orders/types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `msg_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

export async function POST(request: Request) {
  let body: { orderId?: string; from?: "kitchen" | "diner"; text?: string };
  try {
    body = (await request.json()) as { orderId?: string; from?: "kitchen" | "diner"; text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!body.orderId || (body.from !== "kitchen" && body.from !== "diner") || !text) {
    return NextResponse.json({ ok: false, error: "Missing orderId, from, or text" }, { status: 400 });
  }

  const message: OrderMessage = { id: newId(), from: body.from, text: text.slice(0, 280), at: Date.now() };
  const order = appendOrderMessage(body.orderId, message);
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  // A diner reply pings the restaurant; the kitchen's own replies don't loop back.
  if (body.from === "diner") {
    await sendWhatsApp(`💬 ${order.tableLabel} replied: ${text}`);
  }

  return NextResponse.json({ ok: true, message });
}
