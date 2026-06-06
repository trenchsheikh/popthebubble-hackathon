export type Diet = "none" | "vegetarian" | "vegan" | "pescatarian" | "halal";
export type Appetite = "light" | "normal" | "feast";
export type Allergen = "gluten" | "shellfish" | "fish" | "dairy" | "egg" | "nuts";

export type Theme = {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  muted: string;
  accent: string;
  accentSecondary: string;
  gold: string;
  fontDisplay: string;
  fontBody: string;
};

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  cuisine: string;
  city: string;
  serviceStyle: string;
  tableLabel: string;
  welcomeLine: string;
  tone: string;
  theme: Theme;
  categories: string[];
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  nativeName?: string;
  category: string;
  price: number;
  spice: 0 | 1 | 2 | 3;
  vegetarian: boolean;
  vegan: boolean;
  contains: string[];
  hue: string;
  blurb: string;
  explainer: string;
  imageUrl?: string;
  modelUrl?: string;
  available: boolean;
  tags: string[];
};

export type DinerProfile = {
  diet: Diet;
  allergies: Allergen[];
  spice: 0 | 1 | 2 | 3;
  adventure: 0 | 1 | 2;
  appetite: Appetite;
  likes: string[];
  dislikes: string[];
  memoryOptIn: boolean;
};

export type Session = {
  dinerId: string;
  runId: string;
  restaurantId: string;
  tableLabel: string;
  returning: boolean;
  memoryFacts: MemoryFact[];
};

export type MemoryFact = {
  id: string;
  text: string;
  kind: "preference" | "allergy" | "dish_history" | "context";
  confidence: number;
};

export type Recommendation = {
  id: string;
  reason: string;
};

export type RecommendationResponse = {
  intro: string;
  picks: Recommendation[];
  source: "heuristic" | "fireworks" | "mock";
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type EventKind = "view" | "dwell" | "ask" | "order" | "rate" | "profile_update";
