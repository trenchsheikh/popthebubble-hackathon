import type { Allergen, ExclusionPolicy, MenuItem, MenuPhoto, Restaurant, Theme } from "@/lib/types";

// A single dish as captured in the onboarding form. Prices stay as strings
// while editing and are parsed at publish time.
export type DraftMenuItem = {
  id: string;
  name: string;
  category: string;
  price: string;
  spice: 0 | 1 | 2 | 3;
  vegetarian: boolean;
  vegan: boolean;
  contains: Allergen[];
  notes: string; // kitchen notes & exceptions (e.g. "can be made mild, contains traces of nuts")
  allowExclusions: boolean; // when policy is "some", does this dish allow swaps?
  removable: string; // comma-separated ingredients the kitchen will leave out
  photoDataUrl?: string;
};

export type RestaurantDraft = {
  name: string;
  username: string;
  cuisine: string;
  city: string;
  serviceStyle: string;
  welcomeLine: string;
  exclusionPolicy: ExclusionPolicy;
  menuPhotos: MenuPhoto[];
  items: DraftMenuItem[];
};

export const ALLERGEN_OPTIONS: { key: Allergen; label: string }[] = [
  { key: "gluten", label: "Gluten" },
  { key: "shellfish", label: "Shellfish" },
  { key: "fish", label: "Fish" },
  { key: "dairy", label: "Dairy" },
  { key: "egg", label: "Egg" },
  { key: "nuts", label: "Nuts" }
];

export const SPICE_LABELS = ["No heat", "Mild", "Medium", "Hot"] as const;

export const EXCLUSION_OPTIONS: { key: ExclusionPolicy; label: string; hint: string }[] = [
  { key: "none", label: "No changes", hint: "Dishes are served exactly as listed." },
  { key: "some", label: "Some dishes", hint: "Only dishes you flag can be customised." },
  { key: "all", label: "Any dish", hint: "Diners can ask to leave out ingredients anywhere." }
];

// Warm palette used to tint dish placeholders when no photo is supplied.
const DISH_HUES = ["#d6492f", "#c9a227", "#5c8043", "#3f6f8f", "#9a5b9e", "#cc6b49", "#4f8a8b", "#b5652f"];

const DEFAULT_THEME: Theme = {
  background: "#14110f",
  surface: "#221d19",
  surfaceRaised: "#2a2420",
  text: "#f2eae0",
  muted: "#a89a8c",
  accent: "#d6492f",
  accentSecondary: "#e06a45",
  gold: "#c9a227",
  fontDisplay: "Cormorant Garamond",
  fontBody: "Manrope"
};

let counter = 0;
export function draftId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(16).slice(2, 8)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function emptyDraftItem(): DraftMenuItem {
  return {
    id: draftId("item"),
    name: "",
    category: "",
    price: "",
    spice: 0,
    vegetarian: false,
    vegan: false,
    contains: [],
    notes: "",
    allowExclusions: false,
    removable: "",
    photoDataUrl: undefined
  };
}

export function emptyDraft(): RestaurantDraft {
  return {
    name: "",
    username: "",
    cuisine: "",
    city: "",
    serviceStyle: "",
    welcomeLine: "",
    exclusionPolicy: "some",
    menuPhotos: [],
    items: [emptyDraftItem()]
  };
}

export type DraftValidation = { ok: true } | { ok: false; message: string };

export function validateDraft(draft: RestaurantDraft): DraftValidation {
  if (!draft.name.trim()) return { ok: false, message: "Add your restaurant name." };
  if (!draft.username.trim()) return { ok: false, message: "Pick an owner username." };
  const named = draft.items.filter((item) => item.name.trim());
  if (named.length === 0) return { ok: false, message: "Add at least one dish." };
  for (const item of named) {
    if (!item.category.trim()) return { ok: false, message: `Give "${item.name}" a section.` };
    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) return { ok: false, message: `Check the price on "${item.name}".` };
  }
  return { ok: true };
}

function uniqueCategories(items: DraftMenuItem[]): string[] {
  const seen: string[] = [];
  for (const item of items) {
    const category = item.category.trim();
    if (category && !seen.includes(category)) seen.push(category);
  }
  return seen;
}

/**
 * Convert a validated draft into the persisted Restaurant + MenuItem entities.
 * `slug` is resolved by the caller (it may append a suffix to stay unique).
 */
export function draftToEntities(
  draft: RestaurantDraft,
  slug: string
): { restaurant: Restaurant; menu: MenuItem[] } {
  const restaurantId = slug;
  const named = draft.items.filter((item) => item.name.trim());

  const menu: MenuItem[] = named.map((item, index) => {
    const removable = item.removable
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const notes = item.notes.trim();
    return {
      id: `${slug}-${slugify(item.name) || `dish-${index + 1}`}`,
      restaurantId,
      name: item.name.trim(),
      category: item.category.trim(),
      price: Number(item.price) || 0,
      spice: item.spice,
      vegetarian: item.vegetarian || item.vegan,
      vegan: item.vegan,
      contains: item.contains,
      hue: DISH_HUES[index % DISH_HUES.length],
      blurb: notes ? notes.split(/[.\n]/)[0].slice(0, 80) : `${item.category.trim()} dish`,
      explainer: notes || `${item.name.trim()} — ${item.category.trim()}.`,
      imageUrl: item.photoDataUrl,
      available: true,
      tags: [item.vegan ? "vegan" : item.vegetarian ? "vegetarian" : "", item.spice > 1 ? "spicy" : ""].filter(Boolean),
      notes: notes || undefined,
      allowExclusions: draft.exclusionPolicy === "all" ? true : draft.exclusionPolicy === "some" ? item.allowExclusions : false,
      removable: removable.length ? removable : undefined
    };
  });

  const restaurant: Restaurant = {
    id: restaurantId,
    slug,
    name: draft.name.trim(),
    shortName: draft.name.trim().split(/\s+/)[0],
    cuisine: draft.cuisine.trim() || "Restaurant",
    city: draft.city.trim() || "",
    serviceStyle: draft.serviceStyle.trim() || "Dining room",
    tableLabel: "Table 1",
    welcomeLine: draft.welcomeLine.trim() || `Welcome to ${draft.name.trim()}.`,
    tone: "",
    theme: DEFAULT_THEME,
    categories: uniqueCategories(named),
    ownerUsername: draft.username.trim(),
    exclusionPolicy: draft.exclusionPolicy
  };

  return { restaurant, menu };
}
