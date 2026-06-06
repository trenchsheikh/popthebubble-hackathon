"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage, DinerProfile, MemoryFact, MenuItem, Restaurant } from "@/lib/types";

export type UiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  dishIds?: string[];
  warnings?: string[];
  pending?: boolean;
};

type UseGroundedChatArgs = {
  restaurant: Restaurant;
  menu: MenuItem[];
  profile: DinerProfile;
  memoryFacts: MemoryFact[];
  locale?: string;
};

type GroundedChatPayload = {
  message: string;
  dishIds?: string[];
  warnings?: string[];
};

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `m${idCounter}`;
}

/**
 * Conversation state backed by the grounded `/api/chat` endpoint. Returns
 * assistant turns enriched with `dishIds`, which callers render as artifact
 * cards. Network failures resolve to a friendly assistant message rather than
 * throwing, so the UI never gets stuck on a pending bubble.
 */
export function useGroundedChat({ restaurant, menu, profile, memoryFacts, locale }: UseGroundedChatArgs) {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<UiChatMessage[]>(messages);
  messagesRef.current = messages;

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || busy) return;

      const userMessage: UiChatMessage = { id: nextId(), role: "user", content: question };
      const pendingMessage: UiChatMessage = { id: nextId(), role: "assistant", content: "", pending: true };
      const history: ChatMessage[] = messagesRef.current
        .filter((message) => !message.pending)
        .map((message) => ({ role: message.role, content: message.content }));

      setMessages((current) => [...current, userMessage, pendingMessage]);
      setBusy(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurant, menu, profile, memoryFacts, messages: history, question, locale })
        });
        if (!response.ok) throw new Error(`Chat request failed (${response.status})`);

        const data = (await response.json()) as GroundedChatPayload;
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessage.id
              ? {
                  ...message,
                  pending: false,
                  content: data.message,
                  dishIds: data.dishIds ?? [],
                  warnings: data.warnings ?? []
                }
              : message
          )
        );
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingMessage.id
              ? {
                  ...message,
                  pending: false,
                  content: "I couldn't reach the menu service just now. Please try that again in a moment."
                }
              : message
          )
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, restaurant, menu, profile, memoryFacts, locale]
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, busy, send, reset };
}
