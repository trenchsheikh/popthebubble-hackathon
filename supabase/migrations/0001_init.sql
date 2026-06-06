/**
 * Initial Bubble Restaurant schema with Row Level Security.
 *
 * Apply with:
 *   - Supabase CLI: `supabase db push`
 *   - Supabase Dashboard: paste into SQL editor
 *
 * Tables: restaurants, menu_items, diners, diner_profiles, sessions, events
 * Storage: dish-images bucket with public read + owner write
 * RLS: All tables have RLS enabled with production-correct policies
 */

-- ============================================================================
-- Restaurants
-- ============================================================================

create table if not exists public.restaurants (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  name text not null,
  short_name text not null,
  cuisine text not null,
  city text not null,
  service_style text not null,
  table_label text not null,
  welcome_line text not null,
  tone text not null,
  theme jsonb not null,
  categories text[] not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  exclusion_policy text not null default 'none' check (exclusion_policy in ('none', 'some', 'all')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_restaurants_slug on public.restaurants(slug);
create index if not exists idx_restaurants_owner_id on public.restaurants(owner_id);

alter table public.restaurants enable row level security;

-- RLS: Anyone can read restaurants; only owner can write
create policy "Anyone can read restaurants" on public.restaurants
  for select using (true);

create policy "Only owner can insert restaurant" on public.restaurants
  for insert with check (auth.uid() = owner_id);

create policy "Only owner can update restaurant" on public.restaurants
  for update using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Only owner can delete restaurant" on public.restaurants
  for delete using (auth.uid() = owner_id);

-- ============================================================================
-- Menu items
-- ============================================================================

create table if not exists public.menu_items (
  id text primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  native_name text,
  category text not null,
  price numeric not null,
  spice smallint not null check (spice >= 0 and spice <= 3),
  vegetarian boolean not null,
  vegan boolean not null,
  contains text[] not null,
  hue text not null,
  blurb text not null,
  explainer text not null,
  image_url text,
  model_url text,
  available boolean not null default true,
  tags text[] not null,
  hotspots jsonb,
  steam boolean not null default false,
  notes text,
  allow_exclusions boolean not null default false,
  removable text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_menu_items_restaurant_id on public.menu_items(restaurant_id);

alter table public.menu_items enable row level security;

-- RLS: Anyone can read menu items; only restaurant owner can write
create policy "Anyone can read menu items" on public.menu_items
  for select using (true);

create policy "Only restaurant owner can insert menu item" on public.menu_items
  for insert with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Only restaurant owner can update menu item" on public.menu_items
  for update using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Only restaurant owner can delete menu item" on public.menu_items
  for delete using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- Diners
-- ============================================================================

create table if not exists public.diners (
  id uuid default gen_random_uuid() primary key,
  device_token text unique,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_diners_device_token on public.diners(device_token);
create index if not exists idx_diners_phone on public.diners(phone);

alter table public.diners enable row level security;

-- RLS: A diner can read/write only their own row
create policy "Diners can read own row" on public.diners
  for select using (id = auth.uid());

create policy "Diners can insert own row" on public.diners
  for insert with check (id = auth.uid());

create policy "Diners can update own row" on public.diners
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================================
-- Diner profiles
-- ============================================================================

create table if not exists public.diner_profiles (
  diner_id uuid primary key references public.diners(id) on delete cascade,
  diet text not null default 'none' check (diet in ('none', 'vegetarian', 'vegan', 'pescatarian', 'halal')),
  allergies text[] not null default '{}',
  spice smallint not null default 1 check (spice >= 0 and spice <= 3),
  adventure smallint not null default 1 check (adventure >= 0 and adventure <= 2),
  appetite text not null default 'normal' check (appetite in ('light', 'normal', 'feast')),
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  memory_opt_in boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.diner_profiles enable row level security;

-- RLS: A diner can read/write only their own profile
create policy "Diners can read own profile" on public.diner_profiles
  for select using (diner_id = auth.uid());

create policy "Diners can insert own profile" on public.diner_profiles
  for insert with check (diner_id = auth.uid());

create policy "Diners can update own profile" on public.diner_profiles
  for update using (diner_id = auth.uid())
  with check (diner_id = auth.uid());

-- ============================================================================
-- Sessions
-- ============================================================================

create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  diner_id uuid not null references public.diners(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_label text not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  context jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_sessions_diner_id on public.sessions(diner_id);
create index if not exists idx_sessions_restaurant_id on public.sessions(restaurant_id);
create index if not exists idx_sessions_started_at on public.sessions(started_at);

alter table public.sessions enable row level security;

-- RLS: Diner can read/write own sessions; restaurant owner can read sessions for their restaurant
create policy "Diners can read own sessions" on public.sessions
  for select using (diner_id = auth.uid());

create policy "Restaurant owner can read sessions for their restaurant" on public.sessions
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Diners can insert own session" on public.sessions
  for insert with check (diner_id = auth.uid());

create policy "Diners can update own session" on public.sessions
  for update using (diner_id = auth.uid())
  with check (diner_id = auth.uid());

-- ============================================================================
-- Events
-- ============================================================================

create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  diner_id uuid not null references public.diners(id) on delete cascade,
  dish_id text,
  kind text not null check (kind in ('view', 'dwell', 'ask', 'order', 'rate', 'profile_update')),
  value jsonb,
  at timestamptz default now()
);

create index if not exists idx_events_session_id on public.events(session_id);
create index if not exists idx_events_diner_id on public.events(diner_id);
create index if not exists idx_events_kind on public.events(kind);

alter table public.events enable row level security;

-- RLS: Diner can read/write own events; restaurant owner can read events for their restaurant's sessions
create policy "Diners can read own events" on public.events
  for select using (diner_id = auth.uid());

create policy "Restaurant owner can read events for their restaurant" on public.events
  for select using (
    exists (
      select 1 from public.sessions s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = session_id and r.owner_id = auth.uid()
    )
  );

create policy "Diners can insert own event" on public.events
  for insert with check (diner_id = auth.uid());

-- ============================================================================
-- Storage: Dish images
-- ============================================================================

-- Create the bucket
insert into storage.buckets (id, name, public)
  values ('dish-images', 'dish-images', true)
  on conflict do nothing;

-- RLS on storage.objects: public read, owner write
-- Path format: {restaurant_id}/{item_id}/{timestamp}-{filename}
-- A restaurant owner can only write to their own restaurant's prefix

create policy "Public read dish images" on storage.objects
  for select using (bucket_id = 'dish-images');

create policy "Restaurant owner can upload dish images" on storage.objects
  for insert with check (
    bucket_id = 'dish-images'
    and (
      select exists (
        select 1 from public.restaurants
        where id = (string_to_array(name, '/'))[1]::uuid
        and owner_id = auth.uid()
      )
    )
  );

create policy "Restaurant owner can update own dish images" on storage.objects
  for update using (
    bucket_id = 'dish-images'
    and (
      select exists (
        select 1 from public.restaurants
        where id = (string_to_array(name, '/'))[1]::uuid
        and owner_id = auth.uid()
      )
    )
  );

create policy "Restaurant owner can delete own dish images" on storage.objects
  for delete using (
    bucket_id = 'dish-images'
    and (
      select exists (
        select 1 from public.restaurants
        where id = (string_to_array(name, '/'))[1]::uuid
        and owner_id = auth.uid()
      )
    )
  );
