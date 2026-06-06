"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Flame,
  Leaf,
  Plus,
  Replace,
  Rotate3D,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  UserRoundCheck,
  X
} from "lucide-react";
import { ChatComposer, ChatPanel, ChatTurn } from "@/components/ChatPanel";
import { Dish3D } from "@/components/Dish3D";
import { DishReels } from "@/components/feed/DishReels";
import { EventDiscovery } from "@/components/events/EventDiscovery";
import { useCart } from "@/components/cart/CartProvider";
import { conflicts } from "@/lib/conflicts";
import { formatPrice } from "@/lib/format";
import { appetiteOptions, defaultProfile, dietOptions, allergens, spiceOptions, adventureOptions } from "@/lib/profile";
import { heuristicRecommendations } from "@/lib/recommend";
import { useGroundedChat } from "@/lib/useGroundedChat";
import { useDinerMemory } from "@/lib/useDinerMemory";
import { recordEvent } from "@/lib/analytics-client";
import { useT, useLocale, categoryLabel, dishName, dishBlurb, dishExplainer } from "@/lib/i18n";
import type { DinerProfile, MemoryFact, MenuItem, Recommendation, Restaurant } from "@/lib/types";

type Stage = "welcome" | "onboarding" | "menu";
type MenuTab = "menu" | "chat" | "events";

const profileStorageKey = (slug: string) => `taste-passport:${slug}:profile`;
const dinerStorageKey = "taste-passport:diner-id";

// Atmosphere photography (Hinoki). Single-restaurant for now; move onto the
// restaurant record when the platform goes multi-venue.
const ambiance = {
  hero: "/scenes/izakaya-interior.webp",
  menu: "/scenes/embers.webp"
};

function createDinerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `diner_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const APPETITE_SUMMARY: Record<DinerProfile["appetite"], string> = {
  light: "Light bite",
  normal: "A proper meal",
  feast: "Feast"
};

function profileSummary(profile: DinerProfile, t: (en: string) => string) {
  const bits: string[] = [];
  if (profile.diet !== "none") bits.push(t(profile.diet.charAt(0).toUpperCase() + profile.diet.slice(1)));
  if (profile.allergies.length) bits.push(`${profile.allergies.length} ${t("allergy locks")}`);
  bits.push(t(spiceOptions[profile.spice]));
  bits.push(t(APPETITE_SUMMARY[profile.appetite]));
  return bits.join(" · ");
}

function inferMemoryFacts(profile: DinerProfile, returning: boolean): MemoryFact[] {
  if (!returning) return [];
  const facts: MemoryFact[] = [];
  if (profile.spice >= 2) {
    facts.push({ id: "spice", kind: "preference", text: "Enjoys spicy and bold dishes", confidence: 0.9 });
  }
  if (profile.appetite === "light") {
    facts.push({ id: "light", kind: "context", text: "Often prefers lighter plates and garden dishes", confidence: 0.7 });
  }
  if (profile.diet !== "none") {
    facts.push({ id: "diet", kind: "preference", text: `Usually eats ${profile.diet}`, confidence: 1 });
  }
  for (const allergy of profile.allergies) {
    facts.push({ id: `allergy-${allergy}`, kind: "allergy", text: `Must avoid ${allergy}`, confidence: 1 });
  }
  return facts;
}

export function DinerApp({ restaurant, menu }: { restaurant: Restaurant; menu: MenuItem[] }) {
  const { locale } = useLocale();
  const [stage, setStage] = useState<Stage>("welcome");
  const [dinerId, setDinerId] = useState("");
  const [returning, setReturning] = useState(false);
  const [profile, setProfile] = useState<DinerProfile>(defaultProfile);
  const [hideUnsafe, setHideUnsafe] = useState(false);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [tab, setTab] = useState<MenuTab>("menu");
  // A question queued from a dish's "Ask" button — the chat tab auto-sends it on
  // open so the dish artifact + a short LLM explanation load straight away.
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);

  useEffect(() => {
    const existingDinerId = window.localStorage.getItem(dinerStorageKey);
    const nextDinerId = existingDinerId ?? createDinerId();
    window.localStorage.setItem(dinerStorageKey, nextDinerId);
    setDinerId(nextDinerId);

    // Demo: every fresh load starts at the welcome/onboarding home so we can
    // show the customer-join flow — we don't auto-resume a returning session
    // straight into the menu. savedProfile still informs the scan analytics.
    const savedProfile = window.localStorage.getItem(profileStorageKey(restaurant.slug));

    // Diagnostics: record the QR scan (who, where, returning) — best-effort.
    recordEvent({
      type: "scan",
      dinerId: nextDinerId,
      restaurantId: restaurant.id,
      table: restaurant.tableLabel,
      returning: Boolean(savedProfile)
    });
  }, [restaurant.slug, restaurant.id, restaurant.tableLabel]);

  // Mubit memory loop: recalls this diner's durable, cross-restaurant memory and
  // exposes learn/consolidate. Best-effort — no-ops when Mubit is unconfigured.
  const { mubitFacts, learn, consolidate } = useDinerMemory({ dinerId, restaurantId: restaurant.id });
  const memoryFacts = useMemo(() => {
    const inferred = inferMemoryFacts(profile, returning);
    const seen = new Set(inferred.map((fact) => fact.id));
    return [...inferred, ...mubitFacts.filter((fact) => !seen.has(fact.id))];
  }, [mubitFacts, profile, returning]);
  const recommendations = useMemo(
    () => heuristicRecommendations({ menu, profile, restaurant, memoryFacts, returning }),
    [menu, profile, restaurant, memoryFacts, returning]
  );
  const recommendedItems = recommendations.picks
    .map((pick) => ({ pick, dish: menu.find((item) => item.id === pick.id) }))
    .filter((item): item is { pick: Recommendation; dish: MenuItem } => Boolean(item.dish));

  // Chat lives at the app level so the conversation survives tab switches.
  const chat = useGroundedChat({ restaurant, menu, profile, memoryFacts, locale });

  // A dish's "Ask" queues a question; send it once the chat owns it.
  useEffect(() => {
    if (pendingAsk) {
      chat.send(pendingAsk);
      setPendingAsk(null);
    }
  }, [pendingAsk, chat]);

  function completeOnboarding(nextProfile: DinerProfile) {
    setProfile(nextProfile);
    window.localStorage.setItem(profileStorageKey(restaurant.slug), JSON.stringify(nextProfile));
    setReturning(false);
    setStage("menu");
    // Persist the diner's stated preferences as durable, cross-restaurant memory
    // (Mubit, keyed by the device token) — only when they've opted in.
    if (nextProfile.memoryOptIn) {
      void learn(inferMemoryFacts(nextProfile, true));
    }
    recordEvent({
      type: "onboarding_complete",
      dinerId,
      restaurantId: restaurant.id,
      metadata: { diet: nextProfile.diet, allergies: nextProfile.allergies.length, spice: nextProfile.spice }
    });
  }

  function resetProfile() {
    // Session end — distill this visit into long-term memory before clearing.
    void consolidate();
    window.localStorage.removeItem(profileStorageKey(restaurant.slug));
    setProfile(defaultProfile);
    setReturning(false);
    setTab("menu");
    setStage("welcome");
  }

  return (
    <main
      className="app-shell"
      data-tab={stage === "menu" ? tab : "menu"}
      style={
        {
          "--bg": restaurant.theme.background,
          "--surface": restaurant.theme.surface,
          "--surface-raised": restaurant.theme.surfaceRaised,
          "--ink": restaurant.theme.text,
          "--muted": restaurant.theme.muted,
          "--accent": restaurant.theme.accent,
          "--accent-2": restaurant.theme.accentSecondary,
          "--gold": restaurant.theme.gold
        } as React.CSSProperties
      }
    >
      {stage === "welcome" && (
        <Welcome restaurant={restaurant} dinerId={dinerId} onStart={() => setStage("onboarding")} />
      )}

      {stage === "onboarding" && (
        <Onboarding restaurant={restaurant} initialProfile={profile} onBack={() => setStage("welcome")} onDone={completeOnboarding} />
      )}

      {stage === "menu" && (
        <section className="menu-screen">
          <MenuTabs
            tab={tab}
            onTab={(next) => {
              if (next === "chat" && tab !== "chat") {
                recordEvent({ type: "open_chat", dinerId, restaurantId: restaurant.id });
              }
              if (next === "events" && tab !== "events") {
                recordEvent({ type: "open_events", dinerId, restaurantId: restaurant.id });
              }
              setTab(next);
            }}
          />
          {tab === "menu" && (
            <MenuExperience
              restaurant={restaurant}
              menu={menu}
              profile={profile}
              recommendations={recommendations}
              recommendedItems={recommendedItems}
              memoryFacts={memoryFacts}
              returning={returning}
              hideUnsafe={hideUnsafe}
              setHideUnsafe={setHideUnsafe}
              setSelected={setSelected}
              resetProfile={resetProfile}
              onOpenEvents={() => {
                recordEvent({ type: "open_events", dinerId, restaurantId: restaurant.id });
                setTab("events");
              }}
            />
          )}
          {tab === "chat" && (
            <ChatPanel
              restaurant={restaurant}
              menu={menu}
              profile={profile}
              recommendedItems={recommendedItems}
              onOpenDish={setSelected}
              chat={chat}
            />
          )}
          {tab === "events" && (
            <EventDiscovery
              restaurant={restaurant}
              dinerId={dinerId}
              memoryFacts={memoryFacts}
              embedded
            />
          )}
        </section>
      )}

      {selected && (
        <DishReels
          dishes={menu}
          startId={selected.id}
          profile={profile}
          onClose={() => setSelected(null)}
          onAsk={(dish) => {
            recordEvent({ type: "open_chat", dinerId, restaurantId: restaurant.id });
            setSelected(null);
            setPendingAsk(
              locale === "ja"
                ? `${dishName(dish, "ja")}とは何ですか？初めての人にも分かるよう、短く簡単に説明してください。`
                : `What is the ${dish.name}? Give a short, simple explanation a first-timer would understand.`
            );
            setTab("chat");
          }}
        />
      )}

    </main>
  );
}

function MenuTabs({ tab, onTab }: { tab: MenuTab; onTab: (tab: MenuTab) => void }) {
  const t = useT();
  return (
    <div className="menu-tabs" role="tablist" aria-label="Menu, chat and events">
      <span className="menu-tabs-indicator" data-tab={tab} aria-hidden />
      <button
        role="tab"
        aria-selected={tab === "menu"}
        className={`menu-tab ${tab === "menu" ? "active" : ""}`}
        onClick={() => onTab("menu")}
      >
        <UtensilsCrossed size={16} />
        {t("Menu")}
      </button>
      <button
        role="tab"
        aria-selected={tab === "chat"}
        className={`menu-tab ${tab === "chat" ? "active" : ""}`}
        onClick={() => onTab("chat")}
      >
        <Sparkles size={16} />
        {t("Chat")}
      </button>
      <button
        role="tab"
        aria-selected={tab === "events"}
        className={`menu-tab ${tab === "events" ? "active" : ""}`}
        onClick={() => onTab("events")}
      >
        <Ticket size={16} />
        {t("Events")}
      </button>
    </div>
  );
}

function Welcome({ restaurant, dinerId, onStart }: { restaurant: Restaurant; dinerId: string; onStart: () => void }) {
  const t = useT();
  return (
    <section className="screen welcome-screen">
      <div className="welcome-bg" aria-hidden>
        <img src={ambiance.hero} alt="" draggable={false} />
      </div>
      <div className="welcome-hero">
        <p className="eyebrow">{t(restaurant.cuisine)}</p>
        <h1>{restaurant.name}</h1>
        <p>{t(restaurant.welcomeLine)} {t("Tell us the constraints once, then browse a menu that explains itself.")}</p>
      </div>
      <div className="welcome-actions">
        <button className="action-card primary-action" onClick={onStart}>
          <span className="icon-disc"><Sparkles size={20} /></span>
          <span>
            <strong>{t("Personalize my menu")}</strong>
            <small>{t("Diet, allergies, spice, appetite · under a minute")}</small>
          </span>
          <ChevronRight size={20} />
        </button>
        <button className="action-card secondary-action" onClick={onStart}>
          <span className="icon-disc"><ShieldCheck size={20} /></span>
          <span>
            <strong>{t("Start with safety")}</strong>
            <small>{t("Conflicts stay visible and are never model-guessed")}</small>
          </span>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="welcome-footer">
        <UserRoundCheck size={14} />
        {t("Anonymous diner session")} {dinerId ? dinerId.slice(0, 8) : "loading"} · {t("memory can be cleared anytime")}
      </div>
    </section>
  );
}

function Onboarding({
  restaurant,
  initialProfile,
  onBack,
  onDone
}: {
  restaurant: Restaurant;
  initialProfile: DinerProfile;
  onBack: () => void;
  onDone: (profile: DinerProfile) => void;
}) {
  const t = useT();
  const steps = ["diet", "allergies", "spice", "adventure", "appetite", "memory"] as const;
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<DinerProfile>(initialProfile);
  const step = steps[index];
  const finalStep = index === steps.length - 1;

  function next() {
    if (finalStep) onDone(draft);
    else setIndex((current) => current + 1);
  }

  function back() {
    if (index === 0) onBack();
    else setIndex((current) => current - 1);
  }

  return (
    <section className="screen onboard-screen">
      <div className="topbar">
        <button className="icon-button" onClick={back} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="progress-dots" aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((item, dotIndex) => (
            <span key={item} className={dotIndex <= index ? "active" : ""} />
          ))}
        </div>
        <span className="step-count">{index + 1}/{steps.length}</span>
      </div>

      <div className="question-block">
        <p className="eyebrow">{restaurant.shortName} {t("will use this for tonight's menu")}</p>
        <h2>{t(questionFor(step))}</h2>
      </div>

      {step === "diet" && (
        <div className="choice-grid">
          {dietOptions.map((option) => (
            <button
              key={option.key}
              className={`choice ${draft.diet === option.key ? "selected" : ""}`}
              onClick={() => setDraft((current) => ({ ...current, diet: option.key }))}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      )}

      {step === "allergies" && (
        <div className="choice-grid">
          {allergens.map((allergen) => {
            const selected = draft.allergies.includes(allergen.key);
            return (
              <button
                key={allergen.key}
                className={`choice ${selected ? "selected" : ""}`}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    allergies: selected
                      ? current.allergies.filter((item) => item !== allergen.key)
                      : [...current.allergies, allergen.key]
                  }))
                }
              >
                {selected && <Check size={15} />}
                {t(allergen.label)}
              </button>
            );
          })}
          <button className={`choice wide ${draft.allergies.length === 0 ? "selected" : ""}`} onClick={() => setDraft((current) => ({ ...current, allergies: [] }))}>
            {t("None of these")}
          </button>
        </div>
      )}

      {step === "spice" && (
        <div className="choice-stack">
          {spiceOptions.map((option, spiceIndex) => (
            <button
              key={option}
              className={`choice row ${draft.spice === spiceIndex ? "selected" : ""}`}
              onClick={() => setDraft((current) => ({ ...current, spice: spiceIndex as DinerProfile["spice"] }))}
            >
              <span>{t(option)}</span>
              <span className="flame-row">
                {spiceIndex === 0 ? t("no heat") : Array.from({ length: spiceIndex }).map((_, flameIndex) => <Flame key={flameIndex} size={14} />)}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "adventure" && (
        <div className="choice-stack">
          {adventureOptions.map((option, adventureIndex) => (
            <button
              key={option}
              className={`choice row ${draft.adventure === adventureIndex ? "selected" : ""}`}
              onClick={() => setDraft((current) => ({ ...current, adventure: adventureIndex as DinerProfile["adventure"] }))}
            >
              {t(option)}
            </button>
          ))}
        </div>
      )}

      {step === "appetite" && (
        <div className="choice-stack">
          {appetiteOptions.map((option) => (
            <button
              key={option.key}
              className={`choice row ${draft.appetite === option.key ? "selected" : ""}`}
              onClick={() => setDraft((current) => ({ ...current, appetite: option.key }))}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      )}

      {step === "memory" && (
        <div className="memory-consent">
          <ShieldCheck size={28} />
          <h3>{t("Remember your tastes across restaurants?")}</h3>
          <p>{t("Your preferences are stored to your private device key with Mubit and recalled at every restaurant you visit. Switch it off and nothing is kept.")}</p>
          <button
            className={`toggle-row ${draft.memoryOptIn ? "selected" : ""}`}
            onClick={() => setDraft((current) => ({ ...current, memoryOptIn: !current.memoryOptIn }))}
          >
            <span>{t("Remember me across restaurants")}</span>
            <span>{draft.memoryOptIn ? t("On") : t("Off")}</span>
          </button>
        </div>
      )}

      <button className="primary-button docked-button" onClick={next}>
        {finalStep ? t("Show my menu") : t("Next")}
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

function MenuExperience({
  restaurant,
  menu,
  profile,
  recommendations,
  recommendedItems,
  memoryFacts,
  returning,
  hideUnsafe,
  setHideUnsafe,
  setSelected,
  resetProfile,
  onOpenEvents
}: {
  restaurant: Restaurant;
  menu: MenuItem[];
  profile: DinerProfile;
  recommendations: ReturnType<typeof heuristicRecommendations>;
  recommendedItems: { pick: Recommendation; dish: MenuItem }[];
  memoryFacts: MemoryFact[];
  returning: boolean;
  hideUnsafe: boolean;
  setHideUnsafe: (value: boolean) => void;
  setSelected: (dish: MenuItem) => void;
  resetProfile: () => void;
  onOpenEvents: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const visibleMenu = hideUnsafe ? menu.filter((dish) => conflicts(dish, profile).length === 0) : menu;

  return (
    <>
      <header className="menu-header">
        <div className="menu-header-bg" aria-hidden>
          <img src={ambiance.menu} alt="" draggable={false} />
        </div>
        <div>
          <div className="session-pill">
            <span className="live-dot" />
            {restaurant.tableLabel.replace("Table", t("Table"))} · {t(restaurant.serviceStyle)}
          </div>
          <h1>{returning ? `${t("Welcome back to")} ${restaurant.shortName}` : restaurant.name}</h1>
          <p>
            {locale === "ja"
              ? returning
                ? `おかえりなさい、${restaurant.shortName}。保存された好みからおすすめを選びました。`
                : `${restaurant.shortName}でのおすすめはこちらです。`
              : recommendations.intro}
          </p>
        </div>
      </header>

      <div className="profile-strip">
        <div>
          <span>{t("Your profile")}</span>
          <strong>{profileSummary(profile, t)}</strong>
        </div>
        <button className="ghost-button" onClick={resetProfile}>{t("Reset")}</button>
      </div>

      {returning && memoryFacts.length > 0 && (
        <div className="memory-strip">
          <UserRoundCheck size={18} />
          <div>
            <span>{t("Memory preview")}</span>
            <strong>{t(memoryFacts[0].text)}</strong>
          </div>
        </div>
      )}

      <section className="recommendation-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("For you")}</p>
            <h2>{t("Three safe places to start")}</h2>
          </div>
          <span className="source-pill">{t(recommendations.source)}</span>
        </div>
        <div className="recommendation-rail">
          {recommendedItems.map(({ dish, pick }) => (
            <button key={dish.id} className="rec-card" onClick={() => setSelected(dish)}>
              <Dish3D dish={dish} src={dish.imageUrl} />
              <span>{categoryLabel(dish.category, locale)}</span>
              <strong>{dishName(dish, locale)}</strong>
              <small>{t(pick.reason)}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="filter-row">
        <div>
          <p className="eyebrow">{t("Full menu")}</p>
          <h2>{t("Browse by section")}</h2>
        </div>
        <button
          className={`filter-toggle ${hideUnsafe ? "active" : ""}`}
          onClick={() => setHideUnsafe(!hideUnsafe)}
          title={t("Hide dishes that clash with your saved diet and allergies")}
        >
          <SlidersHorizontal size={16} />
          {hideUnsafe ? t("Show all dishes") : t("Hide unsafe dishes")}
        </button>
      </div>

      {restaurant.categories.map((category) => {
        const items = visibleMenu.filter((dish) => dish.category === category);
        if (!items.length) return null;
        return (
          <section key={category} className="category-section">
            <h3>{categoryLabel(category, locale)}</h3>
            <div className="dish-list">
              {items.map((dish) => (
                <DishCard key={dish.id} dish={dish} profile={profile} onOpen={() => setSelected(dish)} />
              ))}
            </div>
          </section>
        );
      })}

      <button className="afterdinner-cta" onClick={onOpenEvents}>
        <span className="afterdinner-icon">
          <Sparkles size={20} />
        </span>
        <span className="afterdinner-copy">
          <strong>{t("Plans after dinner?")}</strong>
          <small>{t("Comedy, live music & more nearby — booked in a tap")}</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </>
  );
}

function DishCard({ dish, profile, onOpen }: { dish: MenuItem; profile: DinerProfile; onOpen: () => void }) {
  const { locale } = useLocale();
  const dishConflicts = conflicts(dish, profile);
  return (
    <button className={`dish-card ${dishConflicts.length ? "conflicted" : ""}`} onClick={onOpen}>
      <Dish3D dish={dish} src={dish.imageUrl} />
      <div className="dish-card-copy">
        <div className="dish-card-top">
          <span>{categoryLabel(dish.category, locale)}</span>
          <strong>{formatPrice(dish.price)}</strong>
        </div>
        <h4>{dishName(dish, locale)}</h4>
        <p>{dishBlurb(dish, locale)}</p>
        <TagRow dish={dish} dishConflicts={dishConflicts} />
      </div>
    </button>
  );
}

function DishDetail({
  dish,
  profile,
  restaurant,
  menu,
  memoryFacts,
  onClose,
  onOpenDish
}: {
  dish: MenuItem;
  profile: DinerProfile;
  restaurant: Restaurant;
  menu: MenuItem[];
  memoryFacts: MemoryFact[];
  onClose: () => void;
  onOpenDish: (dish: MenuItem) => void;
}) {
  const dishConflicts = conflicts(dish, profile);
  const chat = useGroundedChat({ restaurant, menu, profile, memoryFacts });
  const cart = useCart();
  const [input, setInput] = useState("");
  const [added, setAdded] = useState(false);
  const menuById = useMemo(() => new Map(menu.map((item) => [item.id, item])), [menu]);

  function addToOrder() {
    cart.add(dish);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  function submit() {
    if (!input.trim()) return;
    chat.send(input);
    setInput("");
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={dish.name}>
      <div className="detail-sheet">
        <button className="icon-button close-button" onClick={onClose} aria-label="Close dish detail">
          <X size={18} />
        </button>
        <Dish3D dish={dish} src={dish.imageUrl} large />
        {dish.hotspots && dish.hotspots.length > 0 && (
          <p className="hotspot-hint">
            <Rotate3D size={13} />
            Tap the dots to explore what is in it
          </p>
        )}
        <div className="detail-copy">
          <div className="dish-card-top">
            <span>{dish.category}</span>
            <strong>{formatPrice(dish.price)}</strong>
          </div>
          <h2>{dish.name}</h2>
          {dish.nativeName && <p className="native-line">{dish.nativeName}</p>}
          <p>{dish.explainer}</p>
          <TagRow dish={dish} dishConflicts={dishConflicts} />
          {dishConflicts.length > 0 ? (
            <div className="warning-box">
              <AlertTriangle size={18} />
              <span>{dishConflicts.join(" · ")}</span>
            </div>
          ) : (
            <div className="safe-box">
              <ShieldCheck size={18} />
              <span>No conflicts with your saved profile.</span>
            </div>
          )}

          {dish.allowExclusions && (
            <div className="safe-box customise-box">
              <Replace size={18} />
              <span>
                Can be customised{dish.removable?.length ? ` — ask to leave out ${dish.removable.join(", ")}` : ""}.
              </span>
            </div>
          )}

          <button className="primary-button add-to-order" onClick={addToOrder}>
            {added ? <Check size={18} /> : <Plus size={18} />}
            {added ? "Added to order" : `Add to order · ${formatPrice(dish.price)}`}
          </button>

          <div className="detail-ask">
            <div className="detail-ask-head">
              <Sparkles size={16} />
              <span>Ask about this dish</span>
            </div>
            {chat.messages.length > 0 && (
              <div className="detail-thread">
                {chat.messages.map((message) => (
                  <ChatTurn
                    key={message.id}
                    message={message}
                    menuById={menuById}
                    profile={profile}
                    onOpenDish={onOpenDish}
                  />
                ))}
              </div>
            )}
            <div className="detail-ask-quick">
              <button onClick={() => chat.send(`Would the ${dish.name} suit my profile?`)} disabled={chat.busy}>
                Does this suit me?
              </button>
              <button onClick={() => chat.send(`What are the key ingredients and allergens in the ${dish.name}?`)} disabled={chat.busy}>
                Ingredients & allergens
              </button>
            </div>
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={submit}
              busy={chat.busy}
              placeholder={`Ask about ${dish.name}…`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TagRow({ dish, dishConflicts }: { dish: MenuItem; dishConflicts: string[] }) {
  return (
    <div className="tag-row">
      {dishConflicts.length > 0 && (
        <span className="tag warning">
          <AlertTriangle size={12} />
          {dishConflicts[0]}
        </span>
      )}
      {dish.vegan && (
        <span className="tag good">
          <Leaf size={12} />
          Vegan
        </span>
      )}
      {!dish.vegan && dish.vegetarian && (
        <span className="tag good">
          <Leaf size={12} />
          Veg
        </span>
      )}
      {dish.spice > 0 && (
        <span className="tag spice">
          {Array.from({ length: dish.spice }).map((_, index) => (
            <Flame key={index} size={11} />
          ))}
        </span>
      )}
    </div>
  );
}

function questionFor(step: string) {
  switch (step) {
    case "diet":
      return "Anything you do not eat?";
    case "allergies":
      return "Any allergies to lock out?";
    case "spice":
      return "How much heat do you like?";
    case "adventure":
      return "Familiar, or feeling brave?";
    case "appetite":
      return "How hungry are you?";
    default:
      return "Should we remember this?";
  }
}
