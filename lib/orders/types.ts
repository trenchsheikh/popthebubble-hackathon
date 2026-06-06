import type { Allergen, Diet } from "@/lib/types";

export type OrderStatus = "new" | "seen" | "preparing" | "done";

export type OrderMessage = {
  id: string;
  from: "kitchen" | "diner";
  text: string;
  at: number;
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  conflicts: string[]; // safety flags for THIS diner on this dish (may be empty)
  requests: string[]; // per-item kitchen requests, e.g. "Less spice, please"
};

// What the kitchen sees about the diner. Allergens/diet always travel with an
// order (the kitchen needs them to cook safely); soft prefs are opt-in.
export type DinerCard = {
  diet: Diet;
  allergies: Allergen[];
  conflicts: { itemId: string; itemName: string; flags: string[] }[];
  softPrefs?: {
    spice: number;
    appetite: string;
    likes: string[];
    dislikes: string[];
  };
};

export type Order = {
  id: string;
  slug: string;
  restaurantName: string;
  tableLabel: string;
  dinerId: string;
  items: OrderItem[];
  total: number;
  note?: string;
  dinerCard: DinerCard;
  status: OrderStatus;
  channel: string; // how it reached the restaurant: "whatsapp" | "mock" | ...
  channelDetail: string;
  messages: OrderMessage[]; // two-way kitchen <-> diner thread
  createdAt: number;
};
