/**
 * Database query helpers. All server-side, typed against the Database schema.
 * Called by route handlers; insulates other workstreams from Supabase internals.
 */

import 'server-only';
import { createServiceClient as createSupabaseClient } from '@/lib/supabase-server';
import type { Restaurant, MenuItem, DinerProfile } from '@/lib/types';
import type { Database } from './types';

type SupabaseRestaurant = Database['public']['Tables']['restaurants']['Row'];
type SupabaseMenuItem = Database['public']['Tables']['menu_items']['Row'];
type SupabaseDinerProfile = Database['public']['Tables']['diner_profiles']['Row'];
type SupabaseSession = Database['public']['Tables']['sessions']['Row'];
type SupabaseEvent = Database['public']['Tables']['events']['Row'];

function createServiceClient() {
  return createSupabaseClient() as any;
}

// ============================================================================
// Restaurants
// ============================================================================

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }

  return fromSupabaseRestaurant(data as SupabaseRestaurant);
}

export async function getRestaurantByOwner(ownerId: string): Promise<Restaurant | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('restaurants')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? fromSupabaseRestaurant(data as SupabaseRestaurant) : null;
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return fromSupabaseRestaurant(data as SupabaseRestaurant);
}

export async function listRestaurants(): Promise<Restaurant[]> {
  const db = createServiceClient();
  const { data, error } = await db.from('restaurants').select('*');

  if (error) throw error;

  return (data as SupabaseRestaurant[]).map(fromSupabaseRestaurant);
}

export async function createRestaurant(input: {
  id?: string;
  slug: string;
  name: string;
  shortName: string;
  cuisine: string;
  city: string;
  serviceStyle: string;
  tableLabel: string;
  welcomeLine: string;
  tone: string;
  theme: Record<string, string>;
  categories: string[];
  ownerId: string;
  exclusionPolicy?: 'none' | 'some' | 'all';
  currency?: string;
}): Promise<Restaurant> {
  const db = createServiceClient();

  const row: Record<string, unknown> = {
    slug: input.slug,
    name: input.name,
    short_name: input.shortName,
    cuisine: input.cuisine,
    city: input.city,
    service_style: input.serviceStyle,
    table_label: input.tableLabel,
    welcome_line: input.welcomeLine,
    tone: input.tone,
    theme: input.theme,
    categories: input.categories,
    owner_id: input.ownerId,
    exclusion_policy: input.exclusionPolicy || 'none',
    currency: input.currency || 'GBP',
  };
  // Only set id when explicitly provided; otherwise let the column default
  // (gen_random_uuid()) apply. Passing id: undefined sends an explicit null.
  if (input.id) row.id = input.id;

  const { data, error } = await db.from('restaurants').insert([row]).select().single();

  if (error) throw error;

  return fromSupabaseRestaurant(data as SupabaseRestaurant);
}

export async function updateRestaurant(
  id: string,
  updates: Partial<{
    name: string;
    shortName: string;
    cuisine: string;
    city: string;
    serviceStyle: string;
    tableLabel: string;
    welcomeLine: string;
    tone: string;
    theme: Record<string, string>;
    categories: string[];
    exclusionPolicy: 'none' | 'some' | 'all';
  }>
): Promise<Restaurant> {
  const db = createServiceClient();

  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.shortName !== undefined) mapped.short_name = updates.shortName;
  if (updates.cuisine !== undefined) mapped.cuisine = updates.cuisine;
  if (updates.city !== undefined) mapped.city = updates.city;
  if (updates.serviceStyle !== undefined) mapped.service_style = updates.serviceStyle;
  if (updates.tableLabel !== undefined) mapped.table_label = updates.tableLabel;
  if (updates.welcomeLine !== undefined) mapped.welcome_line = updates.welcomeLine;
  if (updates.tone !== undefined) mapped.tone = updates.tone;
  if (updates.theme !== undefined) mapped.theme = updates.theme;
  if (updates.categories !== undefined) mapped.categories = updates.categories;
  if (updates.exclusionPolicy !== undefined) mapped.exclusion_policy = updates.exclusionPolicy;

  const { data, error } = await db
    .from('restaurants')
    .update(mapped)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return fromSupabaseRestaurant(data as SupabaseRestaurant);
}

// ============================================================================
// Menu items
// ============================================================================

export async function listMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (error) throw error;

  return (data as SupabaseMenuItem[]).map(fromSupabaseMenuItem);
}

export async function getMenuItem(id: string, restaurantId: string): Promise<MenuItem | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return fromSupabaseMenuItem(data as SupabaseMenuItem);
}

export async function upsertMenuItems(
  restaurantId: string,
  items: Array<{
    id: string;
    name: string;
    nativeName?: string;
    category: string;
    price: number;
    spice: 0 | 1 | 2 | 3;
    vegetarian: boolean;
    vegan: boolean;
    contains: string[];
    hue: string;
    blurb: string;
    explainer: string;
    imageUrl?: string;
    modelUrl?: string;
    available: boolean;
    tags: string[];
    hotspots?: Record<string, unknown>[];
    steam?: boolean;
    notes?: string;
    allowExclusions?: boolean;
    removable?: string[];
  }>
): Promise<MenuItem[]> {
  const db = createServiceClient();

  const toInsert = items.map((item) => ({
    id: item.id,
    restaurant_id: restaurantId,
    name: item.name,
    native_name: item.nativeName ?? null,
    category: item.category,
    price: item.price,
    spice: item.spice,
    vegetarian: item.vegetarian,
    vegan: item.vegan,
    contains: item.contains,
    hue: item.hue,
    blurb: item.blurb,
    explainer: item.explainer,
    image_url: item.imageUrl ?? null,
    model_url: item.modelUrl ?? null,
    available: item.available,
    tags: item.tags,
    hotspots: item.hotspots ?? null,
    steam: item.steam ?? false,
    notes: item.notes ?? null,
    allow_exclusions: item.allowExclusions ?? false,
    removable: item.removable ?? null,
  }));

  const { data, error } = await db
    .from('menu_items')
    .upsert(toInsert, { onConflict: 'id' })
    .select();

  if (error) throw error;

  return (data as SupabaseMenuItem[]).map(fromSupabaseMenuItem);
}

// ============================================================================
// Diners
// ============================================================================

export async function getDinerByDeviceToken(token: string): Promise<{ id: string } | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('diners')
    .select('id')
    .eq('device_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as { id: string };
}

export async function createDiner(input: {
  id?: string;
  deviceToken?: string;
  phone?: string;
}): Promise<{ id: string }> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('diners')
    .insert([
      {
        id: input.id,
        device_token: input.deviceToken ?? null,
        phone: input.phone ?? null,
      },
    ])
    .select('id')
    .single();

  if (error) throw error;

  return data as { id: string };
}

export async function updateDinerDeviceToken(dinerId: string, token: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from('diners')
    .update({ device_token: token })
    .eq('id', dinerId);

  if (error) throw error;
}

// ============================================================================
// Diner profiles
// ============================================================================

export async function getDinerProfile(dinerId: string): Promise<DinerProfile | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('diner_profiles')
    .select('*')
    .eq('diner_id', dinerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return fromSupabaseDinerProfile(data as SupabaseDinerProfile);
}

export async function upsertDinerProfile(
  dinerId: string,
  profile: Omit<DinerProfile, 'memoryOptIn'> & { memoryOptIn?: boolean }
): Promise<DinerProfile> {
  const db = createServiceClient();

  const { data, error } = await db
    .from('diner_profiles')
    .upsert(
      [
        {
          diner_id: dinerId,
          diet: profile.diet,
          allergies: profile.allergies,
          spice: profile.spice,
          adventure: profile.adventure,
          appetite: profile.appetite,
          likes: profile.likes,
          dislikes: profile.dislikes,
          memory_opt_in: profile.memoryOptIn ?? false,
        },
      ],
      { onConflict: 'diner_id' }
    )
    .select()
    .single();

  if (error) throw error;

  return fromSupabaseDinerProfile(data as SupabaseDinerProfile);
}

// ============================================================================
// Sessions
// ============================================================================

export async function createSession(input: {
  dinerId: string;
  restaurantId: string;
  tableLabel: string;
  context?: Record<string, unknown>;
}): Promise<{ id: string; createdAt: string }> {
  const db = createServiceClient();

  const { data, error } = await db
    .from('sessions')
    .insert([
      {
        diner_id: input.dinerId,
        restaurant_id: input.restaurantId,
        table_label: input.tableLabel,
        context: input.context ?? null,
      },
    ])
    .select('id, created_at')
    .single();

  if (error) throw error;

  const row = data as { id: string; created_at: string };
  return {
    id: row.id,
    createdAt: row.created_at,
  };
}

export async function getSession(id: string): Promise<SupabaseSession | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as SupabaseSession;
}

export async function endSession(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Events
// ============================================================================

export async function recordEvent(input: {
  sessionId: string;
  dinerId: string;
  dishId?: string;
  kind: 'view' | 'dwell' | 'ask' | 'order' | 'rate' | 'profile_update';
  value?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const db = createServiceClient();

  const { data, error } = await db
    .from('events')
    .insert([
      {
        session_id: input.sessionId,
        diner_id: input.dinerId,
        dish_id: input.dishId ?? null,
        kind: input.kind,
        value: input.value ?? null,
      },
    ])
    .select('id')
    .single();

  if (error) throw error;

  return data as { id: string };
}

export async function listSessionEvents(sessionId: string): Promise<SupabaseEvent[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('events')
    .select('*')
    .eq('session_id', sessionId);

  if (error) throw error;

  return data as SupabaseEvent[];
}

// ============================================================================
// Storage: dish images
// ============================================================================

export async function uploadDishImage(
  restaurantId: string,
  file: File,
  itemId: string
): Promise<string> {
  const db = createServiceClient();
  const fileName = `${restaurantId}/${itemId}/${Date.now()}-${file.name}`;

  const { error } = await db.storage.from('dish-images').upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  return getDishImageUrl(fileName);
}

export function getDishImageUrl(path: string): string {
  const db = createServiceClient();
  const {
    data: { publicUrl },
  } = db.storage.from('dish-images').getPublicUrl(path);

  return publicUrl;
}

// ============================================================================
// Type converters
// ============================================================================

function fromSupabaseRestaurant(row: SupabaseRestaurant): Restaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    cuisine: row.cuisine,
    city: row.city,
    serviceStyle: row.service_style,
    tableLabel: row.table_label,
    welcomeLine: row.welcome_line,
    tone: row.tone,
    theme: row.theme as any,
    categories: row.categories,
    ownerUsername: undefined,
    exclusionPolicy: row.exclusion_policy,
    dinerConfig: (row as any).diner_config ?? undefined,
    currency: (row as any).currency ?? "GBP",
  };
}

export async function setRestaurantDinerConfig(
  id: string,
  config: { allergens: string[]; diets: string[] }
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from('restaurants').update({ diner_config: config }).eq('id', id);
  if (error) throw error;
}

function fromSupabaseMenuItem(row: SupabaseMenuItem): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    nativeName: row.native_name ?? undefined,
    category: row.category,
    price: row.price,
    spice: row.spice,
    vegetarian: row.vegetarian,
    vegan: row.vegan,
    contains: row.contains,
    hue: row.hue,
    blurb: row.blurb,
    explainer: row.explainer,
    imageUrl: row.image_url ?? undefined,
    modelUrl: row.model_url ?? undefined,
    available: row.available,
    tags: row.tags,
    hotspots: row.hotspots as any,
    steam: row.steam,
    notes: row.notes ?? undefined,
    allowExclusions: row.allow_exclusions,
    removable: row.removable ?? undefined,
  };
}

function fromSupabaseDinerProfile(row: SupabaseDinerProfile): DinerProfile {
  return {
    diet: row.diet as any,
    allergies: row.allergies as any,
    spice: row.spice,
    adventure: row.adventure,
    appetite: row.appetite as any,
    likes: row.likes,
    dislikes: row.dislikes,
    memoryOptIn: row.memory_opt_in,
  };
}
