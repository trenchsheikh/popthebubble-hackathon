import type { Hotspot, MenuItem, Restaurant } from "@/lib/types";

export const restaurants: Restaurant[] = [
  {
    id: "hinoki",
    slug: "hinoki",
    name: "Hinoki",
    shortName: "Hinoki",
    cuisine: "Tokyo Izakaya",
    city: "London",
    lat: 51.5142,
    lng: -0.1494,
    eventCutPct: 0.1,
    serviceStyle: "Charcoal & sushi counter",
    tableLabel: "Table 12",
    welcomeLine: "Charcoal, sushi, and a bowl that remembers you.",
    tone: "refined, moody, izakaya warmth",
    theme: {
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
    },
    categories: ["Small plates", "Sushi", "Big bowls", "Sweet"]
  }
];

const baseMenu: MenuItem[] = [
  {
    id: "edamame",
    restaurantId: "hinoki",
    name: "Edamame",
    nativeName: "枝豆",
    category: "Small plates",
    price: 5.5,
    spice: 0,
    vegetarian: true,
    vegan: true,
    contains: [],
    hue: "#caa64a",
    blurb: "Steamed young soybeans, flaked sea salt.",
    explainer: "Soybeans served warm in the pod — pop the beans out with your teeth. Light, savoury, the classic izakaya starter.",
    available: true,
    tags: ["classic", "vegan", "shareable"]
  },
  {
    id: "gyoza",
    restaurantId: "hinoki",
    name: "Pork Gyoza",
    nativeName: "餃子",
    category: "Small plates",
    price: 7.5,
    spice: 0,
    vegetarian: false,
    vegan: false,
    contains: ["gluten", "pork"],
    hue: "#c98a3a",
    blurb: "Pan-fried pork & cabbage dumplings, crisp base.",
    explainer: "Thin-skinned dumplings fried flat on one side, so they're crisp underneath and soft on top. Dip in vinegar-soy.",
    available: true,
    tags: ["comforting", "crisp", "shareable"]
  },
  {
    id: "karaage",
    restaurantId: "hinoki",
    name: "Chicken Karaage",
    nativeName: "唐揚げ",
    category: "Small plates",
    price: 8,
    spice: 1,
    vegetarian: false,
    vegan: false,
    contains: ["gluten", "chicken"],
    hue: "#c8842f",
    blurb: "Marinated fried chicken, ginger & garlic, lemon.",
    explainer: "Japanese fried chicken — thigh marinated in soy, ginger and garlic, lightly battered and fried. Juicy, never heavy.",
    available: true,
    tags: ["crowd-pleaser", "crisp", "protein"]
  },
  {
    id: "agedashi",
    restaurantId: "hinoki",
    name: "Agedashi Tofu",
    nativeName: "揚げ出し豆腐",
    category: "Small plates",
    price: 7,
    spice: 0,
    vegetarian: false,
    vegan: false,
    contains: ["fish"],
    hue: "#bf9a4a",
    blurb: "Silken tofu, light fry, warm dashi broth.",
    explainer: "Soft tofu in a thin crisp coating in a savoury broth. Note: the dashi is made from bonito (fish), so it isn't vegetarian here.",
    available: true,
    tags: ["delicate", "umami", "warm"]
  },
  {
    id: "salmon-nigiri",
    restaurantId: "hinoki",
    name: "Salmon Nigiri",
    nativeName: "サーモン",
    category: "Sushi",
    price: 6,
    spice: 0,
    vegetarian: false,
    vegan: false,
    contains: ["fish"],
    hue: "#cf6a52",
    blurb: "Two pieces, fresh salmon over seasoned rice.",
    explainer: "A slice of raw salmon pressed over a small mound of vinegared rice. Clean and buttery — the easiest way into sushi.",
    available: true,
    tags: ["fresh", "buttery", "easy-start"]
  },
  {
    id: "spicy-tuna",
    restaurantId: "hinoki",
    name: "Spicy Tuna Roll",
    nativeName: "辛口マグロ",
    category: "Sushi",
    price: 9,
    spice: 2,
    vegetarian: false,
    vegan: false,
    contains: ["fish", "gluten", "egg"],
    hue: "#cd5a48",
    blurb: "Tuna, chilli mayo, cucumber, sesame.",
    explainer: "A maki roll: tuna and cucumber rolled in rice and nori (seaweed), bound with a chilli-mayo. Mild heat, creamy.",
    available: true,
    tags: ["spicy", "creamy", "roll"]
  },
  {
    id: "uni",
    restaurantId: "hinoki",
    name: "Uni Nigiri",
    nativeName: "雲丹",
    category: "Sushi",
    price: 14,
    spice: 0,
    vegetarian: false,
    vegan: false,
    contains: ["shellfish"],
    hue: "#d08a3c",
    blurb: "Hokkaido sea urchin over rice, nori band.",
    explainer: "Uni is the roe of sea urchin — soft, custardy, intensely oceanic and rich. A real delicacy, and one for the adventurous.",
    available: true,
    tags: ["adventurous", "rich", "delicacy"]
  },
  {
    id: "tonkotsu",
    restaurantId: "hinoki",
    name: "Tonkotsu Ramen",
    nativeName: "豚骨ラーメン",
    category: "Big bowls",
    price: 14,
    spice: 1,
    vegetarian: false,
    vegan: false,
    contains: ["gluten", "pork", "egg"],
    hue: "#c47a33",
    blurb: "Pork-bone broth, chashu, soft egg, spring onion.",
    explainer: "Ramen in a rich, milky broth simmered from pork bones for hours, topped with braised pork (chashu) and a soft egg. The comfort bowl.",
    available: true,
    tags: ["comforting", "rich", "feast"]
  },
  {
    id: "veg-tempura",
    restaurantId: "hinoki",
    name: "Vegetable Tempura",
    nativeName: "野菜天ぷら",
    category: "Big bowls",
    price: 9,
    spice: 0,
    vegetarian: true,
    vegan: true,
    contains: ["gluten"],
    hue: "#9aab55",
    blurb: "Seasonal vegetables, feather-light batter.",
    explainer: "Vegetables in an airy, crackly batter, fried light and quick. Dip in the warm tentsuyu sauce. Crisp, never greasy.",
    available: true,
    tags: ["vegan", "crisp", "light"]
  },
  {
    id: "matcha-cheesecake",
    restaurantId: "hinoki",
    name: "Matcha Cheesecake",
    nativeName: "抹茶チーズ",
    category: "Sweet",
    price: 7,
    spice: 0,
    vegetarian: true,
    vegan: false,
    contains: ["gluten", "dairy", "egg"],
    hue: "#8fae5a",
    blurb: "Baked matcha cheesecake, black-sugar drizzle.",
    explainer: "A baked cheesecake folded with stone-ground green tea (matcha) — gently bitter against the sweet cream, finished with kuromitsu syrup.",
    available: true,
    tags: ["sweet", "matcha", "gentle"]
  }
];

// Tappable ingredient hotspots, by dish id. Coordinates are 0..1 within the
// square dish viewer; tuned for the placeholder plate and a good starting
// point for real photos (adjust per image once uploaded).
const hotspotsById: Record<string, Hotspot[]> = {
  edamame: [
    { id: "pods", x: 0.42, y: 0.46, label: "Soybean pods", note: "Pop the warm beans straight from the pod — nutty, lightly salted." },
    { id: "salt", x: 0.63, y: 0.62, label: "Flaked sea salt", note: "Crunchy salt flakes for a clean savoury hit." }
  ],
  gyoza: [
    { id: "base", x: 0.5, y: 0.62, label: "Crisp base", note: "Pan-fried flat so the underside turns lacy and crunchy.", allergen: "gluten" },
    { id: "filling", x: 0.4, y: 0.45, label: "Pork & cabbage", note: "Juicy seasoned pork with sweet cabbage inside." },
    { id: "dip", x: 0.7, y: 0.4, label: "Vinegar-soy dip", note: "Tangy, salty dip that cuts the richness." }
  ],
  karaage: [
    { id: "crust", x: 0.46, y: 0.5, label: "Crackly crust", note: "Light potato-starch batter, shatteringly crisp.", allergen: "gluten" },
    { id: "thigh", x: 0.5, y: 0.42, label: "Marinated thigh", note: "Soy, ginger and garlic marinade keeps it juicy." },
    { id: "lemon", x: 0.66, y: 0.63, label: "Charred lemon", note: "Squeeze over for a bright lift." }
  ],
  agedashi: [
    { id: "tofu", x: 0.44, y: 0.48, label: "Silken tofu", note: "Soft, custardy tofu in a thin crisp shell." },
    { id: "dashi", x: 0.6, y: 0.62, label: "Bonito dashi", note: "Savoury broth made with fish — so not vegetarian.", allergen: "fish" },
    { id: "daikon", x: 0.62, y: 0.4, label: "Grated daikon", note: "Fresh, peppery radish to lighten the broth." }
  ],
  "salmon-nigiri": [
    { id: "salmon", x: 0.5, y: 0.42, label: "Fresh salmon", note: "Buttery, clean slice of raw salmon.", allergen: "fish" },
    { id: "rice", x: 0.5, y: 0.62, label: "Vinegared rice", note: "Lightly seasoned sushi rice at body temperature." },
    { id: "wasabi", x: 0.66, y: 0.55, label: "Wasabi", note: "A dab between fish and rice for gentle heat." }
  ],
  "spicy-tuna": [
    { id: "tuna", x: 0.44, y: 0.45, label: "Tuna", note: "Diced raw tuna, lean and mild.", allergen: "fish" },
    { id: "mayo", x: 0.6, y: 0.5, label: "Chilli mayo", note: "Creamy, gently spicy binder.", allergen: "egg" },
    { id: "wrap", x: 0.5, y: 0.66, label: "Nori & rice", note: "Seaweed and rice wrap holding the roll.", allergen: "gluten", macroUrl: "/macros/nori.webp" }
  ],
  uni: [
    { id: "uni", x: 0.5, y: 0.45, label: "Sea urchin (uni)", note: "Custardy, briny and intensely rich — the delicacy.", allergen: "shellfish", macroUrl: "/macros/uni.webp" },
    { id: "nori", x: 0.5, y: 0.64, label: "Nori band", note: "Toasted seaweed strap holding it together.", macroUrl: "/macros/nori.webp" },
    { id: "rice", x: 0.63, y: 0.6, label: "Vinegared rice", note: "Cool, seasoned rice base." }
  ],
  tonkotsu: [
    { id: "broth", x: 0.38, y: 0.56, label: "Pork-bone broth", note: "Milky, collagen-rich broth simmered from pork bones for hours." },
    { id: "noodles", x: 0.4, y: 0.42, label: "Ramen noodles", note: "Springy wheat noodles.", allergen: "gluten" },
    { id: "chashu", x: 0.52, y: 0.5, label: "Chashu pork", note: "Braised, melting pork belly.", macroUrl: "/macros/chashu.webp" },
    { id: "egg", x: 0.64, y: 0.42, label: "Soft egg", note: "Jammy, marinated yolk.", allergen: "egg", macroUrl: "/macros/ramen-egg.webp" }
  ],
  "veg-tempura": [
    { id: "batter", x: 0.5, y: 0.48, label: "Tempura batter", note: "Airy, crackly wheat batter, fried light.", allergen: "gluten" },
    { id: "veg", x: 0.42, y: 0.56, label: "Seasonal veg", note: "Sweet potato, pepper, mushroom and shiso." },
    { id: "tentsuyu", x: 0.66, y: 0.6, label: "Tentsuyu dip", note: "Warm dashi-soy dipping sauce." }
  ],
  "matcha-cheesecake": [
    { id: "matcha", x: 0.45, y: 0.45, label: "Matcha", note: "Stone-ground green tea — gently bitter.", macroUrl: "/macros/matcha-powder.webp" },
    { id: "cheese", x: 0.5, y: 0.55, label: "Baked cheese", note: "Rich, smooth baked cheesecake.", allergen: "dairy" },
    { id: "kuromitsu", x: 0.64, y: 0.5, label: "Kuromitsu", note: "Black-sugar syrup drizzle." },
    { id: "base", x: 0.5, y: 0.67, label: "Biscuit base", note: "Buttery crumb base.", allergen: "gluten" }
  ]
};

// Hot dishes that get the Tier 2 parallaxed steam layer in the detail viewer.
const STEAM_DISHES = new Set(["tonkotsu", "agedashi", "karaage"]);

// Every dish id matches its image filename in /public/dishes.
export const menuItems: MenuItem[] = baseMenu.map((item) => ({
  ...item,
  imageUrl: `/dishes/${item.id}.webp`,
  steam: STEAM_DISHES.has(item.id),
  hotspots: hotspotsById[item.id] ?? []
}));
