import type { Allergen, DinerProfile } from "@/lib/types";

export const allergens: { key: Allergen; label: string }[] = [
  { key: "gluten", label: "Gluten" },
  { key: "shellfish", label: "Shellfish" },
  { key: "fish", label: "Fish" },
  { key: "dairy", label: "Dairy" },
  { key: "egg", label: "Egg" },
  { key: "nuts", label: "Tree nuts" },
  { key: "peanuts", label: "Peanuts" },
  { key: "soy", label: "Soy" },
  { key: "sesame", label: "Sesame" },
  { key: "celery", label: "Celery" },
  { key: "mustard", label: "Mustard" },
  { key: "sulphites", label: "Sulphites" },
  { key: "lupin", label: "Lupin" },
  { key: "molluscs", label: "Molluscs" }
];

// Fast lookup for validating/filtering allergen tokens.
export const ALLERGEN_KEYS = new Set<Allergen>(allergens.map((a) => a.key));

export const defaultProfile: DinerProfile = {
  diet: "none",
  allergies: [],
  spice: 1,
  adventure: 1,
  appetite: "normal",
  likes: [],
  dislikes: [],
  memoryOptIn: true
};

export const dietOptions = [
  { key: "none", label: "No restriction" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "pescatarian", label: "Pescatarian" },
  { key: "halal", label: "Halal" }
] as const;

export const appetiteOptions = [
  { key: "light", label: "Light bite" },
  { key: "normal", label: "A proper meal" },
  { key: "feast", label: "Feast" }
] as const;

export const spiceOptions = ["Mild", "Medium", "Hot", "Fiery"] as const;
export const adventureOptions = ["Keep it familiar", "A little new", "Surprise me"] as const;
