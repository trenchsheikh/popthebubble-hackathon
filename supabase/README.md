# Supabase Integration

Production database, auth, and storage foundation for Bubble Restaurant.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your Project URL and Anon/Service Role keys

### 2. Apply the migration

```bash
# Using Supabase CLI (recommended)
supabase db push

# OR: paste supabase/migrations/0001_init.sql into the Supabase Dashboard SQL editor
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000  # for dev
```

### 4. Create the storage bucket

In the Supabase Dashboard:

1. Go to **Storage** → **New bucket**
2. Name: `dish-images`
3. Public (checked)
4. Click Create

(The migration attempts to create this automatically, but if it fails, do it manually.)

## Schema Overview

| Table | Purpose | Owned by |
|-------|---------|----------|
| `restaurants` | Restaurant identity, owner, theme | Restaurant owner (auth.users) |
| `menu_items` | Dishes, pricing, attributes, images | Restaurant owner |
| `diners` | Diner identity (device token + phone) | Diner (anonymous or OTP auth) |
| `diner_profiles` | Diner preferences (diet, allergies, spice, etc.) | Diner |
| `sessions` | Per-visit context (table, context, start/end time) | Diner |
| `events` | Signals logged during a session (view, dwell, order, rate) | Diner |

**Storage:**
- `dish-images` bucket: public read, restaurant owner write (path: `{restaurant_id}/{item_id}/*`)

## Row Level Security (RLS) Policies

All tables have RLS enabled. **Default: deny all. Only explicitly allowed policies grant access.**

### Restaurants

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Everyone (anon + auth) | Always allowed (diners browse menus) |
| INSERT | Owner | `owner_id = auth.uid()` |
| UPDATE | Owner | `owner_id = auth.uid()` |
| DELETE | Owner | `owner_id = auth.uid()` |

### Menu Items

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Everyone | Always allowed |
| INSERT | Owner | Parent `restaurants.owner_id = auth.uid()` |
| UPDATE | Owner | Parent `restaurants.owner_id = auth.uid()` |
| DELETE | Owner | Parent `restaurants.owner_id = auth.uid()` |

### Diners

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Self | `id = auth.uid()` |
| INSERT | Self | `id = auth.uid()` |
| UPDATE | Self | `id = auth.uid()` |

### Diner Profiles

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Self | `diner_id = auth.uid()` |
| INSERT | Self | `diner_id = auth.uid()` |
| UPDATE | Self | `diner_id = auth.uid()` |

### Sessions

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Diner | `diner_id = auth.uid()` |
| SELECT | Restaurant owner | Parent `restaurant.owner_id = auth.uid()` (analytics) |
| INSERT | Diner | `diner_id = auth.uid()` |
| UPDATE | Diner | `diner_id = auth.uid()` |

### Events

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Diner | `diner_id = auth.uid()` |
| SELECT | Restaurant owner | Parent session's `restaurant.owner_id = auth.uid()` (analytics) |
| INSERT | Diner | `diner_id = auth.uid()` |

### Storage: dish-images

| Action | Who | Condition |
|--------|-----|-----------|
| SELECT | Public | Always allowed |
| INSERT | Owner | Path `{restaurant_id}/*` where `restaurants.owner_id = auth.uid()` |
| UPDATE | Owner | Same as INSERT |
| DELETE | Owner | Same as INSERT |

## API Layer (`lib/db/queries.ts`)

Clean, typed query helpers insulate route handlers from Supabase internals:

```typescript
// Restaurants
getRestaurantBySlug(slug: string)
getRestaurantById(id: string)
listRestaurants()
createRestaurant(input)
updateRestaurant(id, updates)

// Menu items
listMenuItems(restaurantId: string)
getMenuItem(id: string, restaurantId: string)
upsertMenuItems(restaurantId, items[])

// Diners
createDiner(input)
getDinerByDeviceToken(token: string)
updateDinerDeviceToken(dinerId, token)

// Profiles
getDinerProfile(dinerId: string)
upsertDinerProfile(dinerId, profile)

// Sessions
createSession(input)
getSession(id: string)
endSession(id: string)
listSessionEvents(sessionId: string)

// Events
recordEvent(input)

// Storage
uploadDishImage(restaurantId, file, itemId)
getDishImageUrl(path: string)
```

All queries use the service role client (`createServiceClient()`) and fully bypass RLS, so they're safe for backend operations. Client-side queries use the anon client and respect RLS.

## Authentication

### Diners (browser)

Zero-friction, device-based identity:

```typescript
import { ensureDinerSession } from '@/lib/auth';

const { dinerId, deviceToken, isReturning } = await ensureDinerSession();
// Stores device_token in localStorage; creates diner if new
```

Optional cross-device link (phone):

```typescript
await linkDinerPhone(dinerId, phone);
```

### Restaurants (server)

Passwordless magic link (email OTP):

```typescript
import { sendRestaurantMagicLink, getRestaurantSession } from '@/lib/auth';

// 1. Send magic link
await sendRestaurantMagicLink('owner@restaurant.com');

// 2. User clicks email link → /auth/callback?code=...&type=recovery
// 3. Verify OTP and set session cookie

// 4. In protected routes
const user = await getRestaurantSession();
if (!user) throw new Error('Not authenticated');
```

## TypeScript

The `Database` type in `lib/db/types.ts` is hand-written, not auto-generated. Keep it in sync with the migration.

Generate with Supabase CLI:
```bash
supabase gen types typescript --local > lib/db/types.ts
```

Or maintain manually for fine-grained control.

## Server-only guard

Auth and queries live in `lib/auth.ts` and `lib/db/queries.ts`, which import `server-only`:

```typescript
import 'server-only';
```

Next.js build will fail if you accidentally import these into a client component. (Use `'use client'` + route handlers for browser-callable APIs.)

## Notes

- **Backup keys:** Store service role key in a secure vault, not git/env.example
- **RLS security:** Always test RLS policies in staging before production (use `curl -H "Authorization: Bearer ..."` with different tokens)
- **Soft deletes:** Currently using hard delete (CASCADE). Consider soft deletes (updated_at + deleted_at) if you need audit trails
- **Indexes:** Added on foreign keys and search-hot columns; adjust after profiling
- **Migrations:** Store migration order in version control; Supabase CLI manages this

## Roadmap

- [ ] PgVector for semantic search (dish recommendations via embeddings)
- [ ] Real-time subscriptions (`supabase.from(...).on('*', ...)`) for live menu availability
- [ ] Audit logging (replicate events to an archive table)
- [ ] Soft deletes with a `deleted_at` timestamp
