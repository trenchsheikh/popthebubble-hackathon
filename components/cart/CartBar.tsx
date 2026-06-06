"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getNudges } from "@/lib/nudges";
import { useT, useLocale, dishName } from "@/lib/i18n";
import type { DinerProfile } from "@/lib/types";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

type SubmitState = { status: "idle" | "sending" | "done" | "error"; detail?: string };

export function CartBar({ slug, tableLabel }: { slug: string; tableLabel: string }) {
  const cart = useCart();
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
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

  // The kitchen no longer takes orders through the app — the diner builds a
  // basket, then calls the waiter over to place it. We send the basket along on
  // a "ready to order" service call so the waiter knows what the table wants.
  async function callWaiterToOrder() {
    const dinerId = window.localStorage.getItem("taste-passport:diner-id") ?? "anonymous";
    setSubmit({ status: "sending" });
    try {
      const response = await fetch("/api/service-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          tableLabel,
          dinerId,
          kind: "order",
          reason: note.trim() ? `Ready to order — ${note.trim()}` : "Ready to order",
          items: cart.lines.map((line) => ({
            id: line.dish.id,
            name: line.dish.name,
            qty: line.qty,
            price: line.dish.price,
            requests: line.requests
          }))
        })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setSubmit({ status: "error", detail: data.error ?? "Could not reach the team." });
        return;
      }
      setSubmit({ status: "done" });
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
          <span>{t("Review basket")}</span>
          <strong>{formatPrice(cart.total)}</strong>
        </button>
      )}

      {open && (
        <div className="overlay cart-overlay" role="dialog" aria-modal="true" aria-label="Your basket">
          <div className="detail-sheet cart-sheet">
            <button className="icon-button close-button" onClick={closeSheet} aria-label="Close basket">
              <X size={18} />
            </button>

            {submit.status === "done" ? (
              <div className="cart-done">
                <span className="cart-done-icon"><Check size={26} /></span>
                <h2>{t("Your waiter is on the way")}</h2>
                <p>
                  {locale === "ja"
                    ? "ご注文の準備ができたことをスタッフにお伝えしました。テーブルでお伺いします。"
                    : `We've let the ${tableLabel} team know you're ready to order. They'll take it at your table.`}
                </p>
                <button className="primary-button" onClick={closeSheet}>{t("Done")}</button>
              </div>
            ) : (
              <>
                <h2 className="cart-title">{t("Your basket")}</h2>
                <p className="cart-sub">{tableLabel.replace("Table", t("Table"))}</p>

                <div className="cart-lines">
                  {cart.lines.map((line) => {
                    const nudges = profile ? getNudges(line.dish, profile) : [];
                    return (
                      <div key={line.dish.id} className="cart-line">
                        <div className="cart-line-copy">
                          <strong>{dishName(line.dish, locale)}</strong>
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
                            <span>{t(nudge.message)}</span>
                            {nudge.action && (
                              <button
                                className={`cart-nudge-action ${line.requests.includes(nudge.action.request) ? "on" : ""}`}
                                onClick={() => cart.toggleRequest(line.dish.id, nudge.action!.request)}
                              >
                                {line.requests.includes(nudge.action.request) ? <Check size={12} /> : null}
                                {t(nudge.action.label)}
                              </button>
                            )}
                          </div>
                        ))}

                        {line.requests.length > 0 && (
                          <span className="cart-line-note">{t("For the waiter:")} {line.requests.map((r) => t(r)).join(" · ")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <input
                  className="cart-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("Anything to tell your waiter? (optional)")}
                  maxLength={280}
                />

                {submit.status === "error" && <p className="cart-error">{submit.detail}</p>}

                <div className="cart-checkout">
                  <strong>{formatPrice(cart.total)}</strong>
                  <button className="primary-button" onClick={callWaiterToOrder} disabled={submit.status === "sending"}>
                    <BellRing size={18} />
                    {submit.status === "sending" ? t("Calling…") : t("Call waiter to order")}
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
