import "server-only";

import type { AiChatRequest, AiChatResult } from "@/lib/ai/types";

type OpenAiCompatibleChoice = {
  message?: {
    content?: string;
  };
};

type OpenAiCompatibleResponse = {
  choices?: OpenAiCompatibleChoice[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

const fireworksUrl = "https://api.fireworks.ai/inference/v1/chat/completions";

// Bounded so a slow/hung upstream can't block a table-side chat turn. Worst
// case latency ≈ TIMEOUT_MS × (MAX_RETRIES + 1); the caller falls back to a
// deterministic heuristic on null.
const TIMEOUT_MS = 12_000;
const MAX_RETRIES = 1;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function backoff(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
}

// Per-request usage + latency. Off by default (no log spam in prod); set
// AI_DEBUG=1 to see token cost and timing per call.
function logUsage(data: OpenAiCompatibleResponse, model: string, ms: number) {
  if (!process.env.AI_DEBUG) return;
  const usage = data.usage;
  // eslint-disable-next-line no-console
  console.info(`[ai] ${model} ${ms}ms prompt=${usage?.prompt_tokens ?? "?"} completion=${usage?.completion_tokens ?? "?"}`);
}

export function isAiConfigured() {
  return Boolean(process.env.FIREWORKS_API_KEY || process.env.OPENAI_COMPATIBLE_API_KEY);
}

function providerConfig() {
  const apiKey = process.env.FIREWORKS_API_KEY ?? process.env.OPENAI_COMPATIBLE_API_KEY;
  const baseUrl = process.env.AI_CHAT_COMPLETIONS_URL ?? fireworksUrl;
  const model = process.env.AI_MODEL ?? process.env.FIREWORKS_MODEL ?? "accounts/fireworks/models/llama-v3p1-70b-instruct";

  return { apiKey, baseUrl, model };
}

export async function chatCompletion(request: AiChatRequest): Promise<AiChatResult | null> {
  const { apiKey, baseUrl, model } = providerConfig();
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: request.model ?? model,
    messages: request.messages,
    temperature: request.temperature ?? 0.2,
    max_tokens: request.maxTokens ?? 700,
    ...(request.json ? { response_format: { type: "json_object" } } : {})
  });
  const usedModel = request.model ?? model;
  const startedAt = Date.now();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body,
        signal: controller.signal
      });

      if (!response.ok) {
        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
          await backoff(attempt);
          continue;
        }
        // eslint-disable-next-line no-console
        console.warn(`[ai] ${usedModel} HTTP ${response.status} after ${Date.now() - startedAt}ms`);
        return null;
      }

      const data = (await response.json()) as OpenAiCompatibleResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        // eslint-disable-next-line no-console
        console.warn(`[ai] ${usedModel} returned empty content`);
        return null;
      }

      logUsage(data, usedModel, Date.now() - startedAt);
      return {
        content,
        model: data.model ?? usedModel,
        source: "fireworks"
      };
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      if (!timedOut && attempt < MAX_RETRIES) {
        await backoff(attempt);
        continue;
      }
      // eslint-disable-next-line no-console
      console.warn(`[ai] ${usedModel} ${timedOut ? "timed out" : "request failed"} after ${Date.now() - startedAt}ms`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export function parseJsonObject<T>(raw: string): T | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}
