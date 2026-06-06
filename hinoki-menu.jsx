import { useState, useRef, useEffect } from "react";
import {
  ChefHat, Mic, MessageCircle, Send, X, Info, Sparkles, ChevronRight,
  Flame, Leaf, AlertTriangle, Check, ArrowLeft, Loader2, Upload, Utensils
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  Hinoki — diner-facing menu MVP
 *  - AI onboarding (voice OR tap-through Q&A), recommendations, and chat
 *    are REAL calls to the Anthropic API (claude-sonnet-4). They degrade
 *    gracefully to a local heuristic if the API is unavailable.
 *  - Dish viewer is a tilt/parallax pseudo-3D treatment. Default art is an
 *    elegant per-dish "plate" placeholder; tap a dish -> Upload to drop a
 *    real restaurant photo in live (in-memory only).
 * ------------------------------------------------------------------ */

const RESTAURANT = { name: "Hinoki", jp: "炭火", sub: "Tokyo Izakaya", area: "Shoreditch · Table 12" };

const ALLERGENS = [
  { key: "gluten", label: "Gluten" },
  { key: "shellfish", label: "Shellfish" },
  { key: "fish", label: "Fish" },
  { key: "dairy", label: "Dairy" },
  { key: "egg", label: "Egg" },
  { key: "nuts", label: "Nuts" },
];

const DIETS = [
  { key: "none", label: "No restriction" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "pescatarian", label: "Pescatarian" },
  { key: "halal", label: "Halal" },
];

const SPICE = ["Mild", "Medium", "Hot", "Fiery"];
const ADVENTURE = ["Stick to favourites", "A little new", "Surprise me"];
const APPETITE = [
  { key: "light", label: "Light bite" },
  { key: "normal", label: "A proper meal" },
  { key: "feast", label: "Feast" },
];

const MENU = [
  { id: "edamame", name: "Edamame", jp: "枝豆", cat: "Small plates", price: 5.5, spice: 0, veg: true, vegan: true,
    contains: [], hue: "#caa64a",
    blurb: "Steamed young soybeans, flaked sea salt.",
    explainer: "Soybeans served warm in the pod — pop the beans out with your teeth. Light, savoury, the classic izakaya starter." },
  { id: "gyoza", name: "Pork Gyoza", jp: "餃子", cat: "Small plates", price: 7.5, spice: 0, veg: false, vegan: false,
    contains: ["gluten", "pork"], hue: "#c98a3a",
    blurb: "Pan-fried pork & cabbage dumplings, crisp base.",
    explainer: "Thin-skinned dumplings fried flat on one side, so they're crisp underneath and soft on top. Dip in vinegar-soy." },
  { id: "karaage", name: "Chicken Karaage", jp: "唐揚げ", cat: "Small plates", price: 8, spice: 1, veg: false, vegan: false,
    contains: ["gluten", "chicken"], hue: "#c8842f",
    blurb: "Marinated fried chicken, ginger & garlic, lemon.",
    explainer: "Japanese fried chicken — thigh marinated in soy, ginger and garlic, lightly battered and fried. Juicy, never heavy." },
  { id: "agedashi", name: "Agedashi Tofu", jp: "揚げ出し豆腐", cat: "Small plates", price: 7, spice: 0, veg: false, vegan: false,
    contains: ["fish"], hue: "#bf9a4a",
    blurb: "Silken tofu, light fry, warm dashi broth.",
    explainer: "Soft tofu in a thin crisp coating in a savoury broth. Note: the dashi is made from bonito (fish), so it isn't vegetarian here." },
  { id: "salmon-nigiri", name: "Salmon Nigiri", jp: "サーモン", cat: "Sushi", price: 6, spice: 0, veg: false, vegan: false,
    contains: ["fish"], hue: "#cf6a52",
    blurb: "Two pieces, fresh salmon over seasoned rice.",
    explainer: "A slice of raw salmon pressed over a small mound of vinegared rice. Clean and buttery — the easiest way into sushi." },
  { id: "spicy-tuna", name: "Spicy Tuna Roll", jp: "辛口マグロ", cat: "Sushi", price: 9, spice: 2, veg: false, vegan: false,
    contains: ["fish", "gluten", "egg"], hue: "#cd5a48",
    blurb: "Tuna, chilli mayo, cucumber, sesame.",
    explainer: "A maki roll: tuna and cucumber rolled in rice and nori (seaweed), bound with a chilli-mayo. Mild heat, creamy." },
  { id: "uni", name: "Uni Nigiri", jp: "雲丹", cat: "Sushi", price: 14, spice: 0, veg: false, vegan: false,
    contains: ["shellfish"], hue: "#d08a3c",
    blurb: "Hokkaido sea urchin over rice, nori band.",
    explainer: "Uni is the roe of sea urchin — soft, custardy, intensely oceanic and rich. A real delicacy, and one for the adventurous." },
  { id: "tonkotsu", name: "Tonkotsu Ramen", jp: "豚骨ラーメン", cat: "Big bowls", price: 14, spice: 1, veg: false, vegan: false,
    contains: ["gluten", "pork", "egg"], hue: "#c47a33",
    blurb: "Pork-bone broth, chashu, soft egg, spring onion.",
    explainer: "Ramen in a rich, milky broth simmered from pork bones for hours, topped with braised pork (chashu) and a soft egg. The comfort bowl." },
  { id: "veg-tempura", name: "Vegetable Tempura", jp: "野菜天ぷら", cat: "Big bowls", price: 9, spice: 0, veg: true, vegan: true,
    contains: ["gluten"], hue: "#9aab55",
    blurb: "Seasonal vegetables, feather-light batter.",
    explainer: "Vegetables in an airy, crackly batter, fried light and quick. Dip in the warm tentsuyu sauce. Crisp, never greasy." },
  { id: "matcha-cheesecake", name: "Matcha Cheesecake", jp: "抹茶チーズ", cat: "Sweet", price: 7, spice: 0, veg: true, vegan: false,
    contains: ["gluten", "dairy", "egg"], hue: "#8fae5a",
    blurb: "Baked matcha cheesecake, black-sugar drizzle.",
    explainer: "A baked cheesecake folded with stone-ground green tea (matcha) — gently bitter against the sweet cream, finished with kuromitsu syrup." },
];

const CATS = ["Small plates", "Sushi", "Big bowls", "Sweet"];

/* ---------------- logic helpers ---------------- */

function conflicts(dish, profile) {
  const out = [];
  const allergyLabel = (k) => (ALLERGENS.find((a) => a.key === k)?.label || k).toLowerCase();
  for (const a of profile.allergies) {
    if (dish.contains.includes(a)) out.push("Contains " + allergyLabel(a));
  }
  const c = dish.contains;
  const has = (...ks) => ks.some((k) => c.includes(k));
  if (profile.diet === "vegetarian" && has("fish", "shellfish", "pork", "chicken")) out.push("Not vegetarian");
  if (profile.diet === "vegan" && (has("fish", "shellfish", "pork", "chicken", "dairy", "egg"))) out.push("Not vegan");
  if (profile.diet === "pescatarian" && has("pork", "chicken")) out.push("Has meat");
  if (profile.diet === "halal" && has("pork")) out.push("Contains pork");
  return [...new Set(out)];
}

function defaultIntro(p) {
  const bits = [];
  if (p.appetite === "light") bits.push("keeping it light");
  if (p.appetite === "feast") bits.push("in for a feast");
  if (p.spice >= 2) bits.push("after some heat");
  if (p.spice === 0) bits.push("easy on the spice");
  if (p.adventure >= 2) bits.push("ready to be surprised");
  if (p.diet !== "none") bits.push(DIETS.find((d) => d.key === p.diet)?.label.toLowerCase());
  const tail = bits.length ? " — " + bits.slice(0, 2).join(", ") : "";
  return "Here's where I'd start you tonight" + tail + ".";
}

function heuristicReason(d, p) {
  if (["uni", "agedashi"].includes(d.id) && p.adventure >= 2) return "A little adventurous, exactly what you asked for.";
  if (d.cat === "Big bowls" && p.appetite === "feast") return "A bowl that actually fills you up.";
  if (d.spice >= 2 && p.spice >= 2) return "Brings the heat you're after.";
  if (d.cat === "Sushi") return "Clean and light — a gentle place to start.";
  if (d.veg && (p.diet === "vegan" || p.diet === "vegetarian")) return "Squarely within what you eat.";
  return "A safe, easy crowd-pleaser to begin with.";
}

function heuristicRecs(p) {
  const safe = MENU.filter((d) => conflicts(d, p).length === 0);
  const pool = safe.length ? safe : MENU;
  const scored = pool.map((d) => {
    let s = 0;
    s -= Math.abs(d.spice - p.spice) * 1.2;
    if (p.appetite === "light" && (d.cat === "Small plates" || d.cat === "Sushi")) s += 2;
    if (p.appetite === "feast" && d.cat === "Big bowls") s += 2.5;
    if (p.appetite === "normal") s += 0.5;
    const unusual = ["uni", "agedashi"].includes(d.id);
    if (p.adventure >= 2 && unusual) s += 2.8;
    if (p.adventure <= 0 && !unusual) s += 1;
    s += Math.random() * 0.6;
    return { d, s };
  }).sort((a, b) => b.s - a.s);
  return scored.slice(0, 3).map((x) => ({ id: x.d.id, reason: heuristicReason(x.d, p) }));
}

function extractJSON(text) {
  let t = (text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

async function callClaude({ system, messages, maxTokens = 700 }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error("api " + res.status);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

const menuForLLM = () =>
  MENU.map((d) => ({ id: d.id, name: d.name, blurb: d.blurb, cat: d.cat, spice: d.spice, veg: d.veg, vegan: d.vegan, contains: d.contains }));

/* ---------------- tilt / pseudo-3D dish viewer ---------------- */

function Dish3D({ dish, src, big = false }) {
  const ref = useRef(null);
  const [t, setT] = useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
  const [failed, setFailed] = useState(false);

  const move = (cx, cy) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (cx - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (cy - r.top) / r.height));
    const range = big ? 30 : 18;
    setT({ ry: (px - 0.5) * range, rx: (0.5 - py) * (range - 4), mx: px * 100, my: py * 100, active: true });
  };
  const reset = () => setT((s) => ({ ...s, rx: 0, ry: 0, mx: 50, my: 50, active: false }));

  const showImg = src && !failed;

  return (
    <div
      ref={ref}
      className="d3d-wrap"
      style={{ perspective: big ? 900 : 700 }}
      onMouseMove={(e) => move(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onTouchMove={(e) => { const tc = e.touches[0]; if (tc) move(tc.clientX, tc.clientY); }}
      onTouchEnd={reset}
    >
      <div
        className={"d3d-card" + (big && !t.active ? " d3d-float" : "")}
        style={{
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.active ? (big ? 1.05 : 1.04) : 1})`,
          transition: t.active ? "transform .04s linear" : "transform .55s cubic-bezier(.2,.85,.25,1)",
          boxShadow: `${-t.ry * 1.1}px ${t.rx * 1.1 + (big ? 30 : 16)}px ${big ? 60 : 34}px rgba(0,0,0,.55)`,
        }}
      >
        {showImg ? (
          <img src={src} alt={dish.name} className="d3d-img" draggable={false} onError={() => setFailed(true)} />
        ) : (
          <div
            className="d3d-plate"
            style={{
              background:
                `radial-gradient(120% 90% at 32% 26%, ${dish.hue}cc 0%, ${dish.hue}55 38%, #1a1512 78%),` +
                `radial-gradient(60% 50% at 70% 78%, rgba(0,0,0,.45), rgba(0,0,0,0) 60%)`,
            }}
          >
            <span className="d3d-plate-jp">{dish.jp}</span>
            <span className="d3d-plate-tag">photo slots in here</span>
          </div>
        )}
        <div
          className="d3d-shine"
          style={{
            background: `radial-gradient(circle at ${t.mx}% ${t.my}%, rgba(255,244,222,.42) 0%, rgba(255,255,255,0) 46%)`,
            opacity: t.active ? 1 : 0.45,
          }}
        />
        <div className="d3d-rim" />
      </div>
    </div>
  );
}

/* ---------------- small UI atoms ---------------- */

function Badge({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "rgba(242,234,224,.08)", bd: "rgba(242,234,224,.16)", fg: "#cdbfae" },
    warn: { bg: "rgba(214,73,47,.16)", bd: "rgba(214,73,47,.45)", fg: "#f0a08c" },
    veg: { bg: "rgba(123,150,70,.16)", bd: "rgba(123,150,70,.4)", fg: "#bcd285" },
    spice: { bg: "rgba(201,162,39,.14)", bd: "rgba(201,162,39,.4)", fg: "#e3c674" },
  }[tone];
  return (
    <span className="badge" style={{ background: map.bg, borderColor: map.bd, color: map.fg }}>
      {children}
    </span>
  );
}

function DishTags({ dish, conflict }) {
  return (
    <div className="tagrow">
      {conflict.length > 0 && (
        <Badge tone="warn"><AlertTriangle size={11} strokeWidth={2.4} /> {conflict[0]}</Badge>
      )}
      {dish.vegan && <Badge tone="veg"><Leaf size={11} strokeWidth={2.4} /> Vegan</Badge>}
      {!dish.vegan && dish.veg && <Badge tone="veg"><Leaf size={11} strokeWidth={2.4} /> Veg</Badge>}
      {dish.spice > 0 && (
        <Badge tone="spice">{Array.from({ length: dish.spice }).map((_, i) => <Flame key={i} size={10} strokeWidth={2.6} />)}</Badge>
      )}
    </div>
  );
}

/* ============================ APP ============================ */

export default function App() {
  const [stage, setStage] = useState("welcome"); // welcome | onboarding | menu
  const [profile, setProfile] = useState({ diet: "none", allergies: [], spice: 1, adventure: 1, appetite: "normal" });

  const [recs, setRecs] = useState(null);
  const [intro, setIntro] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const [images, setImages] = useState({});      // dishId -> dataURL
  const [hideUnsafe, setHideUnsafe] = useState(false);
  const [selected, setSelected] = useState(null); // dish for detail overlay
  const [info, setInfo] = useState(null);          // dish id for inline explainer

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // voice
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceErr, setVoiceErr] = useState("");
  const recRef = useRef(null);

  const reduce = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  /* ---- recommendations ---- */
  async function fetchRecs(p) {
    setRecLoading(true); setUsingFallback(false);
    try {
      const sys =
        "You are the dish concierge at Hinoki, a Tokyo izakaya in London. Reply with ONLY valid minified JSON — no markdown fences, no text outside the JSON. " +
        'Schema: {"intro":string,"picks":[{"id":string,"reason":string}]}. ' +
        "intro: one warm sentence (max 18 words) spoken to the diner. picks: exactly 3 dish ids drawn from the menu. reason: max 13 words, second person, concrete. " +
        "NEVER pick a dish that conflicts with the diner's allergies or diet. Honour spice tolerance (0 mild to 3 fiery) and appetite.";
      const usr = "MENU:\n" + JSON.stringify(menuForLLM()) + "\n\nDINER PROFILE:\n" + JSON.stringify(p) + "\n\nReturn the JSON now.";
      const raw = await callClaude({ system: sys, messages: [{ role: "user", content: usr }], maxTokens: 600 });
      const j = extractJSON(raw);
      const picks = (j.picks || [])
        .filter((x) => {
          const d = MENU.find((m) => m.id === x.id);
          return d && conflicts(d, p).length === 0;
        })
        .slice(0, 3);
      if (!picks.length) throw new Error("no valid picks");
      setIntro(j.intro || defaultIntro(p));
      setRecs(picks);
    } catch (e) {
      setRecs(heuristicRecs(p));
      setIntro(defaultIntro(p));
      setUsingFallback(true);
    } finally {
      setRecLoading(false);
    }
  }

  function finishOnboarding(p) {
    setProfile(p);
    setStage("menu");
    fetchRecs(p);
  }

  /* ---- voice ---- */
  function startVoice() {
    setVoiceErr(""); setTranscript("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceErr("Voice isn't supported in this browser — the quick questions work everywhere."); return; }
    let rec;
    try { rec = new SR(); } catch (e) { setVoiceErr("Couldn't start the microphone. Try the quick questions."); return; }
    rec.lang = "en-GB"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => {
      const txt = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setTranscript(txt);
    };
    rec.onerror = () => { setListening(false); setVoiceErr("Microphone blocked or unavailable — try the quick questions instead."); };
    rec.onend = () => { setListening(false); };
    recRef.current = rec;
    try { rec.start(); setListening(true); }
    catch (e) { setVoiceErr("Couldn't access the microphone. Try the quick questions."); }
  }
  function stopVoice() {
    try { recRef.current && recRef.current.stop(); } catch (e) {}
    setListening(false);
  }
  async function useTranscript() {
    if (!transcript.trim()) return;
    setRecLoading(true); setStage("menu");
    try {
      const sys =
        "Extract a diner profile from their spoken request. Reply with ONLY valid minified JSON, no markdown, no extra text. " +
        'Schema: {"diet":"none|vegetarian|vegan|pescatarian|halal","allergies":["gluten|shellfish|fish|dairy|egg|nuts"],"spice":0-3,"adventure":0-2,"appetite":"light|normal|feast"}. ' +
        "Infer sensibly; default unknown fields to none/[]/1/1/normal.";
      const raw = await callClaude({ system: sys, messages: [{ role: "user", content: transcript }], maxTokens: 250 });
      const j = extractJSON(raw);
      const p = {
        diet: DIETS.find((d) => d.key === j.diet) ? j.diet : "none",
        allergies: Array.isArray(j.allergies) ? j.allergies.filter((a) => ALLERGENS.find((x) => x.key === a)) : [],
        spice: Math.min(3, Math.max(0, Number(j.spice) || 0)),
        adventure: Math.min(2, Math.max(0, Number(j.adventure ?? 1))),
        appetite: APPETITE.find((a) => a.key === j.appetite) ? j.appetite : "normal",
      };
      setProfile(p);
      fetchRecs(p);
    } catch (e) {
      setProfile((pp) => pp);
      fetchRecs(profile);
      setUsingFallback(true);
    }
  }

  /* ---- chat ---- */
  async function send(text) {
    const clean = text.trim();
    if (!clean || chatLoading) return;
    const next = [...messages, { role: "user", content: clean }];
    setMessages(next); setChatInput(""); setChatLoading(true);
    try {
      const sys =
        "You are the warm, concise dish concierge at Hinoki, a Tokyo izakaya. You may ONLY discuss dishes on this menu (never invent dishes or ingredients): " +
        JSON.stringify(menuForLLM()) +
        ". The diner's profile: " + JSON.stringify(profile) +
        ". Never suggest anything that conflicts with their allergies or diet; if they ask about such a dish, warn them plainly. Explain unfamiliar Japanese dishes in one simple sentence. Friendly and brief — under 55 words. No markdown, no lists.";
      const raw = await callClaude({ system: sys, messages: next.map((m) => ({ role: m.role, content: m.content })), maxTokens: 400 });
      setMessages((m) => [...m, { role: "assistant", content: (raw || "").trim() || "Let me know what you fancy." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "I'm having trouble connecting right now — but tap any dish to see what it is, what's in it, and whether it fits your preferences." }]);
    } finally {
      setChatLoading(false);
    }
  }

  function askAbout(dish) {
    setSelected(null);
    setChatOpen(true);
    setChatInput(`What's the ${dish.name}, and would it suit me?`);
  }

  function onUpload(dishId, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImages((im) => ({ ...im, [dishId]: reader.result }));
    reader.readAsDataURL(file);
  }

  /* =================== RENDER =================== */

  return (
    <div className="hk-root">
      <style>{css(reduce)}</style>

      {stage === "welcome" && (
        <Welcome
          onTaps={() => setStage("onboarding")}
          onVoice={startVoice}
          listening={listening}
          transcript={transcript}
          voiceErr={voiceErr}
          stopVoice={stopVoice}
          useTranscript={useTranscript}
          clearVoice={() => { setTranscript(""); setVoiceErr(""); }}
        />
      )}

      {stage === "onboarding" && (
        <Onboarding onDone={finishOnboarding} onBack={() => setStage("welcome")} />
      )}

      {stage === "menu" && (
        <Menu
          profile={profile}
          recs={recs}
          intro={intro}
          recLoading={recLoading}
          usingFallback={usingFallback}
          images={images}
          hideUnsafe={hideUnsafe}
          setHideUnsafe={setHideUnsafe}
          openDish={setSelected}
          info={info}
          setInfo={setInfo}
          openChat={() => setChatOpen(true)}
        />
      )}

      {selected && (
        <DishDetail
          dish={selected}
          src={images[selected.id]}
          conflict={conflicts(selected, profile)}
          onClose={() => setSelected(null)}
          onUpload={onUpload}
          onAsk={askAbout}
        />
      )}

      {stage === "menu" && (
        <ChatDock
          open={chatOpen}
          setOpen={setChatOpen}
          messages={messages}
          input={chatInput}
          setInput={setChatInput}
          loading={chatLoading}
          send={send}
        />
      )}
    </div>
  );
}

/* ---------------- Welcome ---------------- */

function Welcome({ onTaps, onVoice, listening, transcript, voiceErr, stopVoice, useTranscript, clearVoice }) {
  return (
    <div className="screen welcome">
      <div className="w-top">
        <div className="kicker"><span className="dot" /> Scan complete · {RESTAURANT.area}</div>
        <h1 className="display">{RESTAURANT.name}</h1>
        <div className="w-jp">{RESTAURANT.jp} · {RESTAURANT.sub}</div>
        <p className="w-lede">A menu that knows what you like. Let me find your dishes — and explain anything you've not had before.</p>
      </div>

      <div className="w-actions">
        <button className="btn btn-primary" onClick={onTaps}>
          <div className="btn-ic"><ChefHat size={20} strokeWidth={1.8} /></div>
          <div className="btn-txt"><span className="btn-h">A few quick taps</span><span className="btn-s">5 questions · works everywhere</span></div>
          <ChevronRight size={18} className="btn-go" />
        </button>
        <button className="btn btn-ghost" onClick={onVoice}>
          <div className="btn-ic"><Mic size={20} strokeWidth={1.8} /></div>
          <div className="btn-txt"><span className="btn-h">Tell me out loud</span><span className="btn-s">Speak your cravings, allergies, mood</span></div>
          <ChevronRight size={18} className="btn-go" />
        </button>
      </div>

      <div className="w-foot"><Sparkles size={12} /> Recommendations &amp; chat are powered by live AI</div>

      {(listening || transcript || voiceErr) && (
        <div className="voice-modal" onClick={(e) => { if (e.target.classList.contains("voice-modal")) { stopVoice(); clearVoice(); } }}>
          <div className="voice-card">
            {voiceErr ? (
              <>
                <AlertTriangle size={26} color="#f0a08c" />
                <p className="voice-err">{voiceErr}</p>
                <button className="btn btn-primary small" onClick={() => { clearVoice(); onTaps(); }}>Use the quick questions</button>
              </>
            ) : (
              <>
                <div className={"mic-pulse" + (listening ? " on" : "")}><Mic size={26} strokeWidth={1.8} /></div>
                <p className="voice-status">{listening ? "Listening…" : "Got it"}</p>
                <p className="voice-transcript">{transcript || "e.g. \u201cI'm vegetarian, love bold flavours but no heat, and I'm pretty hungry.\u201d"}</p>
                <div className="voice-btns">
                  {listening
                    ? <button className="btn btn-ghost small" onClick={stopVoice}>Stop</button>
                    : <button className="btn btn-ghost small" onClick={clearVoice}>Redo</button>}
                  <button className="btn btn-primary small" disabled={!transcript.trim()} onClick={useTranscript}>Build my menu</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Onboarding ---------------- */

function Onboarding({ onDone, onBack }) {
  const steps = ["diet", "allergies", "spice", "adventure", "appetite"];
  const [i, setI] = useState(0);
  const [p, setP] = useState({ diet: "none", allergies: [], spice: 1, adventure: 1, appetite: "normal" });
  const step = steps[i];

  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone(p));
  const back = () => (i > 0 ? setI(i - 1) : onBack());
  const toggleAllergy = (k) => setP((s) => ({ ...s, allergies: s.allergies.includes(k) ? s.allergies.filter((x) => x !== k) : [...s.allergies, k] }));

  const Q = {
    diet: "Anything you don't eat?",
    allergies: "Any allergies we should lock out?",
    spice: "How much heat do you like?",
    adventure: "Familiar, or feeling brave?",
    appetite: "How hungry are you?",
  }[step];

  return (
    <div className="screen onboard">
      <div className="ob-bar">
        <button className="icon-btn" onClick={back}><ArrowLeft size={18} /></button>
        <div className="dots">{steps.map((_, k) => <span key={k} className={"d" + (k <= i ? " on" : "")} />)}</div>
        <span className="ob-count">{i + 1}/{steps.length}</span>
      </div>

      <div className="ob-body" key={step}>
        <h2 className="ob-q">{Q}</h2>

        {step === "diet" && (
          <div className="chips">
            {DIETS.map((d) => (
              <button key={d.key} className={"chip" + (p.diet === d.key ? " sel" : "")} onClick={() => setP((s) => ({ ...s, diet: d.key }))}>{d.label}</button>
            ))}
          </div>
        )}

        {step === "allergies" && (
          <>
            <div className="chips">
              {ALLERGENS.map((a) => (
                <button key={a.key} className={"chip" + (p.allergies.includes(a.key) ? " sel" : "")} onClick={() => toggleAllergy(a.key)}>
                  {p.allergies.includes(a.key) && <Check size={14} strokeWidth={3} />} {a.label}
                </button>
              ))}
            </div>
            <button className={"chip wide" + (p.allergies.length === 0 ? " sel" : "")} onClick={() => setP((s) => ({ ...s, allergies: [] }))}>None of these</button>
            <p className="ob-note">Anything you flag is hard-blocked across the whole menu — never just hidden in the small print.</p>
          </>
        )}

        {step === "spice" && (
          <div className="chips col">
            {SPICE.map((s, k) => (
              <button key={k} className={"chip row" + (p.spice === k ? " sel" : "")} onClick={() => setP((st) => ({ ...st, spice: k }))}>
                <span>{s}</span>
                <span className="flames">{Array.from({ length: k }).map((_, j) => <Flame key={j} size={13} />)}{k === 0 && <span className="muted">no heat</span>}</span>
              </button>
            ))}
          </div>
        )}

        {step === "adventure" && (
          <div className="chips col">
            {ADVENTURE.map((s, k) => (
              <button key={k} className={"chip row" + (p.adventure === k ? " sel" : "")} onClick={() => setP((st) => ({ ...st, adventure: k }))}>{s}</button>
            ))}
          </div>
        )}

        {step === "appetite" && (
          <div className="chips col">
            {APPETITE.map((a) => (
              <button key={a.key} className={"chip row" + (p.appetite === a.key ? " sel" : "")} onClick={() => setP((st) => ({ ...st, appetite: a.key }))}>{a.label}</button>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary ob-next" onClick={next}>
        {i < steps.length - 1 ? "Next" : "Show my menu"} <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ---------------- Menu ---------------- */

function Menu({ profile, recs, intro, recLoading, usingFallback, images, hideUnsafe, setHideUnsafe, openDish, info, setInfo, openChat }) {
  const recDishes = (recs || []).map((r) => ({ ...MENU.find((d) => d.id === r.id), reason: r.reason })).filter((d) => d.id);

  return (
    <div className="screen menu">
      <header className="m-head">
        <div>
          <div className="m-kicker">{RESTAURANT.jp} · {RESTAURANT.sub}</div>
          <h1 className="display sm">{RESTAURANT.name}</h1>
        </div>
        <button className="icon-btn lg" onClick={openChat}><MessageCircle size={20} /></button>
      </header>

      {/* recommendations */}
      <section className="recs">
        <div className="recs-title"><Sparkles size={15} /> For you</div>
        {recLoading ? (
          <div className="rec-intro shimmer-text">Reading your taste…</div>
        ) : (
          <p className="rec-intro">{intro}</p>
        )}
        <div className="rec-scroll">
          {recLoading
            ? [0, 1, 2].map((k) => <div key={k} className="rec-card shimmer" />)
            : recDishes.map((d) => (
              <button key={d.id} className="rec-card" onClick={() => openDish(d)}>
                <Dish3D dish={d} src={images[d.id]} />
                <div className="rec-meta">
                  <div className="rec-name">{d.name}</div>
                  <div className="rec-reason">{d.reason}</div>
                  <div className="rec-price">£{d.price.toFixed(2)}</div>
                </div>
              </button>
            ))}
        </div>
        {usingFallback && !recLoading && (
          <div className="fallback-note">Live AI was unreachable — showing smart picks from your answers.</div>
        )}
      </section>

      {/* live filter */}
      <div className="filter-bar">
        <span className="fb-label">Showing {profile.diet !== "none" ? DIETS.find((d) => d.key === profile.diet)?.label.toLowerCase() : "everything"}{profile.allergies.length ? ` · no ${profile.allergies.map((a) => a).join(", ")}` : ""}</span>
        <button className={"toggle" + (hideUnsafe ? " on" : "")} onClick={() => setHideUnsafe(!hideUnsafe)}>
          <span className="knob" /> Hide what I can't eat
        </button>
      </div>

      {/* full menu */}
      {CATS.map((cat) => {
        const dishes = MENU.filter((d) => d.cat === cat).map((d) => ({ d, c: conflicts(d, profile) })).filter((x) => !(hideUnsafe && x.c.length));
        if (!dishes.length) return null;
        return (
          <section className="cat" key={cat}>
            <h3 className="cat-h">{cat}</h3>
            <div className="dish-list">
              {dishes.map(({ d, c }) => (
                <div key={d.id} className={"dish" + (c.length ? " blocked" : "")}>
                  <button className="dish-img" onClick={() => openDish(d)}><Dish3D dish={d} src={images[d.id]} /></button>
                  <div className="dish-info">
                    <div className="dish-top" onClick={() => openDish(d)}>
                      <div>
                        <span className="dish-name">{d.name}</span>
                        <span className="dish-jp">{d.jp}</span>
                      </div>
                      <span className="dish-price">£{d.price.toFixed(2)}</span>
                    </div>
                    <p className="dish-blurb">{d.blurb}</p>
                    <div className="dish-foot">
                      <DishTags dish={d} conflict={c} />
                      <button className="explain" onClick={() => setInfo(info === d.id ? null : d.id)}><Info size={13} /> What's this?</button>
                    </div>
                    {info === d.id && <div className="explainer">{d.explainer}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <div className="m-end">Hinoki · {RESTAURANT.area} — tap a dish, drag it, drop in a real photo.</div>
    </div>
  );
}

/* ---------------- Dish detail ---------------- */

function DishDetail({ dish, src, conflict, onClose, onUpload, onAsk }) {
  const fileRef = useRef(null);
  return (
    <div className="overlay" onClick={(e) => { if (e.target.classList.contains("overlay")) onClose(); }}>
      <div className="detail">
        <button className="detail-x" onClick={onClose}><X size={20} /></button>
        <div className="detail-stage"><Dish3D dish={dish} src={src} big /></div>

        <div className="detail-body">
          <div className="detail-top">
            <div>
              <h2 className="detail-name">{dish.name}</h2>
              <span className="detail-jp">{dish.jp} · {dish.cat}</span>
            </div>
            <span className="detail-price">£{dish.price.toFixed(2)}</span>
          </div>

          {conflict.length > 0 && (
            <div className="conflict-strip"><AlertTriangle size={15} /> {conflict.join(" · ")} — based on your preferences</div>
          )}

          <DishTags dish={dish} conflict={[]} />

          <p className="detail-explain">{dish.explainer}</p>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(dish.id, e.target.files[0])} />
          <div className="detail-actions">
            <button className="btn btn-ghost small" onClick={() => fileRef.current && fileRef.current.click()}><Upload size={15} /> Upload a real photo</button>
            <button className="btn btn-primary small" onClick={() => onAsk(dish)}><MessageCircle size={15} /> Ask about this</button>
          </div>
          <p className="detail-hint">Drag the dish to tilt it. Drop in the kitchen's real photo and the same treatment makes it feel three-dimensional.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Chat dock ---------------- */

function ChatDock({ open, setOpen, messages, input, setInput, loading, send }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, open]);
  const suggestions = ["What's lightest?", "I can't read these names", "What goes with the ramen?"];

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)}><MessageCircle size={22} /> <span>Ask the concierge</span></button>
      )}
      <div className={"chat-sheet" + (open ? " open" : "")}>
        <div className="chat-head">
          <div className="chat-title"><Sparkles size={15} /> Concierge</div>
          <button className="icon-btn" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <div className="chat-msgs">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>Ask me anything about the menu — what a dish is, what's in it, or what to order.</p>
              <div className="sugg">{suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
            </div>
          )}
          {messages.map((m, k) => (
            <div key={k} className={"bubble " + m.role}>{m.content}</div>
          ))}
          {loading && <div className="bubble assistant"><span className="typing"><i /><i /><i /></span></div>}
          <div ref={endRef} />
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
            placeholder="Ask about a dish…"
          />
          <button className="send" disabled={!input.trim() || loading} onClick={() => send(input)}>
            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------- styles ---------------- */

function css(reduce) {
  return `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

.hk-root{
  --bg:#14110f; --bg2:#1c1815; --surf:#221d19; --surf2:#2a2420;
  --ink:#f2eae0; --mut:#a89a8c; --faint:#6f655b;
  --accent:#d6492f; --accent2:#e06a45; --gold:#c9a227;
  --line:rgba(242,234,224,.10); --line2:rgba(242,234,224,.18);
  --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;
  --sans:'Manrope',system-ui,-apple-system,sans-serif;
  font-family:var(--sans); color:var(--ink);
  max-width:480px; margin:0 auto; min-height:600px;
  background:
    radial-gradient(120% 60% at 50% -10%, #2a201b 0%, rgba(42,32,27,0) 55%),
    radial-gradient(100% 50% at 90% 110%, #221a2a 0%, rgba(34,26,42,0) 50%),
    var(--bg);
  position:relative; overflow-x:hidden;
}
.hk-root *{box-sizing:border-box;}
.hk-root button{font-family:var(--sans); cursor:pointer; border:none; background:none; color:inherit;}
.display{font-family:var(--serif); font-weight:600; letter-spacing:.01em; line-height:.98; margin:0;}

.screen{padding:26px 22px 40px; animation:fade .5s ease both;}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* welcome */
.welcome{min-height:600px; display:flex; flex-direction:column; padding-top:54px;}
.w-top{flex:1;}
.kicker{display:flex; align-items:center; gap:8px; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--mut); margin-bottom:26px;}
.kicker .dot{width:7px; height:7px; border-radius:50%; background:var(--gold); box-shadow:0 0 10px var(--gold);}
.welcome .display{font-size:74px; color:var(--ink);}
.w-jp{font-family:var(--serif); font-size:19px; color:var(--gold); margin-top:8px; letter-spacing:.04em;}
.w-lede{color:var(--mut); font-size:15.5px; line-height:1.6; margin:26px 0 0; max-width:340px;}
.w-actions{display:flex; flex-direction:column; gap:12px; margin:34px 0 18px;}
.btn{display:flex; align-items:center; gap:14px; padding:16px 16px; border-radius:16px; text-align:left; transition:transform .15s, background .2s, border-color .2s; width:100%;}
.btn:active{transform:scale(.985);}
.btn-primary{background:linear-gradient(135deg,var(--accent) 0%, #b8381f 100%); color:#fff; box-shadow:0 10px 30px rgba(214,73,47,.28);}
.btn-ghost{background:var(--surf); border:1px solid var(--line2);}
.btn-ic{width:44px; height:44px; border-radius:12px; display:grid; place-items:center; background:rgba(255,255,255,.12); flex-shrink:0;}
.btn-ghost .btn-ic{background:rgba(242,234,224,.07);}
.btn-txt{display:flex; flex-direction:column; flex:1; gap:2px;}
.btn-h{font-weight:600; font-size:16px;}
.btn-s{font-size:12.5px; opacity:.8;}
.btn-go{opacity:.7; flex-shrink:0;}
.btn.small{padding:11px 16px; border-radius:12px; width:auto; display:inline-flex; gap:8px; font-weight:600; font-size:14px;}
.btn.small:disabled{opacity:.4; cursor:default;}
.w-foot{display:flex; align-items:center; gap:7px; justify-content:center; color:var(--faint); font-size:12px; margin-top:auto;}

/* voice modal */
.voice-modal{position:absolute; inset:0; background:rgba(10,8,7,.72); backdrop-filter:blur(6px); display:grid; place-items:center; z-index:40; padding:24px; animation:fade .25s ease both;}
.voice-card{background:var(--surf); border:1px solid var(--line2); border-radius:22px; padding:30px 26px; width:100%; text-align:center; display:flex; flex-direction:column; align-items:center; gap:14px;}
.mic-pulse{width:74px; height:74px; border-radius:50%; display:grid; place-items:center; background:rgba(214,73,47,.16); color:var(--accent2); border:1px solid rgba(214,73,47,.4);}
.mic-pulse.on{animation:${reduce ? "none" : "micp 1.4s ease-in-out infinite"};}
@keyframes micp{0%,100%{box-shadow:0 0 0 0 rgba(214,73,47,.45)}50%{box-shadow:0 0 0 16px rgba(214,73,47,0)}}
.voice-status{font-family:var(--serif); font-size:22px; margin:0;}
.voice-transcript{color:var(--mut); font-size:14.5px; line-height:1.55; margin:0; min-height:42px;}
.voice-err{color:#f0a08c; font-size:14.5px; line-height:1.5; margin:0;}
.voice-btns{display:flex; gap:10px; margin-top:6px;}

/* onboarding */
.onboard{min-height:600px; display:flex; flex-direction:column; padding-top:22px;}
.ob-bar{display:flex; align-items:center; gap:14px; margin-bottom:30px;}
.icon-btn{width:38px; height:38px; border-radius:11px; display:grid; place-items:center; background:var(--surf); border:1px solid var(--line); color:var(--ink); transition:background .2s;}
.icon-btn:active{background:var(--surf2);}
.icon-btn.lg{width:44px; height:44px;}
.dots{display:flex; gap:7px; flex:1;}
.dots .d{height:5px; flex:1; border-radius:3px; background:var(--line); transition:background .3s;}
.dots .d.on{background:var(--accent);}
.ob-count{font-size:12.5px; color:var(--mut); letter-spacing:.06em;}
.ob-body{flex:1; animation:fadeUp .35s ease both;}
.ob-q{font-family:var(--serif); font-weight:600; font-size:34px; line-height:1.08; margin:0 0 26px;}
.chips{display:flex; flex-wrap:wrap; gap:10px;}
.chips.col{flex-direction:column;}
.chip{padding:12px 16px; border-radius:13px; background:var(--surf); border:1px solid var(--line2); color:var(--ink); font-size:14.5px; font-weight:500; display:inline-flex; align-items:center; gap:7px; transition:all .18s;}
.chip:active{transform:scale(.97);}
.chip.sel{background:rgba(214,73,47,.16); border-color:var(--accent); color:#f5d0c5;}
.chip.row{justify-content:space-between; width:100%; padding:15px 18px;}
.chip.wide{width:100%; justify-content:center; margin-top:10px;}
.flames{display:inline-flex; gap:3px; color:var(--gold);}
.flames .muted{color:var(--faint); font-size:13px;}
.ob-note{color:var(--faint); font-size:12.5px; line-height:1.5; margin:16px 2px 0;}
.ob-next{justify-content:center; gap:8px; font-weight:600; font-size:16px; margin-top:24px;}

/* menu */
.menu{padding-bottom:120px;}
.m-head{display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px;}
.m-kicker{font-family:var(--serif); color:var(--gold); font-size:14px; letter-spacing:.05em; margin-bottom:2px;}
.display.sm{font-size:40px;}
.recs{background:linear-gradient(160deg, rgba(214,73,47,.10), rgba(201,162,39,.05)); border:1px solid var(--line); border-radius:20px; padding:18px 16px 20px; margin-bottom:22px;}
.recs-title{display:flex; align-items:center; gap:7px; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); font-weight:600;}
.rec-intro{font-family:var(--serif); font-size:21px; line-height:1.25; margin:10px 0 16px; color:var(--ink);}
.rec-scroll{display:flex; gap:13px; overflow-x:auto; padding-bottom:6px; margin:0 -2px; scrollbar-width:none;}
.rec-scroll::-webkit-scrollbar{display:none;}
.rec-card{flex:0 0 158px; text-align:left; display:flex; flex-direction:column; gap:10px;}
.rec-card.shimmer{height:200px; border-radius:16px; background:var(--surf2);}
.rec-meta{display:flex; flex-direction:column; gap:3px;}
.rec-name{font-weight:600; font-size:15px;}
.rec-reason{font-size:12.5px; color:var(--mut); line-height:1.4; min-height:34px;}
.rec-price{font-family:var(--serif); font-size:16px; color:var(--gold);}
.fallback-note{font-size:12px; color:var(--faint); margin-top:12px; display:flex; gap:6px;}
.shimmer, .shimmer-text{position:relative; overflow:hidden;}
.shimmer::after,.shimmer-text::after{content:''; position:absolute; inset:0; background:linear-gradient(90deg, transparent, rgba(242,234,224,.06), transparent); animation:${reduce ? "none" : "sh 1.4s infinite"};}
@keyframes sh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.shimmer-text{color:var(--mut); font-family:var(--serif); font-size:21px;}

.filter-bar{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 4px 8px; margin-bottom:6px; flex-wrap:wrap;}
.fb-label{font-size:12.5px; color:var(--mut); text-transform:capitalize;}
.toggle{display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--mut); padding:7px 12px 7px 8px; border-radius:20px; border:1px solid var(--line2); background:var(--surf);}
.toggle .knob{width:30px; height:17px; border-radius:10px; background:var(--surf2); position:relative; transition:background .2s; flex-shrink:0;}
.toggle .knob::after{content:''; position:absolute; top:2px; left:2px; width:13px; height:13px; border-radius:50%; background:var(--mut); transition:transform .2s, background .2s;}
.toggle.on{color:#f5d0c5; border-color:var(--accent);}
.toggle.on .knob{background:var(--accent);}
.toggle.on .knob::after{transform:translateX(13px); background:#fff;}

.cat{margin-top:18px;}
.cat-h{font-family:var(--serif); font-weight:600; font-size:24px; margin:0 0 14px; padding-bottom:10px; border-bottom:1px solid var(--line); color:var(--ink);}
.dish-list{display:flex; flex-direction:column; gap:18px;}
.dish{display:flex; gap:14px; align-items:flex-start; transition:opacity .25s;}
.dish.blocked{opacity:.5;}
.dish-img{flex:0 0 92px; width:92px;}
.dish-info{flex:1; min-width:0;}
.dish-top{display:flex; justify-content:space-between; align-items:baseline; gap:10px;}
.dish-name{font-weight:600; font-size:16px;}
.dish-jp{font-family:var(--serif); color:var(--gold); font-size:14px; margin-left:8px;}
.dish-price{font-family:var(--serif); font-size:17px; color:var(--ink); flex-shrink:0;}
.dish-blurb{color:var(--mut); font-size:13.5px; line-height:1.5; margin:5px 0 9px;}
.dish-foot{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;}
.tagrow{display:flex; gap:6px; flex-wrap:wrap;}
.badge{display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:4px 8px; border-radius:8px; border:1px solid; letter-spacing:.02em;}
.explain{display:inline-flex; align-items:center; gap:5px; font-size:12.5px; color:var(--gold); font-weight:600; white-space:nowrap;}
.explainer{margin-top:10px; font-size:13.5px; line-height:1.55; color:var(--mut); background:var(--surf); border:1px solid var(--line); border-left:2px solid var(--gold); border-radius:0 10px 10px 0; padding:11px 13px; animation:fadeUp .25s ease both;}
.m-end{text-align:center; color:var(--faint); font-size:12px; margin-top:36px; line-height:1.5; padding:0 20px;}

/* dish 3d */
.d3d-wrap{width:100%; aspect-ratio:1/1; display:grid; place-items:center;}
.d3d-card{position:relative; width:100%; height:100%; border-radius:16px; transform-style:preserve-3d; will-change:transform;}
.d3d-card.d3d-float{animation:${reduce ? "none" : "float 6s ease-in-out infinite"};}
@keyframes float{0%,100%{transform:rotateX(2deg) rotateY(-3deg) translateY(0)}50%{transform:rotateX(-1deg) rotateY(3deg) translateY(-6px)}}
.d3d-img{width:100%; height:100%; object-fit:cover; border-radius:16px; display:block;}
.d3d-plate{width:100%; height:100%; border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; overflow:hidden;}
.d3d-plate-jp{font-family:var(--serif); font-size:30px; color:rgba(255,255,255,.55); font-weight:600;}
.d3d-plate-tag{font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.32);}
.d3d-shine{position:absolute; inset:0; border-radius:16px; pointer-events:none; mix-blend-mode:screen; transition:opacity .3s;}
.d3d-rim{position:absolute; inset:0; border-radius:16px; pointer-events:none; box-shadow:inset 0 1px 1px rgba(255,255,255,.18), inset 0 0 0 1px rgba(0,0,0,.25);}

/* detail overlay */
.overlay{position:fixed; inset:0; background:rgba(10,8,7,.74); backdrop-filter:blur(8px); z-index:60; display:flex; align-items:flex-end; justify-content:center; animation:fade .25s ease both;}
.detail{background:var(--bg2); border:1px solid var(--line2); border-radius:24px 24px 0 0; width:100%; max-width:480px; max-height:92vh; overflow-y:auto; padding:0 0 28px; animation:slideUp .35s cubic-bezier(.2,.85,.25,1) both;}
@keyframes slideUp{from{transform:translateY(40px); opacity:.6}to{transform:none; opacity:1}}
.detail-x{position:absolute; top:14px; right:14px; width:38px; height:38px; border-radius:50%; background:rgba(20,17,15,.7); display:grid; place-items:center; color:var(--ink); z-index:2;}
.detail-stage{padding:30px 50px 14px; max-width:360px; margin:0 auto;}
.detail-body{padding:6px 24px 0;}
.detail-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px;}
.detail-name{font-family:var(--serif); font-weight:600; font-size:30px; margin:0; line-height:1.05;}
.detail-jp{color:var(--gold); font-family:var(--serif); font-size:15px;}
.detail-price{font-family:var(--serif); font-size:24px; color:var(--ink); flex-shrink:0;}
.conflict-strip{display:flex; align-items:center; gap:8px; background:rgba(214,73,47,.14); border:1px solid rgba(214,73,47,.4); color:#f0a08c; font-size:13px; font-weight:500; padding:10px 13px; border-radius:11px; margin-bottom:13px;}
.detail-explain{color:var(--mut); font-size:15px; line-height:1.6; margin:14px 0 18px;}
.detail-actions{display:flex; gap:10px; margin-bottom:12px;}
.detail-actions .btn.small{flex:1; justify-content:center;}
.detail-hint{color:var(--faint); font-size:12px; line-height:1.5; margin:0;}

/* chat */
.chat-fab{position:fixed; bottom:22px; left:50%; transform:translateX(-50%); display:inline-flex; align-items:center; gap:9px; background:linear-gradient(135deg,var(--accent),#b8381f); color:#fff; font-weight:600; font-size:14.5px; padding:13px 22px; border-radius:30px; box-shadow:0 12px 34px rgba(214,73,47,.4); z-index:50; max-width:440px;}
.chat-sheet{position:fixed; bottom:0; left:50%; transform:translateX(-50%) translateY(100%); width:100%; max-width:480px; height:78vh; background:var(--bg2); border:1px solid var(--line2); border-radius:24px 24px 0 0; z-index:70; display:flex; flex-direction:column; transition:transform .35s cubic-bezier(.2,.85,.25,1); box-shadow:0 -20px 60px rgba(0,0,0,.5);}
.chat-sheet.open{transform:translateX(-50%) translateY(0);}
.chat-head{display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid var(--line);}
.chat-title{display:flex; align-items:center; gap:8px; font-family:var(--serif); font-size:20px; color:var(--ink);}
.chat-msgs{flex:1; overflow-y:auto; padding:18px; display:flex; flex-direction:column; gap:11px;}
.chat-empty{color:var(--mut); font-size:14.5px; line-height:1.6;}
.chat-empty p{margin:0 0 14px;}
.sugg{display:flex; flex-direction:column; gap:8px;}
.sugg button{text-align:left; background:var(--surf); border:1px solid var(--line2); padding:11px 14px; border-radius:12px; font-size:14px; color:var(--ink); transition:background .2s;}
.sugg button:active{background:var(--surf2);}
.bubble{max-width:84%; padding:11px 15px; border-radius:16px; font-size:14.5px; line-height:1.5; animation:fadeUp .25s ease both;}
.bubble.user{align-self:flex-end; background:linear-gradient(135deg,var(--accent),#bf3d22); color:#fff; border-bottom-right-radius:5px;}
.bubble.assistant{align-self:flex-start; background:var(--surf); border:1px solid var(--line); border-bottom-left-radius:5px;}
.typing{display:inline-flex; gap:4px; padding:3px 0;}
.typing i{width:7px; height:7px; border-radius:50%; background:var(--mut); animation:${reduce ? "none" : "blink 1.2s infinite"};}
.typing i:nth-child(2){animation-delay:.2s;} .typing i:nth-child(3){animation-delay:.4s;}
@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
.chat-input{display:flex; gap:10px; padding:14px 16px; border-top:1px solid var(--line); align-items:center;}
.chat-input input{flex:1; background:var(--surf); border:1px solid var(--line2); border-radius:22px; padding:12px 17px; font-size:14.5px; color:var(--ink); font-family:var(--sans); outline:none;}
.chat-input input::placeholder{color:var(--faint);}
.send{width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,var(--accent),#b8381f); color:#fff; display:grid; place-items:center; flex-shrink:0; transition:opacity .2s;}
.send:disabled{opacity:.4; cursor:default;}
.spin{animation:spin 1s linear infinite;} @keyframes spin{to{transform:rotate(360deg)}}
`;
}
