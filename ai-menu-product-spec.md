# Interactive AI Menu — Product Spec

**Version:** 0.1 (build spec) · **Status:** ready to implement · **UI reference:** `hinoki-menu.jsx`

> A QR-scanned, mobile-web menu that knows the diner: it onboards them by voice or quick taps, recommends and explains dishes through a grounded AI concierge, shows each dish as an interactive (pseudo-3D) object, and **remembers them across visits** via an operational-memory layer (Mubit). "Hinoki" is the sample restaurant used in the prototype; the platform is multi-restaurant.

This spec turns the working prototype (`hinoki-menu.jsx`, which already implements the UI, the live AI flow, the tilt viewer, and deterministic dietary filtering in browser session state) into a real, persistent, multi-restaurant product. Where the prototype keeps everything in `useState`, the production build adds a backend, persistence, identity, the Mubit memory loop, and real menu/photo ingestion.

---

## 1. Goals & non-goals (this build)

**Goals**
- One diner journey, end to end: scan → onboard → personalised menu + recommendations → grounded chat → interactive dish view.
- The concierge is **genuinely personalised and safe**: recommendations respect allergies/diet; allergen blocking is deterministic, not model judgment.
- **Memory is the spine**, not a feature: a returning diner is recognised and greeted with continuity (the +10 "core dependency" criterion).
- A restaurant can be onboarded with a real menu + real photos and used as a template.

**Non-goals (deferred — see §13 roadmap)**
- POS / kitchen-display integration, real-time 86'ing from the till.
- Payments, cart, split-bill.
- True rotatable 3D (Gaussian splatting) — MVP ships tilt-parallax on photos.
- A full restaurant-admin CMS — MVP seeds menus via a script/JSON + a minimal upload screen.
- Learned/ML ranking — MVP uses LLM + heuristic recommendation.

---

## 2. Personas & core journeys

| Persona | Journey |
|---|---|
| **First-time diner** | Scans QR → onboards (voice or 5 taps) → sees a personalised menu, picks explained, dishes they can't eat clearly flagged → asks the concierge questions → orders (verbally / existing flow). Profile is created. |
| **Returning diner** | Scans QR → recognised → "welcome back" with continuity ("last time the carbonara ran rich for you — lighter tonight?") → menu pre-tuned from the start. |
| **Restaurant** | Provides menu data + dish photos → gets a living diner profile/CRM and a menu that does the explaining and upselling. (Admin surface is minimal in MVP.) |

---

## 3. System architecture

```
                 Diner (mobile web, QR)            Restaurant (seed script / minimal upload)
                          │                                   │
                          ▼                                   ▼
                ┌─────────────────────────── Backend / API ───────────────────────────┐
                │  auth/identity · sessions · menu · recommendations · chat · memory   │
                └───────┬───────────────────┬───────────────────────┬─────────────────┘
                        ▼                   ▼                       ▼
                 AI services         Data & memory            3D content
              Claude Messages API   Postgres + Mubit          photos on CDN
              (recs · chat ·        (+ vector / pgvector)     (tilt now; splat later)
               profile extract)
```

Maps directly onto the architecture established earlier: a thin mobile client, a backend hub, and three engines (AI, data+memory, 3D content). External integrations (POS/payments) are out of scope for this build.

**Recommended stack (fast path for the weekend):**

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | Reuse the JSX directly as components; SSR for instant load. |
| Styling | The CSS-vars system from the prototype (or Tailwind) | Tokens already defined; keep the aesthetic. |
| Backend | **Next.js Route Handlers** (`app/api/*`) | One repo, no separate service to deploy in 36h. |
| DB + storage + auth | **Supabase** (Postgres + Storage + Auth) | Database, image storage, and identity in one; pgvector available. |
| Memory | **Mubit SDK** | The differentiator (§7). |
| LLM | **Anthropic Messages API** | Recommendations, chat, profile extraction (§8). |
| 3D | CSS 3D transforms (the prototype's `Dish3D`) | No new dependency; upgrade path to splats later. |
| Host | **Vercel** | Hackathon perk (credits in `#perks-and-credits`); zero-config Next deploys. |

> For current Claude model strings, function/tool-calling, and streaming details, follow the docs map at https://docs.claude.com/en/docs_site_map.md rather than hard-coding from memory. The prototype calls `claude-sonnet-4-20250514` from inside the artifact runtime; a production backend should select a current model per docs.

---

## 4. Data model

Postgres tables. (Types shown loosely; tighten in your migration tool.)

### `restaurants`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | used in QR URL |
| name | text | "Hinoki" |
| jp | text | "炭火" |
| cuisine | text | |
| theme | jsonb | design-token overrides (see §11) |

### `menu_items`
Mirrors the prototype's dish object exactly so the JSX renders unchanged.
| col | type | notes |
|---|---|---|
| id | text pk | stable slug, e.g. `tonkotsu` |
| restaurant_id | uuid fk | |
| name | text | |
| jp | text | |
| cat | text | one of the restaurant's categories |
| price | numeric | |
| spice | int | 0–3 |
| veg | bool | |
| vegan | bool | |
| contains | text[] | allergen/diet tokens (see below) |
| hue | text | hex, drives placeholder plate |
| blurb | text | one line |
| explainer | text | "what is this" — plain language |
| image_url | text null | photo; null → placeholder |
| model_url | text null | future: splat/GLB |
| available | bool | manual 86 toggle (MVP) |

**`contains` token vocabulary** (the contract between data and the safety filter):
`gluten`, `shellfish`, `fish`, `dairy`, `egg`, `nuts` (allergens) · `pork`, `chicken`, `beef` (diet markers) · extend as needed. Allergens offered in onboarding: gluten, shellfish, fish, dairy, egg, nuts.

### `diners`
| col | type | notes |
|---|---|---|
| id | uuid pk | the durable `diner_id`; also the Mubit `user_id` |
| device_token | text null | frictionless return (cookie/localStorage) |
| phone | text null | optional, for cross-device durability |
| created_at | timestamptz | |

### `diner_profiles`
The structured snapshot (the "blue box", §6). Source of truth is consolidated from Mubit; this is the fast-read cache.
| col | type | notes |
|---|---|---|
| diner_id | uuid pk fk | |
| diet | text | none/vegetarian/vegan/pescatarian/halal |
| allergies | text[] | subset of allergen tokens |
| spice | int | 0–3 |
| adventure | int | 0–2 |
| appetite | text | light/normal/feast |
| likes | text[] | dish ids / flavour tags (grows over time) |
| dislikes | text[] | |
| updated_at | timestamptz | |

### `sessions`
| col | type | notes |
|---|---|---|
| id | uuid pk | the Mubit `run_id` basis |
| diner_id | uuid fk | |
| restaurant_id | uuid fk | |
| table_label | text | "Table 12" |
| started_at | timestamptz | |
| ended_at | timestamptz null | triggers consolidation |
| context | jsonb | occasion, party size, mood |

### `events` (lightweight signal log)
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| session_id | uuid fk | |
| diner_id | uuid fk | |
| dish_id | text null | |
| kind | text | view / dwell / ask / order / rate |
| value | jsonb | rating, dwell ms, etc. |
| at | timestamptz | |

### `orders` (stub for MVP — captures intent, no POS)
`id, session_id, items jsonb, total numeric, status, created_at`.

---

## 5. Identity strategy (the linchpin)

No identity = no memory = the whole thesis collapses, so decide this first.

**MVP:** frictionless device identity. On first load, mint a `device_token` (cookie + localStorage), create a `diner` row keyed to it. Return visits on the same device resolve to the same `diner_id` automatically. Offer an optional **"save my taste"** that captures a phone number (Supabase Auth / SMS) to make the profile durable and cross-device.

**Resolution order on scan:** phone (if known) → device_token → new anonymous diner.

**Privacy (UK / GDPR):** the cross-restaurant profile (the moat) is also the consent boundary. MVP: explicit opt-in copy at onboarding ("remember my preferences across Hinoki and partner restaurants"), and a "forget me" action that deletes the diner + profile + Mubit `user_id` data. Treat the profile as **diner-owned and portable**, not restaurant-siloed — that is what makes the taste passport (§13) legal and possible.

---

## 6. Diner profile spec (the blue box)

Five layers, in order of how strictly the agent obeys them:

1. **Hard constraints** — allergies, diet. Safety-critical, retrieved every visit, never violated.
2. **Taste shape** — spice, adventure, flavour/texture leanings, ingredient loves/hates.
3. **Dish history** — ordered / rated / raved / sent back.
4. **Behaviour & context** — appetite, spend, decision style, how it shifts by occasion.
5. **Cross-restaurant signal** — patterns no single venue could see (platform-wide).

**How it's built:**
- **Seeded** at onboarding (Q&A → structured directly; voice → LLM extraction, §8).
- **Implicit signals** during the visit: dwell, what they ask, what they viewed but skipped (logged to `events`).
- **Explicit signals**: the order, an optional one-tap post-meal rating.
- **Consolidated** on session end: raw events distilled into durable facts (Mubit `commit` + profile update). A preference **hardens only on repetition** — one data point is a guess, several is a pattern; recent signals weigh more so tastes can drift.

---

## 7. Mubit memory integration (the differentiator → +10)

> Mubit is operational memory for AI agents. The surface below is assembled from Mubit's public site + SDK; **confirm exact method names/signatures and your keys in `#sponsor-mubit`** before wiring. Concepts are correct regardless of the precise calls.

Two surfaces:
- **Auto mode:** `mubit.learn.init(api_key, agent_id)` wraps LLM calls to auto-capture outcomes and auto-inject memory.
- **State primitives:** `focus(context, run_id)` (write working memory) · `drift(run_id)` (read working memory) · `commit(Trace)` (write long-term episodic) · `reminisce(query, user_id, k, run_id)` (recall) · plus `storage.insert/search` for durable per-`user_id` facts.

**Scopes:** `user_id = diner_id` (long-term, platform-wide) · `run_id = "{restaurant_id}:{diner_id}:{session_ts}"` (per visit) · `restaurant_id` carried in metadata so recall can cross or scope to a venue.

### Event → memory operation map (the heart of the build)

| App event | Mubit op | Effect |
|---|---|---|
| QR scan / app open | `reminisce(query="preferences, allergies, past dishes & reactions", user_id, k=8)` | Recognise diner; seed profile + "welcome back" line |
| Onboarding complete | `storage.insert(fact, user_id)` per durable preference (or `commit` an onboarding episode) | Seed the blue box on day one |
| Session start (table) | `focus("party, occasion, browsing X", run_id)` | Open working memory for this visit |
| Chat / browse | read `drift(run_id)` + profile to ground the reply; after notable turns `focus("flagged carbonara as rich", run_id)` | Live context |
| Dish view / dwell / ask | log to `events`; optionally `focus` | Implicit signal |
| Order placed | `commit(Trace{ input: order + context, user_id, run_id })` | Episodic record |
| Session end | **Consolidation**: distil session → `commit` episodic + update durable facts via `storage.insert`/profile write | Profile gets richer; recommendations improve next time |
| Next scan (any venue) | `reminisce(...)` returns facts from prior visits | Cross-restaurant continuity |

```js
// pseudocode — confirm signatures in #sponsor-mubit
mubit.learn.init({ apiKey: MUBIT_KEY, agentId: "dish-concierge" });

// on scan
const memory = await mubit.state.reminisce({
  query: "dining preferences, allergies, dishes ordered and reactions",
  userId: dinerId, k: 8,
});

// open the visit
const runId = `${restaurantId}:${dinerId}:${Date.now()}`;
await mubit.state.focus("Party of 2, date night, browsing sushi", runId);

// after the meal
await mubit.state.commit({
  input: "Ordered cacio e pepe, loved it; skipped dessert",
  userId: dinerId, runId,
});
```

**What makes it a core dependency (not bolted-on):** remove Mubit and the concierge re-meets every guest from zero — no continuity, no improving recommendations, no "welcome back". The compounding `commit → reminisce` loop *is* the product. Make it **judge-verifiable** by demoing a returning scan that visibly pre-loads a prior preference.

---

## 8. AI / LLM contracts

All AI runs through the **Anthropic Messages API**. Three jobs, each with a strict contract. **Safety rule that overrides everything: allergen and diet blocking is computed in code (§9), never delegated to the model.** The model is *told* the profile and instructed never to violate it, but the UI's hard block is deterministic.

### 8.1 Recommendations
Input: the diner profile + the restaurant's menu (id, name, blurb, cat, spice, veg, vegan, contains). Output: **JSON only**.
```json
{ "intro": "string (≤18 words, addressed to the diner)",
  "picks": [ { "id": "menu_item_id", "reason": "string (≤13 words, second person)" } ] }
```
Rules: exactly 3 picks, all from the menu, **none in conflict** with allergies/diet; honour spice and appetite. Parse defensively (strip ```` ```json ```` fences, slice first `{`…last `}`). On any failure → local heuristic recommender (already in the prototype: filter conflicts, score by spice closeness, appetite, adventurousness).

### 8.2 Voice → profile extraction
Input: the spoken transcript. Output: **JSON only**.
```json
{ "diet": "none|vegetarian|vegan|pescatarian|halal",
  "allergies": ["gluten|shellfish|fish|dairy|egg|nuts"],
  "spice": 0, "adventure": 1, "appetite": "light|normal|feast" }
```
Validate every field against the allowed vocab; default unknowns to `none / [] / 1 / 1 / normal`.

### 8.3 Chat concierge
System prompt rules (verbatim intent from the prototype):
- May **only** discuss dishes on this menu (passed in context); never invent dishes or ingredients.
- Respect the diner's profile; never suggest a conflict; if asked about one, warn plainly.
- Explain unfamiliar Japanese dishes in one plain sentence.
- Friendly, brief (≤55 words), no markdown/lists.
Messages = full chat history. Fallback on error: a friendly "tap any dish for what it is / what's in it / whether it fits you."

### 8.4 Tap-to-explain
MVP: served from the static `explainer` field (instant, offline-safe). Deeper questions route to the chat (8.3).

---

## 9. Deterministic safety filter (must not be AI)

The `conflicts(dish, profile)` function (in the prototype) is the safety contract. Formalise and unit-test it:

```ts
function conflicts(dish, profile): string[] {
  const out: string[] = [];
  for (const a of profile.allergies)
    if (dish.contains.includes(a)) out.push(`Contains ${label(a)}`);
  const has = (...k) => k.some(x => dish.contains.includes(x));
  if (profile.diet === "vegetarian" && has("fish","shellfish","pork","chicken","beef")) out.push("Not vegetarian");
  if (profile.diet === "vegan"       && has("fish","shellfish","pork","chicken","beef","dairy","egg")) out.push("Not vegan");
  if (profile.diet === "pescatarian" && has("pork","chicken","beef")) out.push("Has meat");
  if (profile.diet === "halal"       && has("pork")) out.push("Contains pork");
  return [...new Set(out)];
}
```
A conflicting dish is **always shown with a red flag**, never silently hidden (a hidden allergen is more dangerous than a visible one). The "hide what I can't eat" toggle is an opt-in convenience layer on top. Edge case to keep: Agedashi Tofu flags **not vegetarian** because dashi contains bonito — exactly the hidden trap the product exists to catch. Data accuracy here is the real work; review `contains` per dish with the kitchen.

---

## 10. 3D dish viewer spec (`Dish3D`)

**MVP behaviour (tilt-parallax pseudo-3D):** a flat photo treated as a lit, tiltable object.
- Container `perspective`: 700 (card) / 900 (detail).
- Pointer/touch position → `rotateY = (x-0.5)·range`, `rotateX = (0.5-y)·(range-4)`; `range` = 18 (card) / 30 (detail).
- A radial **specular highlight** follows the pointer (`screen` blend) → "wet"/lit look.
- **Drop shadow** offsets opposite the tilt → depth.
- Detail view adds a subtle **idle float** when not interacting.
- All motion behind `prefers-reduced-motion`.

**Image pipeline:**
1. Default: per-dish CSS **placeholder plate** tinted by `dish.hue` (looks intentional, never "broken").
2. Restaurant photo: stored in Supabase Storage, `image_url` on the item; MVP also supports per-dish in-app upload (the prototype's `Upload` action) for live demos.
3. Optional AI clean-up: background removal / relight to a consistent plate before storing.
4. **Realism ladder:** placeholder → cleaned photo → (later) **Gaussian splat from a ~20s orbit video** for true rotatable realism — `model_url` + a splat viewer, swappable behind the same component.

**Acceptance:** smooth tilt on desktop + touch; graceful fallback if an image fails to load; no layout jank in the scrolling menu.

---

## 11. Design system (from the prototype)

Keep these tokens so the real build matches the artifact. Aesthetic: refined, moody premium izakaya — warm near-black, single vermilion accent + gold, elegant serif display.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#14110f` | page base (with warm radial glows) |
| `--bg2` / `--surf` / `--surf2` | `#1c1815` / `#221d19` / `#2a2420` | sheets / cards / raised |
| `--ink` / `--mut` / `--faint` | `#f2eae0` / `#a89a8c` / `#6f655b` | text primary / muted / hint |
| `--accent` / `--accent2` | `#d6492f` / `#e06a45` | primary action, selection |
| `--gold` | `#c9a227` | accents, prices, Japanese text |
| `--line` / `--line2` | `rgba(242,234,224,.10 / .18)` | borders |
| Display font | **Cormorant Garamond** (600) | restaurant name, dish names, questions |
| Body font | **Manrope** | everything else |
| Radii | cards 16 · buttons/chips 16/13 · badges 8 | |
| Motion | tilt (instant in / .55s ease out) · float 6s · fade .5s · sheet slideUp .35s | |

Restaurants can override `theme` (colors, fonts) per `restaurants.theme`.

---

## 12. Screen-by-screen UI map (→ JSX components)

The prototype already implements all of these; production swaps in-memory state for API/persistence and adds the memory loop.

| Screen | Component | States / data | Production changes |
|---|---|---|---|
| **Welcome** | `Welcome` | scan kicker, two onboarding entry points, voice modal | Resolve identity on mount; if returning, route to a "welcome back" variant seeded from `reminisce`. |
| **Onboarding (5 steps)** | `Onboarding` | diet → allergies → spice → adventure → appetite; progress dots | On finish: write `diner_profiles`, seed Mubit, `fetch /recommendations`. |
| **Voice capture** | inside `Welcome` | Web Speech API transcript → `/profile/extract` | Needs mic permission; keep Q&A as the reliable path. |
| **Menu** | `Menu` | AI intro + 3 rec cards; live dietary filter; categories with dish cards; badges + conflict flags; tap-to-explain | Menu from `/menu/:slug`; recs from API w/ heuristic fallback; log `view`/`dwell` to `events`. |
| **Dish detail** | `DishDetail` | big `Dish3D`, explainer, tags, conflict strip, upload, "ask about this" | Upload → Storage; "ask" deep-links chat. |
| **Concierge chat** | `ChatDock` | bottom sheet, suggestions, grounded replies | `/chat` with profile+menu context + Mubit working memory. |
| **Dish viewer** | `Dish3D` | tilt/shine/shadow/float; placeholder ↔ photo | `image_url`/`model_url`; splat upgrade later. |
| Atoms | `Badge`, `DishTags` | allergen/veg/spice pills | unchanged |

---

## 13. Backend API (routes the client calls)

Next.js Route Handlers (`app/api/...`). All JSON.

| Method · Route | Body / params | Returns |
|---|---|---|
| `POST /api/session` | `{ slug, table?, deviceToken? }` | `{ dinerId, runId, returning, memory? }` — resolves identity, opens session, `reminisce` |
| `GET /api/menu/:slug` | — | `{ restaurant, categories, items[] }` |
| `POST /api/profile` | `{ dinerId, profile }` | `{ ok }` — writes profile, seeds Mubit |
| `POST /api/profile/extract` | `{ transcript }` | `{ profile }` — LLM extraction (8.2) |
| `POST /api/recommendations` | `{ dinerId, slug }` | `{ intro, picks[] }` (8.1) |
| `POST /api/chat` | `{ dinerId, runId, slug, messages[] }` | `{ reply }` (8.3) |
| `POST /api/events` | `{ runId, dinerId, kind, dishId?, value? }` | `{ ok }` |
| `POST /api/memory/commit` | `{ dinerId, runId, input }` | `{ ok }` — episodic write |
| `POST /api/session/end` | `{ runId }` | `{ ok }` — triggers consolidation |
| `POST /api/upload` | image (multipart) `+ { itemId }` | `{ imageUrl }` |

Keep all Claude + Mubit keys server-side; the client never holds them.

---

## 14. Repo structure

```
/app
  /(diner)/[slug]/page.tsx        # the menu app (renders the JSX components)
  /api/...                        # route handlers above
/components                       # Welcome, Onboarding, Menu, DishDetail, ChatDock, Dish3D, Badge, DishTags
/lib
  claude.ts                       # Messages API wrapper + JSON parse
  mubit.ts                        # init + focus/drift/commit/reminisce wrappers
  conflicts.ts                    # deterministic safety filter (unit-tested)
  recommend.ts                    # heuristic fallback
  db.ts                           # supabase client
/data/seed-hinoki.json            # sample restaurant + menu (from the prototype's MENU)
/styles/tokens.css                # design tokens (§11)
```

---

## 15. Build plan (scoped to the remaining hackathon window)

Milestones from the hacker pack: **M2 = Sat 8pm**, **M3 = Sun 8am = code freeze**. Lock the **menu_item + profile schemas first** — that single contract unblocks parallel work.

**Parallel tracks (assign by person):**
- **Frontend** — port the JSX into Next components; wire to the API contracts (mock first).
- **AI** — `claude.ts` + the three contracts (recs / extract / chat) + JSON parsing + fallback.
- **Data & memory** — Supabase schema, identity (§5), the Mubit event map (§7).
- **3D / content** — `Dish3D` polish + upload + capture one real restaurant's photos.

**→ By M2 (tonight): the core loop is live.** Scan → onboard (Q&A) → personalised menu + AI recs → grounded chat → tilt viewer, persisted to Postgres for one seeded restaurant. Post progress (build-in-public earns bonus points).

**→ By M3 (Sun 8am freeze):**
- The **memory loop** wired: returning scan recognises the diner and pre-loads a prior preference (the demo-able +10 moment).
- One **real restaurant** loaded with real menu + photos (this is your proof and your "Effect"/collaboration evidence).
- Polish, voice as a flourish, `prefers-reduced-motion`, error/fallback states.
- **Capture the receipts** (judging is evidence-first): record the returning-diner moment; onboard real people; if a restaurant uses it / pays, document it.

**Evidence to bank (maps to the rubric):** it works live end-to-end (judges complete the flow) · depth of proof (≥3 artifacts: real diners onboarded, a real restaurant's menu, the memory continuity recorded) · honesty (real numbers only) · Mubit as a verified core dependency (+10) · dated build-in-public posts (+up to 12).

---

## 16. Acceptance criteria (MVP done)

- [ ] QR/URL opens the menu for a given restaurant slug; first paint is instant, 3D streams behind it.
- [ ] Onboarding (Q&A) produces a valid profile and persists it; voice path works where mic is permitted, else degrades to Q&A.
- [ ] "For you" shows 3 valid, non-conflicting picks with reasons; heuristic fallback fires if the LLM call fails.
- [ ] Allergen/diet conflicts are flagged on every relevant dish; "hide what I can't eat" filters live; flags never disappear.
- [ ] Chat answers only from the menu, respects the profile, explains unfamiliar dishes, stays brief.
- [ ] Dish detail tilts smoothly on touch + desktop; a real uploaded photo renders with the effect; failures fall back to the placeholder plate.
- [ ] A returning diner (same device or phone) is recognised and greeted with at least one carried-over preference. **(The +10.)**
- [ ] All keys server-side; "forget me" deletes diner + profile + Mubit data.

---

## 17. Open decisions

- **Identity durability** — device token only (frictionless, leaks on device change) vs. push phone capture harder (durable, more friction). MVP: device + optional phone.
- **Cross-restaurant consent** — opt-in copy + portability now; revisit data-sharing terms before onboarding multiple venues.
- **Vector store** — Mubit's own recall vs. pgvector for menu semantic search. MVP: lean on Mubit for memory; static menu needs no vector yet.
- **POS / 86'ing** — deferred; MVP uses a manual `available` toggle.
- **Splatting** — pilot on 2–3 hero dishes post-hackathon; keep `Dish3D` swappable.

---

## 18. Roadmap beyond MVP

Gaussian-splat dishes · POS + KDS + real-time 86'ing · cart / split-pay · the **taste passport** (diner-owned profile across all venues) · taste-based discovery network · kitchen co-pilot (menu R&D from aggregate preferences) · predictive prep. The critical paths there are the 3D content pipeline (at scale) and POS partnerships — both started early, both routed around by everything else.
