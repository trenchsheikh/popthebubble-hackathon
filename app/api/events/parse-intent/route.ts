import { NextResponse } from "next/server";
import { callModel, isLlmConfigured } from "@/lib/llm";
import { parseIntentText } from "@/lib/events/intent";
import type { BudgetTier, EventIntent, EventKindTag, GroupType } from "@/lib/events/types";

const VALID_KINDS: EventKindTag[] = ["comedy", "music", "arts", "sports", "nightlife", "film"];
const VALID_GROUPS: GroupType[] = ["solo", "couple", "group"];
const VALID_BUDGETS: BudgetTier[] = ["low", "mid", "high"];

const SYSTEM_PROMPT = `You turn a diner's free-text plans for after dinner into a JSON object.
Return ONLY JSON: {"group":"solo|couple|group","vibes":["comedy"|"music"|"arts"|"sports"|"nightlife"|"film"],"budget":"low|mid|high"}.
vibes is the kinds of events they'd enjoy (0-3 items). Infer group size and budget from tone.`;

function coerce(raw: unknown, fallbackText: string): EventIntent {
  if (!raw || typeof raw !== "object") return parseIntentText(fallbackText);
  const obj = raw as Record<string, unknown>;
  const group = VALID_GROUPS.includes(obj.group as GroupType) ? (obj.group as GroupType) : "couple";
  const budget = VALID_BUDGETS.includes(obj.budget as BudgetTier) ? (obj.budget as BudgetTier) : "mid";
  const vibes = Array.isArray(obj.vibes)
    ? [...new Set(obj.vibes.filter((vibe): vibe is EventKindTag => VALID_KINDS.includes(vibe as EventKindTag)))]
    : [];
  return { group, budget, vibes, freeText: fallbackText.slice(0, 280) };
}

export async function POST(request: Request) {
  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
  }

  // Heuristic is the baseline; upgrade with the LLM when it's configured.
  if (!isLlmConfigured()) {
    return NextResponse.json({ ok: true, intent: parseIntentText(text), source: "heuristic" });
  }

  try {
    const response = await callModel(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 500) }
      ],
      { json: true, temperature: 0, maxTokens: 200 }
    );
    const parsed = JSON.parse(response.content) as unknown;
    return NextResponse.json({ ok: true, intent: coerce(parsed, text), source: "llm" });
  } catch {
    return NextResponse.json({ ok: true, intent: parseIntentText(text), source: "heuristic" });
  }
}
