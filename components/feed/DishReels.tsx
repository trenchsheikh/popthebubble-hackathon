"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronUp, MessageCircle, Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { Dish3D } from "@/components/Dish3D";
import { useCart } from "@/components/cart/CartProvider";
import { conflicts } from "@/lib/conflicts";
import { getNudges } from "@/lib/nudges";
import { formatPrice } from "@/lib/format";
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
          Swipe up for more
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
  const cart = useCart();
  const [requests, setRequests] = useState<string[]>([]);
  const [added, setAdded] = useState(false);

  const dishConflicts = conflicts(dish, profile);
  const nudges = getNudges(dish, profile);

  function toggleRequest(request: string) {
    setRequests((current) => (current.includes(request) ? current.filter((item) => item !== request) : [...current, request]));
  }

  function addToOrder() {
    cart.add(dish, requests);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <section className={`reel-page ${active ? "active" : ""}`}>
      <div className="reel-hero">
        <Dish3D dish={dish} src={dish.imageUrl} large feed />
      </div>

      <div className="reel-info">
        <div className="reel-meta">
          <span>{dish.category}</span>
          <strong>{formatPrice(dish.price)}</strong>
        </div>
        <h2>{dish.name}</h2>
        {dish.nativeName && <p className="native-line">{dish.nativeName}</p>}
        <p className="reel-blurb">{dish.explainer}</p>

        {dishConflicts.length > 0 ? (
          <div className="warning-box">
            <AlertTriangle size={16} />
            <span>{dishConflicts.join(" · ")}</span>
          </div>
        ) : (
          <div className="safe-box">
            <ShieldCheck size={16} />
            <span>No conflicts with your saved profile.</span>
          </div>
        )}

        {nudges
          .filter((nudge) => nudge.id !== "conflict")
          .map((nudge) => (
            <div key={nudge.id} className={`reel-nudge ${nudge.tone}`}>
              <Sparkles size={13} />
              <span>{nudge.message}</span>
              {nudge.action && (
                <button
                  className={`reel-nudge-action ${requests.includes(nudge.action.request) ? "on" : ""}`}
                  onClick={() => toggleRequest(nudge.action!.request)}
                >
                  {requests.includes(nudge.action.request) ? <Check size={12} /> : null}
                  {nudge.action.label}
                </button>
              )}
            </div>
          ))}

        <div className="reel-actions">
          <button className="ghost-button" onClick={() => onAsk(dish)}>
            <MessageCircle size={16} />
            Ask
          </button>
          <button className="primary-button" onClick={addToOrder}>
            {added ? <Check size={18} /> : <Plus size={18} />}
            {added ? "Added to order" : requests.length > 0 ? "Add (adjusted)" : "Add to order"}
          </button>
        </div>
      </div>
    </section>
  );
}
