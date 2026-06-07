"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronUp, MessageCircle, Minus, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { Dish3D } from "@/components/Dish3D";
import { useCart } from "@/components/cart/CartProvider";
import { conflicts } from "@/lib/conflicts";
import { getNudges } from "@/lib/nudges";
import { useMoney } from "@/lib/currency";
import { useT, useLocale, categoryLabel, dishName, dishExplainer } from "@/lib/i18n";
import type { DinerProfile, MenuItem } from "@/lib/types";

export function DishReels({
  dishes,
  startId,
  profile,
  onClose,
  onAsk
}: {
  dishes: MenuItem[];
  startId: string;
  profile: DinerProfile;
  onClose: () => void;
  onAsk: (dish: MenuItem) => void;
}) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startIndex = Math.max(0, dishes.findIndex((dish) => dish.id === startId));
  const [activeIndex, setActiveIndex] = useState(startIndex);

  // Jump to the tapped dish on open (no smooth scroll so it lands instantly).
  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = startIndex * container.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeIndex) setActiveIndex(index);
  }

  return (
    <div className="reels-overlay" role="dialog" aria-modal="true" aria-label="Browse dishes">
      <button className="reels-close icon-button" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>

      <div className="reels-scroll" ref={scrollRef} onScroll={onScroll}>
        {dishes.map((dish, index) => (
          <ReelPage key={dish.id} dish={dish} profile={profile} active={index === activeIndex} onAsk={onAsk} />
        ))}
      </div>

      {activeIndex < dishes.length - 1 && (
        <div className="reels-hint" aria-hidden>
          <ChevronUp size={15} />
          {t("Swipe up for more")}
        </div>
      )}
    </div>
  );
}

function ReelPage({
  dish,
  profile,
  active,
  onAsk
}: {
  dish: MenuItem;
  profile: DinerProfile;
  active: boolean;
  onAsk: (dish: MenuItem) => void;
}) {
  const t = useT();
  const money = useMoney();
  const { locale } = useLocale();
  const cart = useCart();
  const [requests, setRequests] = useState<string[]>([]);

  const dishConflicts = conflicts(dish, profile);
  const nudges = getNudges(dish, profile);
  // Persistent quantity straight from the cart — survives closing/reopening the dish.
  const qty = cart.lines.find((line) => line.dish.id === dish.id)?.qty ?? 0;

  function toggleRequest(request: string) {
    setRequests((current) => (current.includes(request) ? current.filter((item) => item !== request) : [...current, request]));
  }

  return (
    <section className={`reel-page ${active ? "active" : ""}`}>
      <div className="reel-hero">
        <Dish3D dish={dish} src={dish.imageUrl} large feed />
      </div>

      <div className="reel-info">
        <div className="reel-meta">
          <span>{categoryLabel(dish.category, locale)}</span>
          <strong>{money(dish.price)}</strong>
        </div>
        <h2>{dishName(dish, locale)}</h2>
        {dish.nativeName && locale === "en" && <p className="native-line">{dish.nativeName}</p>}
        <p className="reel-blurb">{dishExplainer(dish, locale)}</p>

        {dishConflicts.length > 0 ? (
          <div className="warning-box">
            <AlertTriangle size={16} />
            <span>{dishConflicts.map((c) => t(c)).join(" · ")}</span>
          </div>
        ) : (
          <div className="safe-box">
            <ShieldCheck size={16} />
            <span>{t("No conflicts with your saved profile.")}</span>
          </div>
        )}

        {nudges
          .filter((nudge) => nudge.id !== "conflict")
          .map((nudge) => (
            <div key={nudge.id} className={`reel-nudge ${nudge.tone}`}>
              <Sparkles size={13} />
              <span>{t(nudge.message)}</span>
              {nudge.action && (
                <button
                  className={`reel-nudge-action ${requests.includes(nudge.action.request) ? "on" : ""}`}
                  onClick={() => toggleRequest(nudge.action!.request)}
                >
                  {requests.includes(nudge.action.request) ? <Check size={12} /> : null}
                  {t(nudge.action.label)}
                </button>
              )}
            </div>
          ))}

        <div className="reel-actions">
          <button className="ghost-button" onClick={() => onAsk(dish)}>
            <MessageCircle size={16} />
            {t("Ask")}
          </button>
          {qty === 0 ? (
            <button className="primary-button" onClick={() => cart.add(dish, requests)}>
              <Plus size={18} />
              {requests.length > 0 ? t("Add (adjusted)") : t("Add to basket")}
            </button>
          ) : (
            <div className="reel-qty">
              <button onClick={() => cart.setQty(dish.id, qty - 1)} aria-label={t("Reduce")}>
                <Minus size={16} />
              </button>
              <span>
                {qty} {t("in basket")}
              </span>
              <button onClick={() => cart.add(dish, requests)} aria-label={t("Add")}>
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
