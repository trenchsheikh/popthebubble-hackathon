import { allergens } from "@/lib/profile";
import type { DinerProfile, MenuItem } from "@/lib/types";

function label(token: string) {
  return allergens.find((allergen) => allergen.key === token)?.label.toLowerCase() ?? token;
}

export function conflicts(dish: MenuItem, profile: DinerProfile): string[] {
  const out: string[] = [];
  const contains = dish.contains;
  const has = (...tokens: string[]) => tokens.some((token) => contains.includes(token));

  for (const allergy of profile.allergies) {
    if (contains.includes(allergy)) {
      out.push(`Contains ${label(allergy)}`);
    }
  }

  if (profile.diet === "vegetarian" && has("fish", "shellfish", "pork", "chicken", "beef", "lamb")) {
    out.push("Not vegetarian");
  }
  if (profile.diet === "vegan" && has("fish", "shellfish", "pork", "chicken", "beef", "lamb", "dairy", "egg")) {
    out.push("Not vegan");
  }
  if (profile.diet === "pescatarian" && has("pork", "chicken", "beef", "lamb")) {
    out.push("Has meat");
  }
  if (profile.diet === "halal" && has("pork")) {
    out.push("Contains pork");
  }

  return [...new Set(out)];
}
