import "server-only";

import type { DinerProfile, MemoryFact } from "@/lib/types";

export type MemoryRecallInput = {
  dinerId: string;
  restaurantId?: string;
  query?: string;
};

export type MemoryCommitInput = {
  dinerId: string;
  restaurantId: string;
  facts: MemoryFact[];
  profile?: DinerProfile;
};

export type MemoryForgetInput = {
  dinerId: string;
  factIds?: string[];
};

export type MemoryServiceResult<T> = {
  data: T;
  source: "mubit" | "mock";
  unavailableReason?: string;
};

export type MemoryService = {
  recall(input: MemoryRecallInput): Promise<MemoryServiceResult<MemoryFact[]>>;
  focus(input: MemoryRecallInput): Promise<MemoryServiceResult<MemoryFact[]>>;
  commit(input: MemoryCommitInput): Promise<MemoryServiceResult<MemoryFact[]>>;
  forget(input: MemoryForgetInput): Promise<MemoryServiceResult<{ forgotten: string[] }>>;
};

const mockStore = new Map<string, MemoryFact[]>();

function isMubitConfigured() {
  return Boolean(process.env.MUBIT_API_KEY && process.env.MUBIT_BASE_URL);
}

async function mubitRequest<T>(path: string, body: unknown): Promise<T | null> {
  if (!isMubitConfigured()) return null;

  try {
    const response = await fetch(`${process.env.MUBIT_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MUBIT_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mockReason() {
  return "Mubit is not configured; using in-process mock memory.";
}

export function createMemoryService(): MemoryService {
  return {
    async recall(input) {
      const remote = await mubitRequest<{ facts?: MemoryFact[] }>("/memory/recall", input);
      if (remote?.facts) return { data: remote.facts, source: "mubit" };
      return { data: mockStore.get(input.dinerId) ?? [], source: "mock", unavailableReason: mockReason() };
    },

    async focus(input) {
      const remote = await mubitRequest<{ facts?: MemoryFact[] }>("/memory/focus", input);
      if (remote?.facts) return { data: remote.facts, source: "mubit" };
      return { data: mockStore.get(input.dinerId) ?? [], source: "mock", unavailableReason: mockReason() };
    },

    async commit(input) {
      const remote = await mubitRequest<{ facts?: MemoryFact[] }>("/memory/commit", input);
      if (remote?.facts) return { data: remote.facts, source: "mubit" };

      const existing = mockStore.get(input.dinerId) ?? [];
      const next = [...existing];
      for (const fact of input.facts) {
        const index = next.findIndex((item) => item.id === fact.id);
        if (index >= 0) next[index] = fact;
        else next.push(fact);
      }
      mockStore.set(input.dinerId, next);
      return { data: next, source: "mock", unavailableReason: mockReason() };
    },

    async forget(input) {
      const remote = await mubitRequest<{ forgotten?: string[] }>("/memory/forget", input);
      if (remote?.forgotten) return { data: { forgotten: remote.forgotten }, source: "mubit" };

      const existing = mockStore.get(input.dinerId) ?? [];
      const forgetIds = input.factIds ?? existing.map((fact) => fact.id);
      mockStore.set(input.dinerId, existing.filter((fact) => !forgetIds.includes(fact.id)));
      return { data: { forgotten: forgetIds }, source: "mock", unavailableReason: mockReason() };
    }
  };
}

export const memoryService = createMemoryService();
