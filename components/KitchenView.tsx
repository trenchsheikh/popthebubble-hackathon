"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BellRing, RefreshCw, Send } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import type { ServiceCall } from "@/lib/service/types";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function timeAgo(ts: number) {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  new: "preparing",
  seen: "preparing",
  preparing: "done",
  done: null
};

export function KitchenView({ slug, restaurantName }: { slug: string; restaurantName: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [ordersRes, callsRes] = await Promise.all([
        fetch(`/api/orders?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }),
        fetch(`/api/service-call?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      ]);
      const ordersData = (await ordersRes.json()) as { orders: Order[] };
      const callsData = (await callsRes.json()) as { calls: ServiceCall[] };
      setOrders(ordersData.orders);
      setCalls(callsData.calls);
      setError(null);
    } catch {
      setError("Lost connection to the order feed.");
    }
  }, [slug]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, status: next })
    });
    load();
  }

  async function setCallStatus(call: ServiceCall, status: ServiceCall["status"]) {
    await fetch("/api/service-call", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: call.id, status })
    });
    load();
  }

  async function sendKitchenMessage(order: Order) {
    const text = (drafts[order.id] ?? "").trim();
    if (!text) return;
    setDrafts((current) => ({ ...current, [order.id]: "" }));
    await fetch("/api/orders/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, from: "kitchen", text })
    });
    load();
  }

  const openCalls = calls.filter((call) => call.status !== "resolved");

  return (
    <main className="kitchen">
      <header className="kitchen-head">
        <div>
          <p className="eyebrow">Kitchen feed</p>
          <h1>{restaurantName}</h1>
        </div>
        <button className="ghost-button" onClick={load}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {error && <p className="kitchen-error">{error}</p>}

      {openCalls.length > 0 && (
        <div className="kitchen-calls">
          {openCalls.map((call) => (
            <div key={call.id} className={`kitchen-call status-${call.status}`}>
              <BellRing size={16} />
              <div className="kitchen-call-copy">
                <strong>{call.tableLabel} wants a waiter</strong>
                <span>{call.reason || "General assistance"} · {timeAgo(call.createdAt)}</span>
              </div>
              {call.status === "open" ? (
                <button className="primary-button" onClick={() => setCallStatus(call, "acknowledged")}>On my way</button>
              ) : (
                <button className="ghost-button" onClick={() => setCallStatus(call, "resolved")}>Resolve</button>
              )}
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 && <p className="kitchen-empty">No orders yet. New orders appear here automatically.</p>}

      <div className="kitchen-grid">
        {orders.map((order) => {
          const next = NEXT_STATUS[order.status];
          return (
            <article key={order.id} className={`kitchen-card status-${order.status}`}>
              <div className="kitchen-card-top">
                <strong>{order.tableLabel}</strong>
                <span>{timeAgo(order.createdAt)}</span>
              </div>

              <ul className="kitchen-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <div className="kitchen-item-line">
                      <span>{item.qty}× {item.name}</span>
                      <span>{formatPrice(item.price * item.qty)}</span>
                    </div>
                    {(item.requests ?? []).map((request) => (
                      <span key={request} className="kitchen-item-request">↳ {request}</span>
                    ))}
                  </li>
                ))}
              </ul>

              {(order.dinerCard.allergies.length > 0 || order.dinerCard.diet !== "none") && (
                <div className="kitchen-allergy">
                  <AlertTriangle size={15} />
                  <div>
                    {order.dinerCard.allergies.length > 0 && (
                      <strong>Allergies: {order.dinerCard.allergies.join(", ")}</strong>
                    )}
                    {order.dinerCard.diet !== "none" && <span>Diet: {order.dinerCard.diet}</span>}
                    {order.dinerCard.conflicts.map((conflict) => (
                      <span key={conflict.itemId}>{conflict.itemName}: {conflict.flags.join(", ")}</span>
                    ))}
                  </div>
                </div>
              )}

              {order.dinerCard.softPrefs && (
                <p className="kitchen-prefs">
                  Spice {order.dinerCard.softPrefs.spice}/3 · {order.dinerCard.softPrefs.appetite}
                  {order.dinerCard.softPrefs.likes.length > 0 ? ` · likes ${order.dinerCard.softPrefs.likes.join(", ")}` : ""}
                </p>
              )}

              {order.note && <p className="kitchen-note">“{order.note}”</p>}

              {(order.messages ?? []).length > 0 && (
                <div className="kitchen-thread">
                  {(order.messages ?? []).map((message) => (
                    <div key={message.id} className={`kitchen-msg ${message.from}`}>
                      <span>{message.from === "kitchen" ? "You" : "Table"}</span>
                      <p>{message.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form
                className="kitchen-reply"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendKitchenMessage(order);
                }}
              >
                <input
                  value={drafts[order.id] ?? ""}
                  onChange={(event) => setDrafts((current) => ({ ...current, [order.id]: event.target.value }))}
                  placeholder="Message the table…"
                />
                <button type="submit" aria-label="Send to table" disabled={!(drafts[order.id] ?? "").trim()}>
                  <Send size={15} />
                </button>
              </form>

              <div className="kitchen-card-foot">
                <span className="kitchen-total">{formatPrice(order.total)}</span>
                <span className="kitchen-channel">{order.channel === "whatsapp" ? "WhatsApp ✓" : "on screen"}</span>
                {next && (
                  <button className="primary-button" onClick={() => advance(order)}>
                    Mark {next}
                  </button>
                )}
                {!next && <span className="kitchen-done">Done</span>}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
