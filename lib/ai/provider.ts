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
};

const fireworksUrl = "https://api.fireworks.ai/inference/v1/chat/completions";

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

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model ?? model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 700,
        ...(request.json ? { response_format: { type: "json_object" } } : {})
      })
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OpenAiCompatibleResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return {
      content,
      model: data.model ?? request.model ?? model,
      source: "fireworks"
    };
  } catch {
    return null;
  }
}

export function parseJsonObject<T>(raw: string): T | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}
