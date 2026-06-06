import { formatOrderMessage } from "@/lib/orders/format";
import type { Order } from "@/lib/orders/types";

export type NotifyResult = {
  channel: string;
  ok: boolean;
  detail: string;
};

// Low-level channel send. Delivers a plain-text message to the restaurant's
// WhatsApp via Twilio when configured; otherwise no-ops so callers still
// succeed and the request lands on the kitchen screen. Keys are server-side only.
export async function sendWhatsApp(body: string): Promise<NotifyResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  const to = process.env.RESTAURANT_WHATSAPP_TO; // e.g. "whatsapp:+447700900123"

  if (!accountSid || !authToken || !from || !to) {
    return {
      channel: "mock",
      ok: true,
      detail: "WhatsApp not configured — shown on the kitchen screen only."
    };
  }

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ From: from, To: to, Body: body })
    });

    if (!response.ok) {
      const text = await response.text();
      return { channel: "whatsapp", ok: false, detail: `Twilio error ${response.status}: ${text.slice(0, 200)}` };
    }

    return { channel: "whatsapp", ok: true, detail: "Sent to restaurant WhatsApp." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { channel: "whatsapp", ok: false, detail: `WhatsApp send failed: ${message}` };
  }
}

// Channel-agnostic restaurant notification for a placed order.
export async function notifyRestaurant(order: Order): Promise<NotifyResult> {
  return sendWhatsApp(formatOrderMessage(order));
}
