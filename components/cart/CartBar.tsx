"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getNudges } from "@/lib/nudges";
import type { DinerProfile } from "@/lib/types";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

type SubmitState = { status: "idle" | "sending" | "done" | "error"; detail?: string; channel?: string };

export function CartBar({ slug, tableLabel }: { slug: string; tableLabel: string }) {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [shareSoftPrefs, setShareSoftPrefs] = useState(false);
  const [note, setNote] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [profile, setProfile] = useState<DinerProfile | null>(null);

  function readProfile(): DinerProfile | null {
    try {
      const raw = window.localStorage.getItem(`taste-passport:${slug}:profile`);
      return raw ? (JSON.parse(raw) as DinerProfile) : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (open) setProfile(readProfile());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (cart.count === 0 && submit.status !== "done") return null;

  async function placeOrder() {
    const profile = readProfile();
    const dinerId = window.localStorage.getItem("taste-passport:diner-id") ?? "anonymous";
    if (!profile) {
      setSubmit({ status: "error", detail: "Set up your taste profile first so the kitchen gets your allergies." });
      return;
    }
    setSubmit({ status: "sending" });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          tableLabel,
          dinerId,
          profile,
          shareSoftPrefs,
          note: note.trim() || undefined,
          items: cart.lines.map((line) => ({ id: line.dish.id, qty: line.qty, requests: line.requests }))
        })
      });
      const data = (await response.json()) as { ok: boolean; orderId?: string; channel?: string; detail?: string; error?: string };
      if (!response.ok || !data.ok) {
        setSubmit({ status: "error", detail: data.error ?? "Could not send the order." });
        return;
      }
      if (data.orderId) {
        window.localStorage.setItem(`taste-passport:${slug}:active-order`, data.orderId);
        window.dispatchEvent(new Event("active-order-changed"));
      }
      setSubmit({ status: "done", channel: data.channel, detail: data.detail });
      cart.clear();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network error";
      setSubmit({ status: "error", detail: message });
    }
  }

  function closeSheet() {
    setOpen(false);
    if (submit.status === "done") setSubmit({ status: "idle" });
  }

  return (
    <>
      {cart.count > 0 && submit.status !== "done" && (
        <button className="cart-fab" onClick={() => setOpen(true)}>
          <ShoppingBag size={18} />
          <span className="cart-fab-count">{cart.count}</span>
          <span>Review order</span>
          <strong>{formatPrice(cart.total)}</strong>
        </button>
      )}

      {open && (
        <div className="overlay cart-overlay" role="dialog" aria-modal="true" aria-label="Your order">
          <div className="detail-sheet cart-sheet">
            <button className="icon-button close-button" onClick={closeSheet} aria-label="Close order">
              <X size={18} />
            </button>

            {submit.status === "done" ? (
              <div className="cart-done">
                <span className="cart-done-icon"><Check size={26} /></span>
                <h2>Sent to the kitchen</h2>
                <p>
                  {submit.channel === "whatsapp"
                    ? "Your order and allergy card were sent to the restaurant over WhatsApp."
                    : "Your order is on the kitchen screen. Connect WhatsApp to also text the restaurant."}
                </p>
                <button className="primary-button" onClick={closeSheet}>Done</button>
              </div>
            ) : (
              <>
                <h2 className="cart-title">Your order</h2>
                <p className="cart-sub">{tableLabel}</p>

                <div className="cart-lines">
                  {cart.lines.map((line) => {
                    const nudges = profile ? getNudges(line.dish, profile) : [];
                    return (
                      <div key={line.dish.id} className="cart-line">
                        <div className="cart-line-copy">
                          <strong>{line.dish.name}</strong>
                          <span>{formatPrice(line.dish.price)}</span>
                        </div>
                        <div className="cart-stepper">
                          <button onClick={() => cart.setQty(line.dish.id, line.qty - 1)} aria-label={`Reduce ${line.dish.name}`}>
                            <Minus size={14} />
                          </button>
                          <span>{line.qty}</span>
                          <button onClick={() => cart.setQty(line.dish.id, line.qty + 1)} aria-label={`Add ${line.dish.name}`}>
                            <Plus size={14} />
                          </button>
                        </div>

                        {nudges.map((nudge) => (
                          <div key={nudge.id} className={`cart-nudge ${nudge.tone}`}>
                            <Sparkles size={13} />
                            <span>{nudge.message}</span>
                            {nudge.action && (
                              <button
                                className={`cart-nudge-action ${line.requests.includes(nudge.action.request) ? "on" : ""}`}
                                onClick={() => cart.toggleRequest(line.dish.id, nudge.action!.request)}
                              >
                                {line.requests.includes(nudge.action.request) ? <Check size={12} /> : null}
                                {nudge.action.label}
                              </button>
                            )}
                          </div>
                        ))}

                        {line.requests.length > 0 && (
                          <span className="cart-line-note">For the kitchen: {line.requests.join(" · ")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="cart-consent">
                  <div className="cart-consent-head">
                    <ShieldCheck size={16} />
                    <span>Your allergies and diet always go to the kitchen with this order.</span>
                  </div>
                  <button
                    className={`toggle-row ${shareSoftPrefs ? "selected" : ""}`}
                    onClick={() => setShareSoftPrefs((value) => !value)}
                  >
                    <span>Also share taste preferences (spice, appetite, likes)</span>
                    <span>{shareSoftPrefs ? "On" : "Off"}</span>
                  </button>
                </div>

                <input
                  className="cart-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note for the kitchen (optional)"
                  maxLength={280}
                />

                {submit.status === "error" && <p className="cart-error">{submit.detail}</p>}

                <div className="cart-checkout">
                  <strong>{formatPrice(cart.total)}</strong>
                  <button className="primary-button" onClick={placeOrder} disabled={submit.status === "sending"}>
                    {submit.status === "sending" ? "Sending…" : "Place order"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
