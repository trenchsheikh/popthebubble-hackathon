/**
 * Onboarding + usage telemetry — durable evidence of restaurant onboarding and
 * product usage. The existing `events` table is diner/session-scoped (NOT NULL
 * session_id + diner_id, fixed `kind` check), so it cannot hold owner-side
 * onboarding steps. These tables capture the whole flow centrally.
 *
 * Apply with: `supabase db push` or paste into the Supabase SQL editor.
 */

-- ============================================================================
-- Onboarding runs — one per studio onboarding session
-- ============================================================================

create table if not exists public.onboarding_runs (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  status text not null default 'started'
    check (status in ('started', 'extracted', 'published', 'abandoned')),
  step_reached text,
  dishes_extracted int not null default 0,
  images_uploaded int not null default 0,
  ocr_model text,
  ocr_ms int,
  languages text[],
  started_at timestamptz default now(),
  published_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists idx_onboarding_runs_owner on public.onboarding_runs(owner_id);
create index if not exists idx_onboarding_runs_restaurant on public.onboarding_runs(restaurant_id);

alter table public.onboarding_runs enable row level security;

-- RLS: an owner can read/write only their own runs. Server inserts use the
-- service-role client, which bypasses RLS regardless.
create policy "Owner can read own onboarding runs" on public.onboarding_runs
  for select using (owner_id = auth.uid());
create policy "Owner can insert own onboarding runs" on public.onboarding_runs
  for insert with check (owner_id = auth.uid());
create policy "Owner can update own onboarding runs" on public.onboarding_runs
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================================
-- Onboarding events — step-by-step timeline within a run
-- ============================================================================

create table if not exists public.onboarding_events (
  id uuid default gen_random_uuid() primary key,
  run_id uuid not null references public.onboarding_runs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  step text not null,
  detail jsonb,
  at timestamptz default now()
);

create index if not exists idx_onboarding_events_run on public.onboarding_events(run_id);
create index if not exists idx_onboarding_events_owner on public.onboarding_events(owner_id);

alter table public.onboarding_events enable row level security;

create policy "Owner can read own onboarding events" on public.onboarding_events
  for select using (owner_id = auth.uid());
create policy "Owner can insert own onboarding events" on public.onboarding_events
  for insert with check (owner_id = auth.uid());

-- ============================================================================
-- App usage events — durable diner-side analytics (survives restarts)
-- diner_id is the client device id (text), not a diners FK.
-- ============================================================================

create table if not exists public.app_usage_events (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  diner_id text,
  type text not null,
  metadata jsonb,
  country text,
  city text,
  device text,
  at timestamptz default now()
);

create index if not exists idx_app_usage_restaurant on public.app_usage_events(restaurant_id);
create index if not exists idx_app_usage_type on public.app_usage_events(type);
create index if not exists idx_app_usage_at on public.app_usage_events(at);

alter table public.app_usage_events enable row level security;

-- RLS: a restaurant owner can read usage for their restaurant. Inserts are
-- server-side via the service-role client (bypasses RLS).
create policy "Owner can read usage for their restaurant" on public.app_usage_events
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );
