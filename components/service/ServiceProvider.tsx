"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BellRing, Check, X } from "lucide-react";
import type { ServiceCall } from "@/lib/service/types";

type ServiceContextValue = {
  // Accepts an optional arg (ignored) so existing callers that passed a tab
  // name still compile — the dock no longer has tabs, it just opens.
  openDock: (tab?: string) => void;
};

const ServiceContext = createContext<ServiceContextValue | null>(null);

// Nullable on purpose: callers outside the provider (or rendered before it
// mounts) get null and simply skip the "talk to a human" affordance.
export function useServiceDock(): ServiceContextValue | null {
  return useContext(ServiceContext);
}

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

  const openDock = useCallback((_tab?: string) => setOpen(true), []);

  const value = useMemo<ServiceContextValue>(() => ({ openDock }), [openDock]);

  return (
    <ServiceContext.Provider value={value}>
      {children}

      {open && (
        <ServiceDock slug={slug} tableLabel={tableLabel} shortName={shortName} onClose={() => setOpen(false)} />
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
  onClose
}: {
  slug: string;
  tableLabel: string;
  shortName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [call, setCall] = useState<CallState>({ status: "idle" });

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

  const onCooldown = call.at ? Date.now() - call.at < CALL_COOLDOWN_MS : false;

  async function callWaiter() {
    setCall({ status: "sending" });
    try {
      const response = await fetch("/api/service-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, tableLabel, dinerId: readDinerId(), reason, kind: "help" })
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

  return (
    <div className="overlay service-overlay" role="dialog" aria-modal="true" aria-label="Service">
      <div className="detail-sheet service-sheet">
        <button className="icon-button close-button" onClick={onClose} aria-label="Close service panel">
          <X size={18} />
        </button>

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
      </div>
    </div>
  );
}
