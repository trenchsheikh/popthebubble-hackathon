"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronRight, ConciergeBell, Mic, Sparkles } from "lucide-react";
import { conflicts } from "@/lib/conflicts";
import { formatPrice } from "@/lib/format";
import { useGroundedChat, type UiChatMessage } from "@/lib/useGroundedChat";
import { useVoiceInput } from "@/lib/useVoiceInput";
import { useServiceDock } from "@/components/service/ServiceProvider";
import type { DinerProfile, MemoryFact, MenuItem, Recommendation, Restaurant } from "@/lib/types";

const SUGGESTIONS = ["What should I start with?", "Something light and not too spicy", "What is the most popular dish?"];

export function ChatPanel({
  restaurant,
  menu,
  profile,
  memoryFacts,
  recommendedItems,
  onOpenDish,
  initialAsk,
  onInitialAskConsumed
}: {
  restaurant: Restaurant;
  menu: MenuItem[];
  profile: DinerProfile;
  memoryFacts: MemoryFact[];
  recommendedItems: { pick: Recommendation; dish: MenuItem }[];
  onOpenDish: (dish: MenuItem) => void;
  // A question queued from elsewhere (e.g. a dish's "Ask" button) — auto-sent
  // once when the panel opens, so the dish artifact + explanation load straight away.
  initialAsk?: string | null;
  onInitialAskConsumed?: () => void;
}) {
  const chat = useGroundedChat({ restaurant, menu, profile, memoryFacts });
  const service = useServiceDock();
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const askedRef = useRef(false);
  const menuById = useMemo(() => new Map(menu.map((dish) => [dish.id, dish])), [menu]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [chat.messages]);

  useEffect(() => {
    if (initialAsk && !askedRef.current) {
      askedRef.current = true;
      chat.send(initialAsk);
      onInitialAskConsumed?.();
    }
  }, [initialAsk, chat, onInitialAskConsumed]);

  function submit() {
    if (!input.trim()) return;
    chat.send(input);
    setInput("");
  }

  return (
    <section className="chat-panel">
      <div className="chat-thread" ref={threadRef}>
        {chat.messages.length === 0 ? (
          <div className="chat-welcome">
            <span className="chat-orb" aria-hidden />
            <h2>How can I help you order?</h2>
            <p>
              Ask anything about the {restaurant.shortName} menu — dietary fit, spice, pairings. Every answer stays
              grounded to tonight&apos;s dishes.
            </p>
            <div className="suggestion-chips">
              {recommendedItems.slice(0, 1).map(({ dish }) => (
                <button key={dish.id} onClick={() => chat.send(`Tell me about the ${dish.name}`)}>
                  <Sparkles size={13} />
                  Tell me about {dish.name}
                </button>
              ))}
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} onClick={() => chat.send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.messages.map((message) => (
            <ChatTurn
              key={message.id}
              message={message}
              menuById={menuById}
              profile={profile}
              onOpenDish={onOpenDish}
            />
          ))
        )}
      </div>
      {service && (
        <button className="talk-to-human" onClick={() => service.openDock("waiter")}>
          <ConciergeBell size={15} />
          Prefer a person? Talk to a human
        </button>
      )}
      <ChatComposer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        busy={chat.busy}
        placeholder={`Message ${restaurant.shortName}…`}
      />
    </section>
  );
}

export function ChatTurn({
  message,
  menuById,
  profile,
  onOpenDish
}: {
  message: UiChatMessage;
  menuById: Map<string, MenuItem>;
  profile: DinerProfile;
  onOpenDish: (dish: MenuItem) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="chat-row user">
        <div className="bubble user">{message.content}</div>
      </div>
    );
  }

  const dishes = (message.dishIds ?? [])
    .map((id) => menuById.get(id))
    .filter((dish): dish is MenuItem => Boolean(dish));

  return (
    <div className="chat-row assistant">
      <span className="assistant-avatar" aria-hidden>
        <Sparkles size={14} />
      </span>
      <div className="assistant-content">
        {message.pending ? <TypingDots /> : <div className="bubble assistant">{message.content}</div>}
        {dishes.length > 0 && (
          <div className="artifact-grid">
            {dishes.map((dish) => (
              <DishArtifact key={dish.id} dish={dish} profile={profile} onOpen={() => onOpenDish(dish)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DishArtifact({
  dish,
  profile,
  onOpen
}: {
  dish: MenuItem;
  profile: DinerProfile;
  onOpen: () => void;
}) {
  const dishConflicts = conflicts(dish, profile);
  return (
    <button className={`artifact-card ${dishConflicts.length ? "conflicted" : ""}`} onClick={onOpen}>
      <span
        className="artifact-thumb"
        style={{ background: `radial-gradient(circle at 32% 28%, ${dish.hue}, color-mix(in srgb, ${dish.hue} 20%, transparent) 78%)` }}
        aria-hidden
      />
      <span className="artifact-copy">
        <span className="artifact-label">{dish.category}</span>
        <strong>{dish.name}</strong>
        <span className="artifact-meta">
          {formatPrice(dish.price)}
          {dishConflicts.length > 0 && <em> · {dishConflicts[0]}</em>}
        </span>
      </span>
      <span className="artifact-open" aria-hidden>
        <ChevronRight size={16} />
      </span>
    </button>
  );
}

export function TypingDots() {
  return (
    <div className="typing" aria-label="Concierge is typing">
      <span />
      <span />
      <span />
    </div>
  );
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  placeholder?: string;
}) {
  const { supported, listening, toggle } = useVoiceInput(onChange);

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {supported && (
        <button
          type="button"
          className={`mic-button ${listening ? "live" : ""}`}
          onClick={toggle}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice input" : "Start voice input"}
        >
          <Mic size={18} />
        </button>
      )}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Message the concierge…"}
        aria-label="Message the concierge"
      />
      <button type="submit" className="composer-send" disabled={busy || !value.trim()} aria-label="Send message">
        <ArrowUp size={18} />
      </button>
    </form>
  );
}
