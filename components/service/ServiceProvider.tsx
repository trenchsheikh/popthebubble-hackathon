"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BellRing, Check, ConciergeBell, ReceiptText, Send, X } from "lucide-react";
import type { Order } from "@/lib/orders/types";
import type { ServiceCall } from "@/lib/service/types";

type DockTab = "waiter" | "order";

type ServiceContextValue = {
  openDock: (tab?: DockTab) => void;
  hasActiveOrder: boolean;
};

const ServiceContext = createContext<ServiceContextValue | null>(null);

// Nullable on purpose: callers outside the provider (or rendered before it
// mounts) get null and simply skip the "talk to a human" affordance.
export function useServiceDock(): ServiceContextValue | null {
  return useContext(ServiceContext);
}

const activeOrderKey = (slug: string) => `taste-passport:${slug}:active-order`;
const QUICK_REASONS = ["Ready to order", "Bill, please", "Allergy question", "Just need help"];
const CALL_COOLDOWN_MS = 45000;

export function ServiceProvider({
  slug,
  tableLabel,
  shortName,
  children
}: {
  slug: string;
  tableLabel: string;
  shortName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DockTab>("waiter");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setActiveOrderId(window.localStorage.getItem(activeOrderKey(slug)));
    read();
    window.addEventListener("storage", read);
    window.addEventListener("active-order-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("active-order-changed", read);
    };
  }, [slug]);

  const openDock = useCallback(
    (which?: DockTab) => {
      setTab(which ?? (activeOrderId ? "order" : "waiter"));
      setOpen(true);
    },
    [activeOrderId]
  );

  const value = useMemo<ServiceContextValue>(
    () => ({ openDock, hasActiveOrder: Boolean(activeOrderId) }),
    [openDock, activeOrderId]
  );

  return (
    <ServiceContext.Provider value={value}>
      {children}

      {!open && (
        <button className="service-fab" onClick={() => openDock()} aria-label="Service and order help">
          <ConciergeBell size={18} />
          <span>Service</span>
          {activeOrderId && <span className="service-fab-dot" aria-hidden />}
        </button>
      )}

      {open && (
        <ServiceDock
          slug={slug}
          tableLabel={tableLabel}
          shortName={shortName}
          tab={tab}
          setTab={setTab}
          activeOrderId={activeOrderId}
          onClose={() => setOpen(false)}
        />
      )}
    </ServiceContext.Provider>
  );
}

function readDinerId(): string {
  return window.localStorage.getItem("taste-passport:diner-id") ?? "anonymous";
}

type CallState = {
  status: "idle" | "sending" | "sent" | "error";
  callId?: string;
  detail?: string;
  liveStatus?: ServiceCall["status"];
  at?: number;
};

function ServiceDock({
  slug,
  tableLabel,
  shortName,
  tab,
  setTab,
  activeOrderId,
  onClose
}: {
  slug: string;
  tableLabel: string;
  shortName: string;
  tab: DockTab;
  setTab: (tab: DockTab) => void;
  activeOrderId: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [call, setCall] = useState<CallState>({ status: "idle" });
  const [order, setOrder] = useState<Order | null>(null);
  const [reply, setReply] = useState("");

  // Poll the live waiter-call status until it is resolved.
  useEffect(() => {
    if (!call.callId || call.liveStatus === "resolved") return;
    const id = call.callId;
    const tick = async () => {
      try {
        const response = await fetch(`/api/service-call?id=${id}`, { cache: "no-store" });
        const data = (await response.json()) as { call: ServiceCall | null };
        if (data.call) setCall((current) => ({ ...current, liveStatus: data.call!.status }));
      } catch {
        /* transient — keep last known status */
      }
    };
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [call.callId, call.liveStatus]);

  // Poll the active order (status + thread).
  useEffect(() => {
    if (!activeOrderId) return;
    const load = async () => {
      try {
        const response = await fetch(`/api/orders?id=${activeOrderId}`, { cache: "no-store" });
        const data = (await response.json()) as { order: Order | null };
        setOrder(data.order);
      } catch {
        /* keep last */
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [activeOrderId]);

  const onCooldown = call.at ? Date.now() - call.at < CALL_COOLDOWN_MS : false;

  async function callWaiter() {
    setCall({ status: "sending" });
    try {
      const response = await fetch("/api/service-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, tableLabel, dinerId: readDinerId(), reason })
      });
      const data = (await response.json()) as { ok: boolean; callId?: string; detail?: string; error?: string };
      if (!response.ok || !data.ok) {
        setCall({ status: "error", detail: data.error ?? "Could not reach the team." });
        return;
      }
      setCall({ status: "sent", callId: data.callId, detail: data.detail, liveStatus: "open", at: Date.now() });
    } catch (error: unknown) {
      setCall({ status: "error", detail: error instanceof Error ? error.message : "Network error" });
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !order) return;
    setReply("");
    try {
      await fetch("/api/orders/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, from: "diner", text })
      });
    } catch {
      /* the poll will reconcile */
    }
  }

  return (
    <div className="overlay service-overlay" role="dialog" aria-modal="true" aria-label="Service">
      <div className="detail-sheet service-sheet">
        <button className="icon-button close-button" onClick={onClose} aria-label="Close service panel">
          <X size={18} />
        </button>

        <div className="service-tabs">
          <button className={tab === "waiter" ? "active" : ""} onClick={() => setTab("waiter")}>
            <BellRing size={15} /> Call a waiter
          </button>
          <button className={tab === "order" ? "active" : ""} onClick={() => setTab("order")} disabled={!activeOrderId}>
            <ReceiptText size={15} /> Your order
          </button>
        </div>

        {tab === "waiter" && (
          <div className="service-waiter">
            {call.status === "sent" ? (
              <div className="service-sent">
                <span className="service-sent-icon"><Check size={24} /></span>
                <h3>A waiter has been notified</h3>
                <p>
                  {call.liveStatus === "acknowledged" || call.liveStatus === "resolved"
                    ? "Someone is on their way to your table."
                    : `The ${shortName} team has your request for ${tableLabel}.`}
                </p>
                <button className="ghost-button" onClick={() => setCall({ status: "idle" })} disabled={onCooldown}>
                  {onCooldown ? "Waiter on the way…" : "Call again"}
                </button>
              </div>
            ) : (
              <>
                <h3>Need a hand at {tableLabel}?</h3>
                <p className="service-sub">Tap a reason (optional), then call a waiter over.</p>
                <div className="service-reasons">
                  {QUICK_REASONS.map((option) => (
                    <button
                      key={option}
                      className={`chip ${reason === option ? "selected" : ""}`}
                      onClick={() => setReason((current) => (current === option ? "" : option))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {call.status === "error" && <p className="cart-error">{call.detail}</p>}
                <button className="primary-button" onClick={callWaiter} disabled={call.status === "sending"}>
                  <BellRing size={18} />
                  {call.status === "sending" ? "Calling…" : "Call a waiter"}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "order" && (
          <div className="service-order">
            {!order ? (
              <p className="service-sub">Loading your order…</p>
            ) : (
              <>
                <div className="service-order-status">
                  <span>{tableLabel}</span>
                  <strong className={`order-status-badge status-${order.status}`}>
                    {order.status === "new" ? "Sent to kitchen" : order.status === "preparing" ? "Being prepared" : order.status === "done" ? "Ready" : order.status}
                  </strong>
                </div>
                <ul className="service-order-items">
                  {order.items.map((item) => (
                    <li key={item.id}>{item.qty}× {item.name}</li>
                  ))}
                </ul>

                <div className="service-thread">
                  {(order.messages ?? []).length === 0 ? (
                    <p className="service-sub">Messages with the kitchen will appear here.</p>
                  ) : (
                    (order.messages ?? []).map((message) => (
                      <div key={message.id} className={`service-msg ${message.from}`}>
                        <span>{message.from === "kitchen" ? "Kitchen" : "You"}</span>
                        <p>{message.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form
                  className="service-reply"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendReply();
                  }}
                >
                  <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Message the kitchen…" />
                  <button type="submit" aria-label="Send message" disabled={!reply.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
