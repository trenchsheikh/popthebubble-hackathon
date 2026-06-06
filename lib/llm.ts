import "server-only";

// Provider-agnostic LLM wrapper for OpenAI-compatible endpoints.
// Requires: FIREWORKS_API_KEY (env)
// Optionals: FIREWORKS_BASE_URL, FIREWORKS_MODEL

export type LlmChatRole = "system" | "user" | "assistant";

export interface LlmChatMessage {
  role: LlmChatRole;
  content: string;
}

export interface LlmCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
}

export interface LlmResponse {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigError";
  }
}

export class LlmApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "LlmApiError";
    this.status = status;
    this.details = details;
  }
}

export class LlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmParseError";
  }
}

interface OpenAiCompatibleChoice {
  message?: { content?: string };
  finish_reason?: string;
}

interface OpenAiCompatibleResponse {
  choices?: OpenAiCompatibleChoice[];
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const DEFAULT_BASE_URL = "https://api.fireworks.ai/inference/v1";
const DEFAULT_MODEL = "accounts/fireworks/models/llama-v3p1-70b-instruct";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 700;
const DEFAULT_TIMEOUT_MS = 30_000;

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getConfig(): LlmConfig {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    throw new LlmConfigError("FIREWORKS_API_KEY not configured");
  }
  return {
    apiKey,
    baseUrl: process.env.FIREWORKS_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.FIREWORKS_MODEL ?? DEFAULT_MODEL
  };
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY);
}

// Call LLM. Throws LlmConfigError, LlmApiError, LlmParseError.
export async function callModel(
  messages: LlmChatMessage[],
  opts?: LlmCallOptions
): Promise<LlmResponse> {
  const config = getConfig();

  const model = opts?.model ?? config.model;
  const temperature = opts?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = opts?.maxTokens ?? DEFAULT_MAX_TOKENS;

  const url = new URL("/chat/completions", config.baseUrl).toString();

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (opts?.json) {
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    opts?.signal?.aborted ? 0 : DEFAULT_TIMEOUT_MS
  );

  const compositeSignal = opts?.signal
    ? AbortSignal.any([opts.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: compositeSignal
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }
      throw new LlmApiError(
        `LLM API: ${response.status} ${response.statusText}`,
        response.status,
        details
      );
    }

    const data = (await response.json()) as unknown;
    const parsed = parseOpenAiResponse(data);

    const firstChoice = parsed.choices?.[0];
    const content = firstChoice?.message?.content;

    if (!content) {
      throw new LlmParseError("No content in LLM response.");
    }

    return {
      content,
      model: parsed.model ?? model,
      finishReason: firstChoice?.finish_reason,
      usage: parsed.usage
        ? {
            promptTokens: parsed.usage.prompt_tokens ?? 0,
            completionTokens: parsed.usage.completion_tokens ?? 0,
            totalTokens: parsed.usage.total_tokens ?? 0
          }
        : undefined
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof LlmConfigError || error instanceof LlmApiError || error instanceof LlmParseError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new LlmApiError("LLM request cancelled or timed out.");
    }

    if (error instanceof Error) {
      throw new LlmApiError(`LLM request failed: ${error.message}`);
    }

    throw new LlmApiError("LLM request failed with unknown error.");
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseOpenAiResponse(data: unknown): OpenAiCompatibleResponse {
  if (!data || typeof data !== "object") {
    throw new LlmParseError("Response is not a valid object.");
  }

  const obj = data as Record<string, unknown>;

  const choices = Array.isArray(obj.choices) ? obj.choices : undefined;
  const model = typeof obj.model === "string" ? obj.model : undefined;

  let usage: OpenAiCompatibleResponse["usage"] | undefined;
  if (obj.usage && typeof obj.usage === "object") {
    const u = obj.usage as Record<string, unknown>;
    usage = {
      prompt_tokens:
        typeof u.prompt_tokens === "number" ? u.prompt_tokens : undefined,
      completion_tokens:
        typeof u.completion_tokens === "number" ? u.completion_tokens : undefined,
      total_tokens:
        typeof u.total_tokens === "number" ? u.total_tokens : undefined
    };
  }

  return { choices, model, usage };
}
