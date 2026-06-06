"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MemoryFact } from "@/lib/types";

/**
 * Drives the diner-side Mubit memory loop, entirely best-effort:
 * - on mount, RECALL durable memory for this diner (cross-restaurant)
 * - `learn(facts)` writes new global lessons during the visit
 * - `consolidate()` distills the session on the way out
 *
 * dinerId is the stable, device-persistent id (shared across restaurants), used
 * as the Mubit user_id. runId is one visit. Every call swallows errors so the
 * app never breaks when Mubit is unconfigured or offline.
 */
export function useDinerMemory({ dinerId, restaurantId }: { dinerId: string; restaurantId: string }) {
  const [mubitFacts, setMubitFacts] = useState<MemoryFact[]>([]);
  const runIdRef = useRef<string>("");

  if (dinerId && !runIdRef.current) {
    runIdRef.current = `${dinerId}:${Date.now()}`;
  }

  useEffect(() => {
    if (!dinerId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/memory/reminisce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dinerId, runId: runIdRef.current, restaurantId })
        });
        if (!response.ok) return;
        const data = (await response.json()) as { data?: MemoryFact[] };
        if (!cancelled && Array.isArray(data.data)) setMubitFacts(data.data);
      } catch {
        // memory is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dinerId, restaurantId]);

  const learn = useCallback(
    async (facts: MemoryFact[]) => {
      if (!dinerId || facts.length === 0) return;
      try {
        await fetch("/api/memory/learn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dinerId, runId: runIdRef.current, facts, restaurantId })
        });
      } catch {
        // best-effort
      }
    },
    [dinerId, restaurantId]
  );

  const consolidate = useCallback(async () => {
    if (!dinerId) return;
    try {
      await fetch("/api/memory/consolidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dinerId, runId: runIdRef.current, restaurantId })
      });
    } catch {
      // best-effort
    }
  }, [dinerId, restaurantId]);

  return { mubitFacts, learn, consolidate };
}
