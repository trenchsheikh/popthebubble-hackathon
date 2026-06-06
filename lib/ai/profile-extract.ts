import { chatCompletion, parseJsonObject } from "@/lib/ai/provider";
import type { ProfileExtractionInput, ProfileExtractionResponse } from "@/lib/ai/types";
import { defaultProfile } from "@/lib/profile";
import type { Allergen, Appetite, Diet, DinerProfile } from "@/lib/types";

const diets: Diet[] = ["none", "vegetarian", "vegan", "pescatarian", "halal"];
const allergens: Allergen[] = ["gluten", "shellfish", "fish", "dairy", "egg", "nuts"];
const appetites: Appetite[] = ["light", "normal", "feast"];

type ProfileCandidate = Partial<Record<keyof DinerProfile, unknown>>;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

export function validateProfile(candidate: unknown, base: DinerProfile = defaultProfile): DinerProfile {
  const data = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? (candidate as ProfileCandidate) : {};
  const diet = diets.includes(data.diet as Diet) ? (data.diet as Diet) : base.diet;
  const appetite = appetites.includes(data.appetite as Appetite) ? (data.appetite as Appetite) : base.appetite;
  const allergyList = Array.isArray(data.allergies) ? data.allergies : base.allergies;

  return {
    diet,
    allergies: allergyList.filter((item): item is Allergen => allergens.includes(item as Allergen)),
    spice: clampInt(data.spice, 0, 3, base.spice) as DinerProfile["spice"],
    adventure: clampInt(data.adventure, 0, 2, base.adventure) as DinerProfile["adventure"],
    appetite,
    likes: stringList(data.likes).length ? stringList(data.likes) : base.likes,
    dislikes: stringList(data.dislikes).length ? stringList(data.dislikes) : base.dislikes,
    memoryOptIn: typeof data.memoryOptIn === "boolean" ? data.memoryOptIn : base.memoryOptIn
  };
}

function heuristicProfileFromText(text: string, previousProfile?: DinerProfile): DinerProfile {
  const lower = text.toLowerCase();
  const draft: DinerProfile = { ...(previousProfile ?? defaultProfile) };

  if (/\bvegan\b/.test(lower)) draft.diet = "vegan";
  else if (/\bvegetarian\b/.test(lower)) draft.diet = "vegetarian";
  else if (/\bpescatarian\b/.test(lower)) draft.diet = "pescatarian";
  else if (/\bhalal\b/.test(lower)) draft.diet = "halal";
  else if (/\b(no restrictions|eat everything|no restriction)\b/.test(lower)) draft.diet = "none";

  const foundAllergies = allergens.filter((allergen) => lower.includes(allergen));
  if (foundAllergies.length) draft.allergies = [...new Set([...draft.allergies, ...foundAllergies])];
  if (/\b(no allergies|no allergy)\b/.test(lower)) draft.allergies = [];

  if (/\b(mild|not spicy|no spice)\b/.test(lower)) draft.spice = 0;
  if (/\bmedium spice|some spice|little heat\b/.test(lower)) draft.spice = 1;
  if (/\bspicy|hot|heat\b/.test(lower)) draft.spice = 2;
  if (/\bvery spicy|fiery|extra hot\b/.test(lower)) draft.spice = 3;

  if (/\b(light|snack|small)\b/.test(lower)) draft.appetite = "light";
  if (/\b(feast|hungry|big meal)\b/.test(lower)) draft.appetite = "feast";
  if (/\bnormal|proper meal\b/.test(lower)) draft.appetite = "normal";

  if (/\b(adventurous|surprise|new things)\b/.test(lower)) draft.adventure = 2;
  if (/\b(familiar|safe|classic)\b/.test(lower)) draft.adventure = 0;

  return validateProfile(draft, previousProfile ?? defaultProfile);
}

export async function extractProfile(input: ProfileExtractionInput): Promise<ProfileExtractionResponse> {
  const base = input.previousProfile ?? defaultProfile;
  const heuristic = heuristicProfileFromText(input.text, base);

  const ai = await chatCompletion({
    json: true,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Extract a diner profile as JSON only. Allowed diet: none, vegetarian, vegan, pescatarian, halal. Allowed allergies: gluten, shellfish, fish, dairy, egg, nuts. spice 0-3, adventure 0-2, appetite light/normal/feast. Use defaults when unclear."
      },
      {
        role: "user",
        content: JSON.stringify({ defaults: base, text: input.text })
      }
    ]
  });

  if (!ai) {
    return { profile: heuristic, source: "heuristic", warnings: [] };
  }

  const parsed = parseJsonObject<ProfileCandidate>(ai.content);
  if (!parsed) {
    return { profile: heuristic, source: "heuristic", warnings: ["Profile extraction returned invalid JSON; used deterministic fallback."] };
  }

  return { profile: validateProfile(parsed, base), source: ai.source, warnings: [] };
}
