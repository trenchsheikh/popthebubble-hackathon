import { chatCompletion, parseJsonObject } from "@/lib/ai/provider";
import type { GroundedChatInput, GroundedChatResponse } from "@/lib/ai/types";
import { conflicts } from "@/lib/conflicts";
import { heuristicRecommendations } from "@/lib/recommend";
import type { MenuItem } from "@/lib/types";

type ChatPlan = {
  dishIds?: unknown;
  intent?: unknown;
};

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
  return value.filter((item): item is string => typeof item === "string" && known.has(item)).slice(0, 3);
}

function composeDishAnswer(dishes: MenuItem[], input: GroundedChatInput, source: GroundedChatResponse["source"]): GroundedChatResponse {
  const warnings: string[] = [];
  const lines = dishes.map((dish) => {
    const unsafe = conflicts(dish, input.profile);
    if (unsafe.length) {
      const warning = `${dish.name}: ${unsafe.join(", ")}`;
      warnings.push(warning);
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

export async function groundedChat(input: GroundedChatInput): Promise<GroundedChatResponse> {
  const directMatches = dishMatches(input.question, input.menu);
  if (directMatches.length) return composeDishAnswer(directMatches.slice(0, 3), input, "heuristic");

  const ai = await chatCompletion({
    json: true,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Choose menu dish ids that answer the diner. Return JSON only: { dishIds: string[], intent: string }. Use only supplied ids. Do not create dish names or facts."
      },
      {
        role: "user",
        content: JSON.stringify({
          question: input.question,
          recentMessages: input.messages?.slice(-6) ?? [],
          profile: input.profile,
          memoryFacts: input.memoryFacts ?? [],
          menu: input.menu.map((dish) => ({
            id: dish.id,
            name: dish.name,
            category: dish.category,
            spice: dish.spice,
            available: dish.available,
            tags: dish.tags,
            blurb: dish.blurb,
            unsafe: conflicts(dish, input.profile)
          }))
        })
      }
    ]
  });

  if (!ai) return composeGeneralAnswer(input, "heuristic");

  const plan = parseJsonObject<ChatPlan>(ai.content);
  const ids = validDishIds(plan?.dishIds, input.menu);
  const dishes = ids.map((id) => input.menu.find((dish) => dish.id === id)).filter((dish): dish is MenuItem => Boolean(dish));

  if (!dishes.length) return composeGeneralAnswer(input, ai.source);
  return composeDishAnswer(dishes, input, ai.source);
}
