# Bubble — a memory-aware QR menu

Scan a table QR code and walk straight into a menu that explains itself,
recommends safely around your diet and allergies, answers questions in a
grounded concierge chat, and **remembers you** — so the next restaurant you
visit already knows what you like.

Built with Next.js (App Router) + TypeScript. Mobile-web first (QR → phone);
desktop is secondary. The demo restaurant is **Hinoki**, a Tokyo izakaya.

---

## What's in the box

**Diner experience** (`/r/[slug]`)
- Zero-friction entry: scan → personalize once (diet, allergies, spice,
  appetite) → browse.
- **Menu / Chat tabs** — a sleek segmented switch between the menu and a
  ChatGPT-style concierge.
- **Grounded concierge chat** — answers stay tied to the actual menu and render
  clickable **dish artifact cards**; **voice input** via the Web Speech API.
- **Dish detail** with a 3D tilt view, allergen/diet conflict flags, kitchen
  notes, and an **inline "ask about this dish"** box (no tab switch).
- **Deterministic safety** — allergy/diet conflicts are computed
  (`lib/conflicts.ts`), never model-guessed.
- In-service **ordering + cart**, **call-a-human** service, and a restaurant
  **kitchen view** (`/r/[slug]/kitchen`).

**Restaurant studio** (`/studio`)
- A frictionless 5-step onboarding: basics → menu-snapshot photos → dishes
  (dietary info, photos, kitchen notes, exclusion rules) → rules → review.
- Publishing writes to a shared store and returns a diner link (`/r/<slug>`).

**Cross-restaurant memory**
- A device-stable diner id is the durable key. The Mubit loop recalls prior
  preferences on arrival, learns new ones during the visit, and consolidates on
  the way out — so context follows the diner across venues.

**Diagnostics dashboard** (`/diagnostics`)
- A live, in-process usage view: QR scans, unique vs. returning diners, and
  breakdowns by restaurant, table, country, device, source, and use-case
  (chat, dish views, orders, service calls) plus a recent-activity feed.
- Events are captured best-effort from the client (`lib/analytics-client.ts`)
  and enriched server-side. Gate the page in production with
  `DIAGNOSTICS_TOKEN` (`/diagnostics?key=<token>`).

---

## The personalization loop

```
QR scan → stable dinerId (device-persistent, shared across restaurants)
   → reminisce   recall durable memory               (POST /api/memory/reminisce)
   → recalled facts feed recommendations + chat
   → learn       write global lessons from prefs      (POST /api/memory/learn)
   → consolidate distill the visit on the way out     (POST /api/memory/consolidate)
```

`dinerId → Mubit user_id`, `runId → session_id`, and preferences are stored as
`lesson_scope: "global"` so they recall across sessions and restaurants. Every
call is best-effort — the app degrades gracefully when a provider is absent.

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Hand-written CSS (`app/globals.css`), Cormorant Garamond + Manrope, `lucide-react` icons |
| Database / auth / storage | Supabase (Postgres + RLS + Storage) |
| LLM | Fireworks (OpenAI-compatible) via a provider-agnostic wrapper |
| Memory | Mubit (`@mubit-ai/sdk`) |
| Notifications | Twilio WhatsApp (optional) |
| Voice | Web Speech API |

Each integration lives behind a clean, server-only module so it can be swapped
without touching callers.

---

## Getting started

**Prerequisites:** Node 18+ (tested on 22).

```bash
npm install
cp .env.example .env.local   # then fill in keys (see below)
npm run dev                  # http://localhost:3000  → redirects to /r/hinoki
```

The app **runs with zero external keys** — the menu is served from an in-memory
store seeded from fixtures, and AI/memory/notifications fall back to safe
heuristics/mock mode. Add keys to light each feature up.

### Optional: provision Supabase

The schema, RLS policies, and a `dish-images` storage bucket live in
`supabase/migrations/0001_init.sql`.

```bash
# hosted project
supabase login
supabase link --project-ref <your-project-ref>
supabase db push

# or fully local (needs Docker)
supabase start && supabase db reset
```

Then enable **Anonymous sign-ins** (and manual linking) in the project's Auth
settings — `supabase/config.toml` already enables them for local dev.

---

## Environment variables

See [`.env.example`](.env.example) for the full list. Server-only secrets must
never go in a `NEXT_PUBLIC_` var.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for Supabase | public client |
| `SUPABASE_SERVICE_ROLE_KEY` | for Supabase | server admin (bypasses RLS) |
| `FIREWORKS_API_KEY` | optional | LLM (recs, chat, profile extraction) |
| `MUBIT_API_KEY` | optional | cross-restaurant memory |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` / `RESTAURANT_WHATSAPP_TO` | optional | WhatsApp order alerts |
| `DIAGNOSTICS_TOKEN` | optional | gate `/diagnostics` (require `?key=<token>`) |

---

## Project structure

```
app/
  r/[slug]/            diner menu (+ /kitchen view)
  studio/              restaurant onboarding studio
  diagnostics/         live usage dashboard (token-gated)
  api/
    chat/ recommendations/ profile/   grounded AI endpoints
    memory/                            reminisce · learn · consolidate
    studio/publish                     publish a restaurant
    orders/ service-call/              ordering + call-a-human
    events/ analytics/ session/        usage capture + diagnostics + session
components/
  DinerApp.tsx         diner experience shell (tabs, detail, memory wiring)
  ChatPanel.tsx        concierge chat + artifacts + voice
  Dish3D.tsx           3D tilt dish view
  studio/              onboarding wizard + steps
  cart/ service/ feed/ ordering, service dock, dish reels
lib/
  llm.ts               provider-agnostic callModel() (Fireworks)
  mubit.ts             memory loop (reminisce/commit/consolidate/forget)
  supabase.ts          browser client          supabase-server.ts  service/SSR
  auth.ts              restaurant magic-link    auth-diner.ts       anon diner
  db/                  typed queries + Database types
  store/               in-memory restaurant store (DB swap-in seam)
  analytics/           in-process usage event store + diagnostics summary
  conflicts.ts recommend.ts  deterministic safety + heuristic recs
  useGroundedChat.ts useVoiceInput.ts useDinerMemory.ts   client hooks
supabase/migrations/   schema + RLS + storage policies
```

---

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

---

## Notes

- **Graceful degradation by design** — missing keys never crash the app; AI
  falls back to heuristics, memory to mock, notifications no-op.
- **Security** — all provider secrets are server-only (`server-only` guards);
  RLS is default-deny with owner-scoped writes; restaurants cannot read diner
  PII. See `supabase/README.md` for the RLS summary.
- See `ai-menu-product-spec.md` for the full product spec.
