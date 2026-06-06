import "server-only";

import { callModel, isVisionConfigured, visionModel, type LlmContentPart } from "@/lib/llm";
import type { ExtractedDish } from "@/lib/studio/draft";
import type { Allergen } from "@/lib/types";

export type MenuExtractResult = {
  // Whether a vision model was available to attempt extraction. When false the
  // wizard keeps manual dish entry instead of showing a "couldn't read" error.
  configured: boolean;
  items: ExtractedDish[];
};

const VALID_ALLERGENS: Allergen[] = ["gluten", "shellfish", "fish", "dairy", "egg", "nuts"];
const MAX_IMAGES = 8;

const SYSTEM_PROMPT = `You are a menu digitiser. Read the menu photo(s) and extract every dish you can see.
Return STRICT JSON of the shape:
{"items":[{"name":string,"category":string,"price":number|null,"description":string,"spice":0|1|2|3,"vegetarian":boolean,"vegan":boolean,"contains":string[]}]}
Rules:
- name: the dish name exactly as printed.
- category: the menu section the dish sits under (e.g. "Starters", "Sushi"). Infer a sensible one if the menu has no headings.
- price: the numeric price (no currency symbol), or null if not shown.
- description: a short diner-facing line taken from the menu (<= 120 chars). Empty string if none.
- spice: integer 0-3 (0 none, 3 very hot) inferred from wording like "spicy"/"chilli"; default 0.
- vegetarian / vegan: booleans inferred from the dish; default false when unsure.
- contains: only values from ["gluten","shellfish","fish","dairy","egg","nuts"], included only when clearly implied; otherwise [].
Only output the JSON object. Never invent dishes that are not visible on the menu.`;

// Read menu photos (base64 data URLs) with a vision model and return structured
// dishes. Best-effort: returns an empty list (never throws) when the model is
// unavailable, the request fails, or the response cannot be parsed.
export async function extractMenuItems(images: string[]): Promise<MenuExtractResult> {
  const usable = images.filter((url) => typeof url === "string" && url.startsWith("data:image")).slice(0, MAX_IMAGES);
  if (!isVisionConfigured() || usable.length === 0) {
    return { configured: false, items: [] };
  }

  const content: LlmContentPart[] = [
    { type: "text", text: "Extract all dishes from these menu photo(s) as JSON." },
    ...usable.map((url) => ({ type: "image_url" as const, image_url: { url } }))
  ];

  try {
    const response = await callModel(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content }
      ],
      { model: visionModel(), json: true, temperature: 0, maxTokens: 2000 }
    );
    return { configured: true, items: parseItems(response.content) };
  } catch {
    return { configured: true, items: [] };
  }
}

function parseItems(raw: string): ExtractedDish[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = Array.isArray(data) ? data : (data as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items.map(normalizeDish).filter((dish): dish is ExtractedDish => dish !== null);
}

function normalizeDish(value: unknown): ExtractedDish | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;

  const priceRaw = record.price;
  const price =
    typeof priceRaw === "number" && Number.isFinite(priceRaw)
      ? priceRaw
      : typeof priceRaw === "string" && priceRaw.trim() !== "" && Number.isFinite(Number(priceRaw.replace(/[^0-9.]/g, "")))
        ? Number(priceRaw.replace(/[^0-9.]/g, ""))
        : null;

  const spiceRaw = Number(record.spice);
  const spice = ([0, 1, 2, 3] as const).find((level) => level === spiceRaw) ?? 0;

  const contains = Array.isArray(record.contains)
    ? record.contains.filter((entry): entry is Allergen => VALID_ALLERGENS.includes(entry as Allergen))
    : [];

  return {
    name,
    category: typeof record.category === "string" ? record.category.trim() : "",
    price,
    description: typeof record.description === "string" ? record.description.trim().slice(0, 120) : "",
    spice,
    vegetarian: Boolean(record.vegetarian) || Boolean(record.vegan),
    vegan: Boolean(record.vegan),
    contains
  };
}
