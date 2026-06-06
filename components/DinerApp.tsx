"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Flame,
  Leaf,
  MessageCircle,
  Rotate3D,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  X
} from "lucide-react";
import { Dish3D } from "@/components/Dish3D";
import { conflicts } from "@/lib/conflicts";
import { appetiteOptions, defaultProfile, dietOptions, allergens, spiceOptions, adventureOptions } from "@/lib/profile";
import { heuristicRecommendations } from "@/lib/recommend";
import type { ChatMessage, DinerProfile, MemoryFact, MenuItem, Recommendation, Restaurant } from "@/lib/types";

type Stage = "welcome" | "onboarding" | "menu";

const profileStorageKey = (slug: string) => `taste-passport:${slug}:profile`;
const dinerStorageKey = "taste-passport:diner-id";

function createDinerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `diner_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price);
}

function profileSummary(profile: DinerProfile) {
  const bits = [];
  if (profile.diet !== "none") bits.push(profile.diet);
  if (profile.allergies.length) bits.push(`${profile.allergies.length} allergy lock${profile.allergies.length > 1 ? "s" : ""}`);
  bits.push(spiceOptions[profile.spice].toLowerCase());
  bits.push(profile.appetite === "normal" ? "proper meal" : profile.appetite);
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
  const [stage, setStage] = useState<Stage>("welcome");
  const [dinerId, setDinerId] = useState("");
  const [returning, setReturning] = useState(false);
  const [profile, setProfile] = useState<DinerProfile>(defaultProfile);
  const [hideUnsafe, setHideUnsafe] = useState(false);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const existingDinerId = window.localStorage.getItem(dinerStorageKey);
    const nextDinerId = existingDinerId ?? createDinerId();
    window.localStorage.setItem(dinerStorageKey, nextDinerId);
    setDinerId(nextDinerId);

    const savedProfile = window.localStorage.getItem(profileStorageKey(restaurant.slug));
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as DinerProfile;
        setProfile({ ...defaultProfile, ...parsed });
        setReturning(true);
        setStage("menu");
      } catch {
        window.localStorage.removeItem(profileStorageKey(restaurant.slug));
      }
    }
  }, [restaurant.slug]);

  const memoryFacts = useMemo(() => inferMemoryFacts(profile, returning), [profile, returning]);
  const recommendations = useMemo(
    () => heuristicRecommendations({ menu, profile, restaurant, memoryFacts, returning }),
    [menu, profile, restaurant, memoryFacts, returning]
  );
  const recommendedItems = recommendations.picks
    .map((pick) => ({ pick, dish: menu.find((item) => item.id === pick.id) }))
    .filter((item): item is { pick: Recommendation; dish: MenuItem } => Boolean(item.dish));

  function completeOnboarding(nextProfile: DinerProfile) {
    setProfile(nextProfile);
    window.localStorage.setItem(profileStorageKey(restaurant.slug), JSON.stringify(nextProfile));
    setReturning(false);
    setStage("menu");
  }

  function resetProfile() {
    window.localStorage.removeItem(profileStorageKey(restaurant.slug));
    setProfile(defaultProfile);
    setReturning(false);
    setMessages([]);
    setStage("welcome");
  }

  function askAbout(dish: MenuItem) {
    setSelected(null);
    setChatOpen(true);
    setChatInput(`Would ${dish.name} suit me?`);
  }

  function sendMessage(text = chatInput) {
    const clean = text.trim();
    if (!clean) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: clean }];
    const lower = clean.toLowerCase();
    const namedDish = menu.find((dish) => lower.includes(dish.name.toLowerCase()) || lower.includes(dish.id.replaceAll("-", " ")));
    const reply = namedDish ? dishReply(namedDish, profile) : generalReply(menu, profile, recommendations.picks);
    setMessages([...nextMessages, { role: "assistant", content: reply }]);
    setChatInput("");
  }

  return (
    <main
      className="app-shell"
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
          openChat={() => setChatOpen(true)}
          resetProfile={resetProfile}
        />
      )}

      {selected && (
        <DishDetail dish={selected} profile={profile} onClose={() => setSelected(null)} onAsk={() => askAbout(selected)} />
      )}

      {stage === "menu" && (
        <ChatDock
          open={chatOpen}
          setOpen={setChatOpen}
          restaurant={restaurant}
          messages={messages}
          input={chatInput}
          setInput={setChatInput}
          send={sendMessage}
        />
      )}
    </main>
  );
}

function Welcome({ restaurant, dinerId, onStart }: { restaurant: Restaurant; dinerId: string; onStart: () => void }) {
  return (
    <section className="screen welcome-screen">
      <div className="session-pill">
        <span className="live-dot" />
        Scan complete · {restaurant.tableLabel}
      </div>
      <div className="welcome-hero">
        <p className="eyebrow">{restaurant.cuisine}</p>
        <h1>{restaurant.name}</h1>
        <p>{restaurant.welcomeLine} Tell us the constraints once, then browse a menu that explains itself.</p>
      </div>
      <div className="welcome-actions">
        <button className="action-card primary-action" onClick={onStart}>
          <span className="icon-disc"><Sparkles size={20} /></span>
          <span>
            <strong>Personalize my menu</strong>
            <small>Diet, allergies, spice, appetite · under a minute</small>
          </span>
          <ChevronRight size={20} />
        </button>
        <button className="action-card secondary-action" onClick={onStart}>
          <span className="icon-disc"><ShieldCheck size={20} /></span>
          <span>
            <strong>Start with safety</strong>
            <small>Conflicts stay visible and are never model-guessed</small>
          </span>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="welcome-footer">
        <UserRoundCheck size={14} />
        Anonymous diner session {dinerId ? dinerId.slice(0, 8) : "loading"} · memory can be cleared anytime
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
        <p className="eyebrow">{restaurant.shortName} will use this for tonight's menu</p>
        <h2>{questionFor(step)}</h2>
      </div>

      {step === "diet" && (
        <div className="choice-grid">
          {dietOptions.map((option) => (
            <button
              key={option.key}
              className={`choice ${draft.diet === option.key ? "selected" : ""}`}
              onClick={() => setDraft((current) => ({ ...current, diet: option.key }))}
            >
              {option.label}
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
                {allergen.label}
              </button>
            );
          })}
          <button className={`choice wide ${draft.allergies.length === 0 ? "selected" : ""}`} onClick={() => setDraft((current) => ({ ...current, allergies: [] }))}>
            None of these
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
              <span>{option}</span>
              <span className="flame-row">
                {spiceIndex === 0 ? "no heat" : Array.from({ length: spiceIndex }).map((_, flameIndex) => <Flame key={flameIndex} size={14} />)}
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
              {option}
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
              {option.label}
            </button>
          ))}
        </div>
      )}

      {step === "memory" && (
        <div className="memory-consent">
          <ShieldCheck size={28} />
          <h3>Remember this taste profile?</h3>
          <p>For the MVP, this saves on this device. The production layer will swap this for diner-owned Mubit memory plus a forget-me flow.</p>
          <button
            className={`toggle-row ${draft.memoryOptIn ? "selected" : ""}`}
            onClick={() => setDraft((current) => ({ ...current, memoryOptIn: !current.memoryOptIn }))}
          >
            <span>Use this profile next time</span>
            <span>{draft.memoryOptIn ? "On" : "Off"}</span>
          </button>
        </div>
      )}

      <button className="primary-button docked-button" onClick={next}>
        {finalStep ? "Show my menu" : "Next"}
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
  openChat,
  resetProfile
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
  openChat: () => void;
  resetProfile: () => void;
}) {
  const visibleMenu = hideUnsafe ? menu.filter((dish) => conflicts(dish, profile).length === 0) : menu;

  return (
    <section className="menu-screen">
      <header className="menu-header">
        <div>
          <div className="session-pill">
            <span className="live-dot" />
            {restaurant.tableLabel} · {restaurant.serviceStyle}
          </div>
          <h1>{returning ? `Welcome back to ${restaurant.shortName}` : restaurant.name}</h1>
          <p>{recommendations.intro}</p>
        </div>
        <button className="chat-fab" onClick={openChat}>
          <MessageCircle size={18} />
          Ask
        </button>
      </header>

      <div className="profile-strip">
        <div>
          <span>Your profile</span>
          <strong>{profileSummary(profile)}</strong>
        </div>
        <button className="ghost-button" onClick={resetProfile}>Reset</button>
      </div>

      {returning && memoryFacts.length > 0 && (
        <div className="memory-strip">
          <UserRoundCheck size={18} />
          <div>
            <span>Memory preview</span>
            <strong>{memoryFacts[0].text}</strong>
          </div>
        </div>
      )}

      <section className="recommendation-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">For you</p>
            <h2>Three safe places to start</h2>
          </div>
          <span className="source-pill">{recommendations.source}</span>
        </div>
        <div className="recommendation-rail">
          {recommendedItems.map(({ dish, pick }) => (
            <button key={dish.id} className="rec-card" onClick={() => setSelected(dish)}>
              <Dish3D dish={dish} />
              <span>{dish.category}</span>
              <strong>{dish.name}</strong>
              <small>{pick.reason}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="filter-row">
        <div>
          <p className="eyebrow">Full menu</p>
          <h2>Browse by section</h2>
        </div>
        <button className={`filter-toggle ${hideUnsafe ? "active" : ""}`} onClick={() => setHideUnsafe(!hideUnsafe)}>
          <SlidersHorizontal size={16} />
          Hide conflicts
        </button>
      </div>

      {restaurant.categories.map((category) => {
        const items = visibleMenu.filter((dish) => dish.category === category);
        if (!items.length) return null;
        return (
          <section key={category} className="category-section">
            <h3>{category}</h3>
            <div className="dish-list">
              {items.map((dish) => (
                <DishCard key={dish.id} dish={dish} profile={profile} onOpen={() => setSelected(dish)} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

function DishCard({ dish, profile, onOpen }: { dish: MenuItem; profile: DinerProfile; onOpen: () => void }) {
  const dishConflicts = conflicts(dish, profile);
  return (
    <button className={`dish-card ${dishConflicts.length ? "conflicted" : ""}`} onClick={onOpen}>
      <Dish3D dish={dish} />
      <div className="dish-card-copy">
        <div className="dish-card-top">
          <span>{dish.category}</span>
          <strong>{formatPrice(dish.price)}</strong>
        </div>
        <h4>{dish.name}</h4>
        <p>{dish.blurb}</p>
        <TagRow dish={dish} dishConflicts={dishConflicts} />
      </div>
    </button>
  );
}

function DishDetail({ dish, profile, onClose, onAsk }: { dish: MenuItem; profile: DinerProfile; onClose: () => void; onAsk: () => void }) {
  const dishConflicts = conflicts(dish, profile);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={dish.name}>
      <div className="detail-sheet">
        <button className="icon-button close-button" onClick={onClose} aria-label="Close dish detail">
          <X size={18} />
        </button>
        <Dish3D dish={dish} large />
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
          <button className="primary-button" onClick={onAsk}>
            <Bot size={18} />
            Ask if this suits me
          </button>
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

function ChatDock({
  open,
  setOpen,
  restaurant,
  messages,
  input,
  setInput,
  send
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  restaurant: Restaurant;
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  send: () => void;
}) {
  if (!open) {
    return (
      <button className="floating-chat" onClick={() => setOpen(true)}>
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className="chat-dock">
      <div className="chat-head">
        <div>
          <span>{restaurant.shortName} concierge</span>
          <strong>Menu-grounded chat</strong>
        </div>
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close chat">
          <X size={18} />
        </button>
      </div>
      <div className="chat-body">
        {messages.length === 0 && (
          <div className="assistant-empty">
            <Bot size={22} />
            Ask about a dish, dietary fit, spice, or what to order first.
          </div>
        )}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask what suits you..." />
        <button type="submit" aria-label="Send message">
          <Send size={17} />
        </button>
      </form>
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

function dishReply(dish: MenuItem, profile: DinerProfile) {
  const dishConflicts = conflicts(dish, profile);
  if (dishConflicts.length > 0) {
    return `${dish.name} is worth flagging: ${dishConflicts.join(", ")}. I would steer you to a safer dish instead.`;
  }
  return `${dish.name} should suit you. ${dish.explainer}`;
}

function generalReply(menu: MenuItem[], profile: DinerProfile, picks: Recommendation[]) {
  const firstSafePick = picks.map((pick) => menu.find((dish) => dish.id === pick.id)).find(Boolean);
  if (firstSafePick) return `I would start with ${firstSafePick.name}. It fits your profile, and the menu flags anything risky before you tap in.`;
  if (profile.allergies.length) return "I can help, but keep the allergy flags visible. Tap any dish and I will explain the exact conflict or fit.";
  return "Tell me a dish name or what you are in the mood for, and I will keep the answer grounded to this menu.";
}
