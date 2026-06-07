/**
 * Per-restaurant menu currency (ISO 4217). So a Chinese menu prices in ¥ (CNY)
 * instead of defaulting to £. Defaults to GBP for existing rows.
 */
alter table public.restaurants
  add column if not exists currency text not null default 'GBP';
