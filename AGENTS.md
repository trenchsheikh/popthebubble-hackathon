# Bubble / Hinoki — project notes for Codex

An interactive, memory-aware QR menu (Next.js App Router + TypeScript). Primary
target is **mobile web** (QR → phone); desktop is secondary. See
`ai-menu-product-spec.md` for the full product spec.

## Dev environment gotchas

### ⚠️ In-memory stores are seeded once and persist across HMR — restart to re-seed
The restaurant/menu store (`lib/store/restaurant-store.ts`), the orders store
(`lib/orders/store.ts`), and the service-call store (`lib/service/store.ts`) all
hold state on `globalThis` so it survives Next.js hot-module reload. **They are
seeded only once per server process.**

Consequence: when you change **seed data** — e.g. edit `data/mock-restaurants.ts`,
rename image paths, or run an asset migration — the already-running dev server
keeps serving the **stale** seeded copy. HMR reloads the data module but NOT the
cached store.

Real example that bit us: after converting dish images PNG→WebP and updating
`imageUrl` to `.webp` (and deleting the `.png` files), every dish rendered the
placeholder plate. The store was still handing out the old `.png` paths, which
404'd. The code was correct — the dev server was stale.

**Fix: restart the dev server** (stop/start) after any seed-data or asset change,
then verify in the browser. This disappears once the stores are backed by a real
DB (Supabase). Don't debug "missing images / stale menu" as a code bug before
restarting first.

### Other notes
- **Verify in the real app after data/asset changes** (runtime-first). Lint/typecheck
  passing ≠ images load. Restart → load the page → confirm.
- Dish image filenames match dish ids: `public/dishes/<id>.webp`. `imageUrl` is
  derived as `/dishes/${id}.webp` in `data/mock-restaurants.ts`.
- All restaurant/order/waiter state is **in-memory (MVP stub)** and resets on
  server restart — there is no DB yet.
