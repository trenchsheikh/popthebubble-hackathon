import { chatCompletion, parseJsonObject } from "@/lib/ai/provider";
import type { GroundedChatInput, GroundedChatResponse } from "@/lib/ai/types";
import { conflicts } from "@/lib/conflicts";
import { heuristicRecommendations } from "@/lib/recommend";
import type { MenuItem } from "@/lib/types";

type ChatPlan = {
  reply?: unknown;
  dishIds?: unknown;
};

const SPICE_LABELS = ["no heat", "mild", "medium", "hot"] as const;
const ADVENTURE_LABELS = ["cautious", "open to new things", "adventurous"] as const;

function sentenceList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function dishMatches(question: string, menu: MenuItem[]) {
  const lower = question.toLowerCase();
  return menu.filter((dish) => lower.includes(dish.name.toLowerCase()) || lower.includes(dish.id.replaceAll("-", " ")));
}

function validDishIds(value: unknown, menu: MenuItem[]) {
  const known = new Set(menu.map((dish) => dish.id));
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((item): item is string => typeof item === "string" && known.has(item) && !seen.has(item) && (seen.add(item), true))
    .slice(0, 3);
}

// Compact, model-facing view of a dish. `unsafe` is computed deterministically
// (never model-guessed) so the agent can be told exactly what conflicts with the
// diner's diet/allergies.
function dishForModel(dish: MenuItem, input: GroundedChatInput) {
  return {
    id: dish.id,
    name: dish.name,
    category: dish.category,
    price: dish.price,
    spice: SPICE_LABELS[dish.spice] ?? "mild",
    vegetarian: dish.vegetarian,
    vegan: dish.vegan,
    contains: dish.contains,
    description: dish.blurb || dish.explainer,
    available: dish.available,
    unsafe: conflicts(dish, input.profile)
  };
}

function profileForModel(input: GroundedChatInput) {
  const { profile } = input;
  return {
    diet: profile.diet,
    allergies: profile.allergies,
    spiceTolerance: SPICE_LABELS[profile.spice] ?? "mild",
    appetite: profile.appetite,
    adventurousness: ADVENTURE_LABELS[profile.adventure] ?? "open to new things",
    likes: profile.likes,
    dislikes: profile.dislikes
  };
}

const SYSTEM_PROMPT = (restaurantName: string, cuisine: string) =>
  `You are the digital concierge for ${restaurantName}, a ${cuisine} restaurant, chatting with a diner at their table.

Voice: warm and courteous, like excellent table service — but concise. Reply in 1-3 short sentences. No fluff, no filler, no over-apologising, no emoji. Plain, natural language.

Rules (strict):
- Only discuss dishes from the MENU provided. Never invent dishes, ingredients, prices, or facts you were not given. If asked about something not on the menu, say it's not on tonight's menu.
- Every dish has an "unsafe" list — reasons it clashes with THIS diner's diet/allergies. Never recommend a dish whose unsafe list is non-empty. If the diner asks about such a dish, gently tell them why it doesn't fit and offer a safe alternative.
- Personalise using the diner's PROFILE and MEMORY (spice tolerance, likes, past favourites). Let it shape your picks; don't recite their data back at them.
- Answer the real question — dish details, comparisons, pairings, recommendations, dietary fit, prices. Stay on the menu and on point.
- When you mention or suggest specific dishes, list their exact ids in dishIds (best fit first, at most 3) so the app can show cards. Leave dishIds empty if no specific dish applies.
- If nothing safe fits the request, say so honestly and suggest asking the team.

Respond with ONLY a JSON object: {"reply": "<your message>", "dishIds": ["<id>", ...]}`;

function composeDishAnswer(dishes: MenuItem[], input: GroundedChatInput, source: GroundedChatResponse["source"]): GroundedChatResponse {
  const warnings: string[] = [];
  const lines = dishes.map((dish) => {
    const unsafe = conflicts(dish, input.profile);
    if (unsafe.length) {
      warnings.push(`${dish.name}: ${unsafe.join(", ")}`);
      return `${dish.name} is not a safe fit for your profile: ${unsafe.join(", ")}.`;
    }
    return `${dish.name} works well: ${dish.explainer}`;
  });

  return {
    message: lines.join(" "),
    dishIds: dishes.map((dish) => dish.id),
    warnings,
    source
  };
}

function composeGeneralAnswer(input: GroundedChatInput, source: GroundedChatResponse["source"]): GroundedChatResponse {
  const safePicks = heuristicRecommendations(input).picks
    .map((pick) => input.menu.find((dish) => dish.id === pick.id))
    .filter((dish): dish is MenuItem => {
      if (!dish) return false;
      return conflicts(dish, input.profile).length === 0;
    })
    .slice(0, 3);

  if (!safePicks.length) {
    return {
      message: "I cannot find a safe dish from this menu for your current profile. Please ask the team before ordering.",
      dishIds: [],
      warnings: ["No conflict-free menu item found."],
      source
    };
  }

  return {
    message: `From this menu, I would start with ${sentenceList(safePicks.map((dish) => dish.name))}. They fit your current profile, and I am keeping unsafe dishes out of the suggestion.`,
    dishIds: safePicks.map((dish) => dish.id),
    warnings: [],
    source
  };
}

// Deterministic fallback used when the model is unavailable or returns nothing
// usable, so the chat always answers.
function heuristicFallback(input: GroundedChatInput): GroundedChatResponse {
  const named = dishMatches(input.question, input.menu);
  if (named.length) return composeDishAnswer(named.slice(0, 3), input, "heuristic");
  return composeGeneralAnswer(input, "heuristic");
}

export async function groundedChat(input: GroundedChatInput): Promise<GroundedChatResponse> {
  const ai = await chatCompletion({
    json: true,
    temperature: 0.4,
    maxTokens: 320,
    messages: [
      { role: "system", content: SYSTEM_PROMPT(input.restaurant.name, input.restaurant.cuisine) },
      {
        role: "user",
        content: JSON.stringify({
          question: input.question,
          recentMessages: input.messages?.slice(-6) ?? [],
          profile: profileForModel(input),
          memory: (input.memoryFacts ?? []).map((fact) => ({ note: fact.text, kind: fact.kind })),
          menu: input.menu.map((dish) => dishForModel(dish, input))
        })
      }
    ]
  });

  if (!ai) return heuristicFallback(input);

  const plan = parseJsonObject<ChatPlan>(ai.content);
  const reply = typeof plan?.reply === "string" ? plan.reply.trim() : "";
  if (!reply) return heuristicFallback(input);

  const ids = validDishIds(plan?.dishIds, input.menu);
  const dishes = ids.map((id) => input.menu.find((dish) => dish.id === id)).filter((dish): dish is MenuItem => Boolean(dish));
  const warnings = dishes.flatMap((dish) => {
    const unsafe = conflicts(dish, input.profile);
    return unsafe.length ? [`${dish.name}: ${unsafe.join(", ")}`] : [];
  });

  return { message: reply, dishIds: dishes.map((dish) => dish.id), warnings, source: ai.source };
}
