/**
 * Cuisine-adaptive diner onboarding config.
 * Holds which allergen/diet questions to surface for this restaurant (derived
 * from its cuisine + menu at publish). Nullable → falls back to the full set.
 */
alter table public.restaurants
  add column if not exists diner_config jsonb;
