export type Diet = "none" | "vegetarian" | "vegan" | "pescatarian" | "halal";
export type Appetite = "light" | "normal" | "feast";
export type Allergen = "gluten" | "shellfish" | "fish" | "dairy" | "egg" | "nuts";

// Whether a restaurant lets diners ask for ingredient exclusions / swaps.
// "none" = no changes, "some" = only on dishes flagged per-item, "all" = any dish.
export type ExclusionPolicy = "none" | "some" | "all";

// An uploaded snapshot of a physical/printed menu, kept as a reference image.
export type MenuPhoto = {
  id: string;
  name: string;
  dataUrl: string;
};

export type Hotspot = {
  id: string;
  x: number; // 0..1, horizontal position within the square dish box
  y: number; // 0..1, vertical position within the square dish box
  label: string; // ingredient or feature name
  note: string; // short taste / what-it-is description (<= ~12 words)
  allergen?: Allergen; // optional allergen flag tied to this part of the dish
  macroUrl?: string; // optional close-up image shown in the hotspot pop-up
};

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
  ownerUsername?: string; // restaurant-owner handle captured at onboarding
  exclusionPolicy?: ExclusionPolicy; // menu-wide default for ingredient exclusions
  lat?: number; // venue latitude — used to find nearby post-dinner events
  lng?: number; // venue longitude
  eventCutPct?: number; // restaurant's share of an event referral commission (0..1); defaults to DEFAULT_EVENT_COMMISSION_PCT
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
  clips?: string[]; // ordered short clips (1-2s each) played as a cinematic loop in the hero
  videoUrl?: string; // single pre-edited cinematic video (alternative to clips)
  available: boolean;
  tags: string[];
  hotspots?: Hotspot[];
  steam?: boolean; // Tier 2: render a parallaxed steam layer over the dish (hot dishes)
  notes?: string; // kitchen notes / exceptions surfaced to diners (e.g. "can be made mild")
  allowExclusions?: boolean; // per-dish override when the restaurant policy is "some"
  removable?: string[]; // ingredients the kitchen will leave out on request
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
