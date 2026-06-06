"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { MenuItem } from "@/lib/types";

export type Locale = "en" | "ja";

const STORAGE_KEY = "tavo:locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en") setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setLocaleState((current) => {
      const next = current === "en" ? "ja" : "en";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ locale, setLocale, toggle }), [locale, setLocale, toggle]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  // Fallback keeps components usable outside a provider (e.g. tests): English, no-op setters.
  return ctx ?? { locale: "en", setLocale: () => {}, toggle: () => {} };
}

// Translate a UI string by its English source text. Missing entries fall back to
// the English string, so partial coverage never breaks the UI.
export function useT(): (en: string) => string {
  const { locale } = useLocale();
  return useCallback(
    (en: string) => {
      if (locale === "en") return en;
      return UI_JA[en] ?? en;
    },
    [locale]
  );
}

// ── Dynamic content helpers (dishes / categories) ──────────────
export function categoryLabel(category: string, locale: Locale): string {
  if (locale === "en") return category;
  return CATEGORY_JA[category] ?? category;
}

export function dishName(dish: MenuItem, locale: Locale): string {
  if (locale === "ja") return dish.nativeName?.trim() || dish.name;
  return dish.name;
}

export function dishBlurb(dish: MenuItem, locale: Locale): string {
  if (locale === "ja") return DISH_JA[dish.id]?.blurb ?? dish.blurb;
  return dish.blurb;
}

export function dishExplainer(dish: MenuItem, locale: Locale): string {
  if (locale === "ja") return DISH_JA[dish.id]?.explainer ?? dish.explainer;
  return dish.explainer;
}

// ── Menu categories ────────────────────────────────────────────
const CATEGORY_JA: Record<string, string> = {
  "Small plates": "小皿",
  Sushi: "寿司",
  "Big bowls": "大きな丼",
  Sweet: "デザート"
};

// ── Hinoki demo dish copy (names come from nativeName) ──────────
const DISH_JA: Record<string, { blurb: string; explainer: string }> = {
  edamame: {
    blurb: "塩茹での枝豆、海塩がけ。",
    explainer: "さやごと温かく提供。歯で豆を押し出して食べます。軽く塩気のある、定番の居酒屋スターター。"
  },
  gyoza: {
    blurb: "豚肉とキャベツの焼き餃子、底はパリッと。",
    explainer: "薄皮の餃子を片面だけ平らに焼き、底はカリッと、上はやわらか。酢醤油でどうぞ。"
  },
  karaage: {
    blurb: "下味付き唐揚げ、生姜とにんにく、レモン添え。",
    explainer: "日本式のフライドチキン。鶏もも肉を醤油・生姜・にんにくに漬け、軽い衣で揚げています。ジューシーで重くない。"
  },
  agedashi: {
    blurb: "絹ごし豆腐を軽く揚げ、温かい出汁で。",
    explainer: "やわらかい豆腐を薄い衣で揚げ、旨みのある出汁に。出汁は鰹（魚）からとっているため、ベジタリアン対応ではありません。"
  },
  "salmon-nigiri": {
    blurb: "2貫、新鮮なサーモンを酢飯の上に。",
    explainer: "酢飯の上に生のサーモンをのせた握り。すっきりとして濃厚、寿司の入門に最適です。"
  },
  "spicy-tuna": {
    blurb: "マグロ、チリマヨ、きゅうり、ごま。",
    explainer: "巻き寿司：マグロときゅうりを酢飯と海苔で巻き、チリマヨで和えています。ほどよい辛さでクリーミー。"
  },
  uni: {
    blurb: "北海道産の雲丹を酢飯にのせ、海苔で巻いて。",
    explainer: "雲丹はウニの生殖巣。やわらかくクリーミーで、濃厚な磯の風味。冒険派におすすめの珍味です。"
  },
  tonkotsu: {
    blurb: "豚骨スープ、チャーシュー、半熟卵、青ねぎ。",
    explainer: "豚骨を何時間も煮込んだ濃厚でミルキーなスープのラーメン。チャーシューと半熟卵をのせた、定番の一杯。"
  },
  "veg-tempura": {
    blurb: "季節の野菜、軽い衣の天ぷら。",
    explainer: "野菜を軽くサクサクの衣でさっと揚げています。温かい天つゆでどうぞ。脂っぽくなく軽やか。"
  },
  "matcha-cheesecake": {
    blurb: "焼き抹茶チーズケーキ、黒蜜がけ。",
    explainer: "石臼挽きの抹茶を練り込んだ焼きチーズケーキ。ほろ苦さと甘いクリームのバランスを、黒蜜で仕上げています。"
  }
};

// ── UI strings (English source → Japanese) ─────────────────────
const UI_JA: Record<string, string> = {
  // Tabs
  Menu: "メニュー",
  Chat: "チャット",
  Events: "イベント",
  // Welcome
  "Personalize my menu": "メニューをカスタマイズ",
  "Diet, allergies, spice, appetite · under a minute": "食事制限・アレルギー・辛さ・食欲 · 約1分",
  "Start with safety": "安心第一で始める",
  "Conflicts stay visible and are never model-guessed": "アレルギー等の注意は常に表示され、AIの推測ではありません",
  "Tokyo Izakaya": "東京 居酒屋",
  "Charcoal, sushi, and a bowl that remembers you.": "炭火、寿司、そしてあなたを覚えている一杯。",
  "Tell us the constraints once, then browse a menu that explains itself.":
    "一度だけ条件を教えてください。あとは自分で説明するメニューをご覧いただけます。",
  "Anonymous diner session": "匿名のお客様セッション",
  "memory can be cleared anytime": "メモリーはいつでも消去できます",
  // Profile / onboarding
  Reset: "リセット",
  Back: "戻る",
  Next: "次へ",
  "Show my menu": "メニューを見る",
  Continue: "続ける",
  "will use this for tonight's menu": "が今夜のメニューに活用します",
  "Anything you do not eat?": "食べられないものはありますか？",
  "Any allergies to lock out?": "除外したいアレルギーは？",
  "How much heat do you like?": "辛さはどのくらいがお好み？",
  "Familiar, or feeling brave?": "定番派？それとも冒険派？",
  "How hungry are you?": "どのくらい空いていますか？",
  "Should we remember this?": "この内容を覚えておきますか？",
  "No restriction": "制限なし",
  Vegetarian: "ベジタリアン",
  Vegan: "ヴィーガン",
  Pescatarian: "ペスカタリアン",
  Halal: "ハラル",
  "None of these": "どれも該当しない",
  Gluten: "グルテン",
  Shellfish: "甲殻類",
  Fish: "魚",
  Dairy: "乳製品",
  Egg: "卵",
  Nuts: "ナッツ",
  Mild: "控えめ",
  Medium: "普通",
  Hot: "辛口",
  Fiery: "激辛",
  "no heat": "辛さなし",
  "Keep it familiar": "定番で",
  "A little new": "少し新しく",
  "Surprise me": "おまかせで",
  "Light bite": "軽め",
  "A proper meal": "しっかり一食",
  Feast: "たっぷり",
  "Remember your tastes across restaurants?": "あなたの好みを、訪れるお店すべてで覚えますか？",
  "Your preferences are stored to your private device key with Mubit and recalled at every restaurant you visit. Switch it off and nothing is kept.":
    "あなたの好みはMubitであなた専用のデバイスキーに保存され、訪れるどのお店でも呼び出されます。オフにすれば何も保存されません。",
  "Remember me across restaurants": "お店をまたいで覚える",
  On: "オン",
  Off: "オフ",
  // Menu chrome
  "For you": "あなたへ",
  "Three safe places to start": "まずはこの3品から",
  "Hide conflicts": "注意を隠す",
  "Show conflicts": "注意を表示",
  "Full menu": "全メニュー",
  "Browse by section": "セクションから選ぶ",
  "Memory preview": "メモリープレビュー",
  "Your profile": "あなたのプロフィール",
  "allergy locks": "アレルギー除外",
  Table: "テーブル",
  "Welcome back to": "おかえりなさい —",
  "Charcoal & sushi counter": "炭火と寿司カウンター",
  "Plans after dinner?": "食事のあとの予定は？",
  "Comedy, live music & more nearby — booked in a tap": "近くのお笑い・ライブ音楽など、タップで予約。",
  Heuristic: "ヒューリスティック",
  "You came back to this kind of dish before.": "以前もこの系統の料理を選ばれています。",
  "It brings the heat you asked for.": "ご希望の辛さがあります。",
  "It fits you cleanly without swaps.": "変更なしでそのままお楽しみいただけます。",
  "It keeps things vegetarian and satisfying.": "ベジタリアンで満足感があります。",
  "Bright enough to keep tonight light.": "軽めの夜にちょうどよい一品。",
  "It has the weight for a proper feast.": "しっかり食べたい時にぴったり。",
  "A bolder pick without going off-piste.": "冒険しすぎない、少し大胆な一品。",
  "A strong fit for your current preferences.": "今の好みによく合っています。",
  // Dish detail
  Ask: "質問する",
  "Add to basket": "かごに追加",
  "Added to basket": "追加しました",
  "Add to order": "注文に追加",
  "Added to order": "追加しました",
  "in basket": "かご内",
  Reduce: "減らす",
  Add: "追加",
  "Ask about this dish": "この料理について質問",
  "No conflicts with your saved profile.": "保存中のプロフィールと問題はありません。",
  "Tap the dots to explore what is in it": "点をタップして中身を見る",
  "Swipe up for more": "上にスワイプでもっと見る",
  "Add (adjusted)": "追加（調整あり）",
  // Nudges (static)
  "Request less spice": "辛さ控えめにする",
  "Less spice, please": "辛さ控えめでお願いします",
  "Ask for extra heat": "もっと辛くする",
  "Extra spicy, please": "もっと辛くしてください",
  "You weren't keen on this last time — sure you want it again?": "前回はお気に召さなかったようです。もう一度試しますか？",
  "One of your favourites — nice choice.": "お気に入りの一品 — いい選択です。",
  // Dish image hotspots (ingredient pop-ups)
  "Soybean pods": "枝豆のさや",
  "Pop the warm beans straight from the pod — nutty, lightly salted.": "温かい豆をさやから直接どうぞ — ナッツのような風味で、ほんのり塩味。",
  "Flaked sea salt": "海塩フレーク",
  "Crunchy salt flakes for a clean savoury hit.": "サクッとした塩フレークで、すっきりとした塩気。",
  "Crisp base": "パリッとした底",
  "Pan-fried flat so the underside turns lacy and crunchy.": "片面を平らに焼き、底はレース状にカリッと。",
  "Pork & cabbage": "豚肉とキャベツ",
  "Juicy seasoned pork with sweet cabbage inside.": "ジューシーな味付け豚肉と甘いキャベツが中に。",
  "Vinegar-soy dip": "酢醤油だれ",
  "Tangy, salty dip that cuts the richness.": "酸味と塩気でコクを引き締めるたれ。",
  "Crackly crust": "サクサクの衣",
  "Light potato-starch batter, shatteringly crisp.": "片栗粉の軽い衣で、サクサクの食感。",
  "Marinated thigh": "下味付きもも肉",
  "Soy, ginger and garlic marinade keeps it juicy.": "醤油・生姜・にんにくの下味でジューシーに。",
  "Charred lemon": "焼きレモン",
  "Squeeze over for a bright lift.": "搾って、爽やかなアクセントに。",
  "Silken tofu": "絹ごし豆腐",
  "Soft, custardy tofu in a thin crisp shell.": "薄いサクッとした衣の中に、なめらかな豆腐。",
  "Bonito dashi": "鰹出汁",
  "Savoury broth made with fish — so not vegetarian.": "魚からとった旨みのある出汁 — ベジタリアン対応ではありません。",
  "Grated daikon": "大根おろし",
  "Fresh, peppery radish to lighten the broth.": "ピリッとした大根で出汁を軽やかに。",
  "Fresh salmon": "新鮮なサーモン",
  "Buttery, clean slice of raw salmon.": "バターのように濃厚で、すっきりした生サーモン。",
  "Vinegared rice": "酢飯",
  "Lightly seasoned sushi rice at body temperature.": "ほんのり味付けした、人肌の酢飯。",
  "Cool, seasoned rice base.": "冷たく味付けした酢飯の土台。",
  Wasabi: "わさび",
  "A dab between fish and rice for gentle heat.": "ネタとシャリの間に少々、ほのかな辛み。",
  Tuna: "マグロ",
  "Diced raw tuna, lean and mild.": "角切りの生マグロ、赤身でまろやか。",
  "Chilli mayo": "チリマヨ",
  "Creamy, gently spicy binder.": "クリーミーでほんのり辛いソース。",
  "Nori & rice": "海苔と酢飯",
  "Seaweed and rice wrap holding the roll.": "巻きをまとめる海苔とご飯。",
  "Sea urchin (uni)": "ウニ（雲丹）",
  "Custardy, briny and intensely rich — the delicacy.": "クリーミーで磯の風味、濃厚な珍味。",
  "Nori band": "海苔の帯",
  "Toasted seaweed strap holding it together.": "全体をまとめる、炙った海苔の帯。",
  "Pork-bone broth": "豚骨スープ",
  "Milky, collagen-rich broth simmered from pork bones for hours.": "豚骨を何時間も煮込んだ、コラーゲン豊富でミルキーなスープ。",
  "Ramen noodles": "ラーメンの麺",
  "Springy wheat noodles.": "コシのある小麦麺。",
  "Chashu pork": "チャーシュー",
  "Braised, melting pork belly.": "とろけるように煮込んだ豚バラ肉。",
  "Soft egg": "半熟卵",
  "Jammy, marinated yolk.": "とろりと味付けした半熟の黄身。",
  "Tempura batter": "天ぷらの衣",
  "Airy, crackly wheat batter, fried light.": "軽くサクサクの小麦衣で、さっと揚げて。",
  "Seasonal veg": "季節の野菜",
  "Sweet potato, pepper, mushroom and shiso.": "さつまいも、ピーマン、きのこ、大葉。",
  "Tentsuyu dip": "天つゆ",
  "Warm dashi-soy dipping sauce.": "温かい出汁醤油のつけだれ。",
  Matcha: "抹茶",
  "Stone-ground green tea — gently bitter.": "石臼挽きの抹茶 — ほのかな苦み。",
  "Baked cheese": "焼きチーズ",
  "Rich, smooth baked cheesecake.": "濃厚でなめらかな焼きチーズケーキ。",
  Kuromitsu: "黒蜜",
  "Black-sugar syrup drizzle.": "黒糖シロップのドリズル。",
  "Biscuit base": "ビスケットの土台",
  "Buttery crumb base.": "バター風味のクラム生地。",
  // Chat
  "How can I help you order?": "ご注文のお手伝いをしましょうか？",
  "Ask anything about the menu — dietary fit, spice, pairings. Every answer stays grounded to tonight's dishes.":
    "メニューについて何でもどうぞ — 食事制限への適合、辛さ、組み合わせなど。回答は常に今夜の料理に基づいています。",
  "What should I start with?": "最初は何がおすすめ？",
  "Something light and not too spicy": "軽くて、辛すぎないもの",
  "What is the most popular dish?": "一番人気の料理は？",
  "Prefer a person? Talk to a human": "人と話したいですか？スタッフを呼ぶ",
  "I couldn't reach the menu service just now. Please try that again in a moment.":
    "ただ今メニューサービスに接続できませんでした。少し経ってからお試しください。",
  // Cart / basket
  "Review basket": "かごを確認",
  "Your basket": "あなたのかご",
  "Call waiter to order": "スタッフを呼んで注文",
  "Calling…": "呼んでいます…",
  "Your waiter is on the way": "スタッフが向かっています",
  "For the waiter:": "スタッフへ:",
  "Anything to tell your waiter? (optional)": "スタッフへの伝言があれば（任意）",
  Done: "完了",
  // Service dock
  "Call a waiter": "スタッフを呼ぶ",
  "A waiter has been notified": "スタッフに通知しました",
  "Someone is on their way to your table.": "スタッフがテーブルに向かっています。",
  "Waiter on the way…": "スタッフが向かっています…",
  "Call again": "もう一度呼ぶ",
  "Tap a reason (optional), then call a waiter over.": "理由を選び（任意）、スタッフを呼んでください。",
  "Ready to order": "注文の準備ができました",
  "Bill, please": "お会計をお願いします",
  "Allergy question": "アレルギーの質問",
  "Just need help": "お手伝いが必要です",
  // QR
  "Scan now": "今すぐスキャン",
  // Events
  "After dinner": "食事のあとに",
  "Make a night of it?": "夜を楽しみませんか？",
  "Who's coming?": "どなたと？",
  "What sounds good?": "気分は？",
  Budget: "予算",
  Easy: "気軽に",
  Standard: "標準",
  Treat: "贅沢に",
  "Just me": "ひとり",
  "Date night": "デート",
  "With friends": "友達と",
  Comedy: "お笑い",
  "Live music": "ライブ音楽",
  Nightlife: "ナイトライフ",
  Arts: "アート",
  Film: "映画",
  Sport: "スポーツ",
  "Arts & culture": "アート＆カルチャー",
  Event: "イベント",
  "Tell us in your words": "ご自由にお書きください",
  "e.g. something funny and low-key for two…": "例：二人で楽しめる、笑える気軽なもの…",
  "Reading…": "読み取り中…",
  "Use this": "これで探す",
  "Or just tell us →": "または言葉で伝える →",
  "Finding events…": "イベントを探しています…",
  "Find tonight's events": "今夜のイベントを探す",
  "Keep the night going": "夜をもっと楽しむ",
  "Tonight, near you": "今夜、近くで",
  "Exclusive for guests": "ご来店のお客様限定",
  "Get tickets": "チケットを入手",
  "Opening…": "開いています…",
  Opened: "開きました",
  "Free entry": "入場無料",
  from: "～",
  Tonight: "今夜",
  "Finding tonight's best nearby…": "近くの今夜のおすすめを探しています…",
  "Something went wrong": "問題が発生しました",
  "Try again": "もう一度",
  "Nothing nearby right now": "今のところ近くにありません",
  "We couldn't find events matching that. Try a different vibe.": "条件に合うイベントが見つかりませんでした。別の気分で試してみてください。",
  Adjust: "調整",
  "Adjust preferences": "条件を変更",
  "Scan to open the menu": "スキャンしてメニューを開く"
};
