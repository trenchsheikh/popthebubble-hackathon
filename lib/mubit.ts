import "server-only";

import { Client, type OperationResult } from "@mubit-ai/sdk";
import type { DinerProfile, MemoryFact } from "@/lib/types";

/**
 * Mubit memory layer — the diner personalization loop.
 *
 * Domain mapping (kept stable so callers don't depend on Mubit internals):
 *   dinerId  → Mubit user_id   (the durable, cross-restaurant identity key)
 *   runId    → Mubit session_id (one QR-scan visit)
 *   agent_id → a constant for this app
 *
 * Cross-restaurant memory works because preferences are written as lessons with
 * lesson_scope "global": they are recalled by user_id across any session/venue.
 * Per-session facts stay local. Everything is server-only — the API key never
 * reaches the client.
 */

const AGENT_ID = "bubble-concierge";

export type MubitResult<T> = {
  data: T;
  source: "mubit" | "mock";
  unavailableReason?: string;
};

export type ReminisceInput = {
  dinerId: string;
  runId: string;
  restaurantId?: string;
};

export type CommitInput = {
  dinerId: string;
  runId: string;
  facts: MemoryFact[];
  restaurantId?: string;
  profile?: DinerProfile;
};

export type ConsolidateInput = {
  dinerId: string;
  runId: string;
  restaurantId?: string;
};

export type ForgetInput = {
  dinerId: string;
  runId: string;
  factIds?: string[];
};

// ---------------------------------------------------------------------------
// Client (lazy singleton)
// ---------------------------------------------------------------------------

let client: Client | null = null;
let initialised = false;

function getClient(): Client | null {
  if (initialised) return client;
  initialised = true;

  const apiKey = process.env.MUBIT_API_KEY;
  if (!apiKey) {
    client = null;
    return null;
  }

  const endpoint = process.env.MUBIT_BASE_URL;
  client = new Client(endpoint ? { apiKey, endpoint } : { apiKey });
  return client;
}

export function isMubitReady(): boolean {
  return Boolean(process.env.MUBIT_API_KEY);
}

function unconfigured<T>(data: T): MubitResult<T> {
  return { data, source: "mock", unavailableReason: "Mubit is not configured; using mock memory." };
}

function failed<T>(data: T, operation: string): MubitResult<T> {
  return { data, source: "mock", unavailableReason: `Mubit ${operation} failed; using mock memory.` };
}

// ---------------------------------------------------------------------------
// Response coercion (the SDK returns a loose OperationResult)
// ---------------------------------------------------------------------------

function asRecord(value: OperationResult | unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asKind(value: unknown): MemoryFact["kind"] {
  return value === "preference" || value === "allergy" || value === "dish_history" || value === "context"
    ? value
    : "context";
}

/**
 * Pull memory facts out of a recall/reflect result. Mubit returns
 * { final_answer, confidence, mode, evidence: [...] }; we map evidence entries
 * to MemoryFacts, falling back to the synthesized final_answer.
 */
function toMemoryFacts(result: OperationResult): MemoryFact[] {
  const record = asRecord(result);
  const evidence = Array.isArray(record.evidence)
    ? record.evidence
    : Array.isArray(result)
      ? (result as unknown[])
      : [];

  const facts = evidence
    .map((item, index): MemoryFact | null => {
      const entry = asRecord(item);
      const text = asString(entry.content) ?? asString(entry.text) ?? asString(entry.lesson) ?? asString(entry.summary);
      if (!text) return null;
      return {
        id: asString(entry.id) ?? asString(entry.entry_id) ?? `mubit-${index}`,
        text,
        kind: asKind(entry.lesson_type ?? entry.intent),
        confidence: asNumber(entry.confidence) ?? 0.7
      };
    })
    .filter((fact): fact is MemoryFact => fact !== null);

  if (facts.length === 0) {
    const finalAnswer = asString(record.final_answer);
    if (finalAnswer) {
      return [{ id: "mubit-summary", text: finalAnswer, kind: "context", confidence: asNumber(record.confidence) ?? 0.6 }];
    }
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Memory loop
// ---------------------------------------------------------------------------

/**
 * RECALL on session start: durable, cross-restaurant memory for this diner.
 */
export async function reminisce(input: ReminisceInput): Promise<MubitResult<MemoryFact[]>> {
  const mubit = getClient();
  if (!mubit) return unconfigured<MemoryFact[]>([]);

  try {
    const focus = input.restaurantId ? ` relevant to ${input.restaurantId}` : "";
    const result = await mubit.recall({
      query: `This diner's lasting food preferences, dietary needs, allergies, likes and dislikes${focus}.`,
      user_id: input.dinerId,
      session_id: input.runId,
      agent_id: AGENT_ID,
      limit: 20
    });
    return { data: toMemoryFacts(result), source: "mubit" };
  } catch {
    return failed<MemoryFact[]>([], "recall");
  }
}

/**
 * EPISODIC WRITE during/after a session. Preferences are stored as global
 * lessons so they carry across sessions and restaurants.
 */
export async function commit(input: CommitInput): Promise<MubitResult<MemoryFact[]>> {
  const mubit = getClient();
  if (!mubit) return unconfigured<MemoryFact[]>([]);

  try {
    await Promise.all(
      input.facts.map((fact) =>
        mubit.remember({
          content: fact.text,
          user_id: input.dinerId,
          session_id: input.runId,
          agent_id: AGENT_ID,
          intent: "lesson",
          lesson_scope: "global",
          lesson_type: fact.kind,
          metadata: input.restaurantId ? { restaurant_id: input.restaurantId } : undefined
        })
      )
    );
    return { data: input.facts, source: "mubit" };
  } catch {
    return failed<MemoryFact[]>([], "commit");
  }
}

/**
 * ON SESSION END: distill the session into durable memory (Mubit reflect).
 */
export async function consolidate(
  input: ConsolidateInput
): Promise<MubitResult<{ summary: string; facts: MemoryFact[] }>> {
  const mubit = getClient();
  if (!mubit) return unconfigured({ summary: "", facts: [] });

  try {
    const result = await mubit.reflect({ session_id: input.runId, user_id: input.dinerId });
    const record = asRecord(result);
    const summary = asString(record.summary) ?? asString(record.final_answer) ?? "";
    return { data: { summary, facts: toMemoryFacts(result) }, source: "mubit" };
  } catch {
    return failed({ summary: "", facts: [] }, "consolidate");
  }
}

/**
 * Forget specific lessons (diner opt-out). Mubit deletes by lesson id, so a
 * bulk "forget everything" requires the caller to supply ids.
 */
export async function forget(input: ForgetInput): Promise<MubitResult<{ forgotten: string[] }>> {
  const mubit = getClient();
  if (!mubit) return unconfigured({ forgotten: [] as string[] });

  try {
    const ids = input.factIds ?? [];
    const forgotten: string[] = [];
    for (const lessonId of ids) {
      await mubit.forget({ lesson_id: lessonId, session_id: input.runId });
      forgotten.push(lessonId);
    }
    return { data: { forgotten }, source: "mubit" };
  } catch {
    return failed({ forgotten: [] as string[] }, "forget");
  }
}
