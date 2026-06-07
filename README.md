<div align="center">

# 🫧 Bubble — the menu that thinks

**An AI-native, memory-aware QR menu platform.** A restaurant photographs its menu and goes live in minutes; diners scan a table code and meet a menu that reads itself, keeps them safe around allergies, answers questions like a concierge, remembers their taste — and keeps the night going after dessert.

**▶ Live:** [tavo-ten.vercel.app](https://tavo-ten.vercel.app) · Mobile-web first (QR → phone)

</div>

---

## Why it matters

Paper menus are dumb, static, and monolingual. Digital menus are usually just a PDF behind a QR code. **Bubble turns the menu into a product surface:**

- **Restaurants** onboard a full menu — including a dense, multi-page **Chinese menu** — in minutes, with **no manual data entry**: a vision model reads every dish, infers hidden allergens, and the system asks only the questions that matter for that cuisine.
- **Diners** get an allergy-safe, personalised, bilingual experience with a grounded AI concierge — and a frictionless post-dinner moment that **drives new revenue** for the restaurant via affiliate-linked nearby events.
- **Everything is evidenced** — every onboarding step and usage signal is written to a durable analytics layer, so growth and product usage are measurable, not anecdotal.

Two-sided, AI-native, and built to be **frictionless on both ends**.

---

## ✨ What it does

### For the restaurant — a 4-step studio (`/studio`)
1. **Sign in** with email + password (instant account, no email round-trip).
2. **Snap the menu** → a **vision model OCRs every dish** — name, price, category, spice, dietary flags — directly from a photo, **in any language**. A Chinese menu comes back **bilingual** (`宫保鸡丁` + "Kung Pao Chicken").
3. **Review dish-by-dish**, add a photo per dish (uploaded straight to cloud storage).
4. **Publish** → the restaurant, menu, images, and a cuisine-adaptive question set persist to Postgres, and the venue gets its **own QR code** linking to its live menu.

> **Menu intelligence runs in the background at publish:** an LLM pass enriches each dish's allergen list (catching the hidden ones — soy in soy sauce, peanuts in satay, sesame across East-Asian dishes) and derives which allergen/diet questions to ask diners. It's *additive and fail-soft* — it can only add safety, never remove it.

### For the diner — a menu that knows you (`/r/[slug]`)
- **Zero-friction entry** — scan → a quick, **cuisine-adaptive** taste profile (a Chinese venue asks about soy/sesame/peanuts; a pizzeria asks about gluten/dairy).
- **Memory-aware** — a returning device is recognised and skips straight to the menu; a new device onboards fresh.
- **Deterministic allergy safety** — diet/allergen conflicts are *computed in code*, never guessed by the model; unsafe dishes are flagged and the AI is forbidden from recommending them.
- **Grounded concierge chat** — an LLM that only talks about *this* menu, personalises from memory, and renders clickable **dish cards**; **voice input** via the Web Speech API.
- **Cinematic dish detail** — 3D-tilt dish art, allergen flags, kitchen notes, and an inline "ask about this dish."
- **Bilingual UI** — English ⇄ 日本語 toggle across the whole experience.
- **Correct currency** — a Chinese menu prices in ¥, not £ — derived per restaurant.
- **Post-dinner events** — as the meal winds down, real nearby events (live music, comedy, nightlife) surface from live providers; "Get tickets" opens an **affiliate-tagged** link, turning an after-dinner moment into **restaurant revenue**.
- **Basket → call the waiter** — diners build a basket and call a waiter to place it (notified over WhatsApp).

### For the operator — evidence & control
- **Restaurant dashboard** (`/dashboard`) — live guests, event-referral revenue, and a printable per-restaurant **QR**.
- **Diagnostics** (`/diagnostics`) — durable, queryable proof of every onboarding run (step-by-step timeline) and product usage, surviving restarts.

---

## 🏗️ Architecture at a glance

```
                       ┌──────────────────────────── Supabase ────────────────────────────┐
  Owner ──/login──▶ Studio ──OCR──▶ Review ──Publish──▶ Postgres (RLS)  ·  Storage  ·  Auth │
   (email+pwd)        │   (Fireworks vision, bilingual)   restaurants · menu_items · images  │
                      └── telemetry ─────────────────────▶ onboarding_runs / _events         │
                                                          └──────────────────────────────────┘
                                                                      ▲  reads by slug
  Diner ──QR scan──▶ /r/[slug] ──▶ memory-aware menu ──▶ grounded AI chat (Fireworks)
   (device memory)        │           allergy-safe recs        post-dinner events ──▶ affiliate $
   Mubit ◀── recall ──────┘           (deterministic safety)   (Ticketmaster · SeatGeek · Skiddle)
                          └── usage ──▶ app_usage_events (durable)
```

**Design principle: heavy/agentic work happens *once* (at onboarding), cached on the restaurant — so the diner runtime stays deterministic, instant, and cheap.**

---

## 🛠️ Tech stack — and exactly how each piece is used

| Technology | Role in Bubble |
|---|---|
| **Next.js (App Router) + React + TypeScript (strict)** | Full-stack foundation — server components, route handlers, and `middleware.ts` for auth-gating `/studio` + `/dashboard`. |
| **Supabase — Postgres + Row-Level Security** | System of record: `restaurants`, `menu_items`, plus telemetry tables. RLS is owner-scoped (a restaurant can never read another's data or diner PII). Schema is versioned in `supabase/migrations/` (`0001`–`0004`). |
| **Supabase Auth** | Restaurant-owner accounts via email + password (created pre-confirmed server-side, so no email delivery is required). SSR session cookies via `@supabase/ssr`. |
| **Supabase Storage** | Dish photos live in a public-read `dish-images` bucket; menu items reference the public URLs. |
| **Fireworks AI** (OpenAI-compatible, `kimi-k2p6`) | The brain, used four ways: **(1) Vision OCR** — reads menu photos into structured bilingual dishes; **(2) Menu intelligence** — enriches allergens + derives diner questions at publish; **(3) Grounded concierge chat** — menu-only, memory-personalised, returns dish ids for cards; **(4) Intent parsing** — turns a diner's free-text "something funny and cheap for two" into an event query. Wrapped behind provider-agnostic modules (`lib/llm.ts`, `lib/ai/provider.ts`). |
| **Mubit** (`@mubit-ai/sdk`) | Durable, per-device diner memory — recall on arrival, learn during the visit, consolidate on the way out, so taste context follows the diner. |
| **Events providers — Ticketmaster Discovery · SeatGeek · Skiddle** | Live nearby-events aggregation behind one `EventProvider` interface; merged, deduped, ranked by vibe + distance, with **affiliate deep links** (Skiddle pays 30%) and a seeded fallback so the demo always works. |
| **Twilio (WhatsApp)** | Notifies the restaurant when a table is ready to order or calls a waiter. |
| **`qrcode`** | Generates each restaurant's table QR (encodes `/r/<slug>`) on the dashboard. |
| **Web Speech API** | Hands-free voice input in the concierge chat and event intent. |
| **i18n (custom, English ⇄ 日本語)** | Whole-experience locale toggle; menus also carry native-language dish names. |
| **Design system** | Hand-authored CSS (`app/globals.css`) — Cormorant Garamond + Manrope, a warm izakaya palette, `lucide-react` icons. No UI framework, no bloat. |
| **Vercel** | Production hosting & CI build (`tavo-ten.vercel.app`); Supabase CLI for migrations. |

Every external integration sits behind a **clean, `server-only` module** and **degrades gracefully** — missing a key never crashes the app; AI falls back to heuristics, events to seeded data, notifications no-op.

---

## 🧠 The AI, in depth

- **Bilingual menu OCR** — one vision call turns photos into `{ name, nativeName, category, price, spice, dietary, allergens }`. Resilient parsing **salvages a partial result** if a very large menu (100+ dishes) overruns the token budget, instead of failing wholesale.
- **Menu intelligence enrichment** — a second pass infers a fuller, UK-FSA-aligned 14-allergen list per dish and recommends the cuisine-relevant question set, cached on the restaurant record.
- **Grounded concierge** — strict system prompt + the live menu + the diner's profile/memory + a *deterministically computed* "unsafe" list per dish. Safety is never left to the model.
- **Intent understanding** — free-text/voice → structured event intent (group, vibe, budget), LLM with a deterministic keyword fallback.

---

## 🚀 Getting started

**Prerequisites:** Node 18+ (tested on 22).

```bash
npm install
cp .env.example .env.local     # fill in keys (all optional — see below)
npm run dev                    # http://localhost:3000 → /r/hinoki
```

The app **runs with zero external keys** — a seeded in-memory restaurant (Hinoki, a Tokyo izakaya) serves the demo, and AI/memory/events/notifications fall back to safe heuristics or seeded data. Add keys to light each capability up.

### Provision Supabase (for real onboarding + persistence)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push              # applies migrations 0001–0004 (schema, RLS, storage, telemetry)
```

---

## 🔑 Environment variables

Full list in [`.env.example`](.env.example). Server-only secrets must never use a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin (bypasses RLS for trusted writes) |
| `FIREWORKS_API_KEY` · `FIREWORKS_MODEL` · `FIREWORKS_VISION_MODEL` | LLM + vision (`kimi-k2p6`) |
| `MUBIT_API_KEY` | Cross-visit diner memory |
| `TICKETMASTER_API_KEY` · `SEATGEEK_CLIENT_ID` · `SKIDDLE_API_KEY` | Live events |
| `SKIDDLE_AFFILIATE_ID` · `TICKETMASTER_AFFILIATE_ID` · `SEATGEEK_AFFILIATE_ID` | Referral attribution |
| `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_WHATSAPP_FROM` · `RESTAURANT_WHATSAPP_TO` | WhatsApp alerts |
| `DASHBOARD_TOKEN` · `DIAGNOSTICS_TOKEN` | Gate `/dashboard` and `/diagnostics` in production |

---

## 🗂️ Project structure

```
app/
  page.tsx                  → redirects to the demo restaurant
  login/  auth/callback/    owner email+password auth
  studio/                   restaurant onboarding studio (auth-gated)
  dashboard/                restaurant dashboard: live guests, referrals, QR
  diagnostics/              durable onboarding + usage evidence
  r/[slug]/                 the diner menu (Supabase-backed, slug-routed)
  api/
    auth/password           email+password sign-in / sign-up
    studio/extract-menu     vision OCR
    studio/publish          publish restaurant + menu (text)
    studio/upload-image     per-dish photo upload (keeps requests small)
    studio/track            durable onboarding telemetry
    events/{search,refer,parse-intent,referrals}   post-dinner events
    chat/ recommendations/ memory/ analytics/ ...  diner runtime
middleware.ts               protects /studio + /dashboard
components/
  DinerApp · ChatPanel · Dish3D · studio/* · events/* · dashboard/* · cart/ · service/
lib/
  llm.ts · ai/provider.ts   provider-agnostic LLM + vision
  studio/menu-extract.ts    OCR + resilient parse
  menu/enrich.ts            menu-intelligence enrichment
  menu/cuisine-allergens.ts cuisine → allergen/diet/currency maps
  currency.tsx              per-restaurant money formatting
  db/queries.ts             typed Supabase data layer
  telemetry/                durable onboarding + usage events
  mubit.ts · useDinerMemory durable diner memory
  conflicts.ts              deterministic allergy/diet safety
supabase/migrations/        schema · RLS · storage · telemetry (0001–0004)
```

---

## 🧰 Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

---

## 🛡️ Engineering principles

- **Safety is deterministic.** Allergy/diet conflicts are computed in code (`lib/conflicts.ts`); the AI is constrained by them, never trusted to enforce them.
- **AI-heavy, runtime-light.** Expensive model work happens once at onboarding and is cached, keeping the diner experience instant and inexpensive.
- **Graceful degradation everywhere.** Every provider is optional; the app stays fully usable without any keys.
- **Security by default.** Provider secrets are `server-only`; Supabase RLS is owner-scoped; restaurants can't read diner PII.
- **Evidence over anecdote.** Onboarding and usage are persisted to a durable analytics layer you can query directly.
