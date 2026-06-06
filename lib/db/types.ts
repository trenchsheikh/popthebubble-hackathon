/**
 * Hand-written Supabase Database type definitions.
 * Matches the migration schema exactly.
 * Keep in sync with supabase/migrations/0001_init.sql.
 */

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_name: string;
          cuisine: string;
          city: string;
          service_style: string;
          table_label: string;
          welcome_line: string;
          tone: string;
          theme: Record<string, string>;
          categories: string[];
          owner_id: string;
          exclusion_policy: 'none' | 'some' | 'all';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          short_name: string;
          cuisine: string;
          city: string;
          service_style: string;
          table_label: string;
          welcome_line: string;
          tone: string;
          theme: Record<string, string>;
          categories: string[];
          owner_id: string;
          exclusion_policy?: 'none' | 'some' | 'all';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          short_name?: string;
          cuisine?: string;
          city?: string;
          service_style?: string;
          table_label?: string;
          welcome_line?: string;
          tone?: string;
          theme?: Record<string, string>;
          categories?: string[];
          owner_id?: string;
          exclusion_policy?: 'none' | 'some' | 'all';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          native_name: string | null;
          category: string;
          price: number;
          spice: 0 | 1 | 2 | 3;
          vegetarian: boolean;
          vegan: boolean;
          contains: string[];
          hue: string;
          blurb: string;
          explainer: string;
          image_url: string | null;
          model_url: string | null;
          available: boolean;
          tags: string[];
          hotspots: Record<string, unknown>[] | null;
          steam: boolean;
          notes: string | null;
          allow_exclusions: boolean;
          removable: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          restaurant_id: string;
          name: string;
          native_name?: string | null;
          category: string;
          price: number;
          spice: 0 | 1 | 2 | 3;
          vegetarian: boolean;
          vegan: boolean;
          contains: string[];
          hue: string;
          blurb: string;
          explainer: string;
          image_url?: string | null;
          model_url?: string | null;
          available: boolean;
          tags: string[];
          hotspots?: Record<string, unknown>[] | null;
          steam?: boolean;
          notes?: string | null;
          allow_exclusions?: boolean;
          removable?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          native_name?: string | null;
          category?: string;
          price?: number;
          spice?: 0 | 1 | 2 | 3;
          vegetarian?: boolean;
          vegan?: boolean;
          contains?: string[];
          hue?: string;
          blurb?: string;
          explainer?: string;
          image_url?: string | null;
          model_url?: string | null;
          available?: boolean;
          tags?: string[];
          hotspots?: Record<string, unknown>[] | null;
          steam?: boolean;
          notes?: string | null;
          allow_exclusions?: boolean;
          removable?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diners: {
        Row: {
          id: string;
          device_token: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_token?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_token?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diner_profiles: {
        Row: {
          diner_id: string;
          diet: 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal';
          allergies: string[];
          spice: 0 | 1 | 2 | 3;
          adventure: 0 | 1 | 2;
          appetite: 'light' | 'normal' | 'feast';
          likes: string[];
          dislikes: string[];
          memory_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          diner_id: string;
          diet: 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal';
          allergies?: string[];
          spice?: 0 | 1 | 2 | 3;
          adventure?: 0 | 1 | 2;
          appetite?: 'light' | 'normal' | 'feast';
          likes?: string[];
          dislikes?: string[];
          memory_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          diner_id?: string;
          diet?: 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal';
          allergies?: string[];
          spice?: 0 | 1 | 2 | 3;
          adventure?: 0 | 1 | 2;
          appetite?: 'light' | 'normal' | 'feast';
          likes?: string[];
          dislikes?: string[];
          memory_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          diner_id: string;
          restaurant_id: string;
          table_label: string;
          started_at: string;
          ended_at: string | null;
          context: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          diner_id: string;
          restaurant_id: string;
          table_label: string;
          started_at?: string;
          ended_at?: string | null;
          context?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          diner_id?: string;
          restaurant_id?: string;
          table_label?: string;
          started_at?: string;
          ended_at?: string | null;
          context?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          session_id: string;
          diner_id: string;
          dish_id: string | null;
          kind: 'view' | 'dwell' | 'ask' | 'order' | 'rate' | 'profile_update';
          value: Record<string, unknown> | null;
          at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          diner_id: string;
          dish_id?: string | null;
          kind: 'view' | 'dwell' | 'ask' | 'order' | 'rate' | 'profile_update';
          value?: Record<string, unknown> | null;
          at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          diner_id?: string;
          dish_id?: string | null;
          kind?: 'view' | 'dwell' | 'ask' | 'order' | 'rate' | 'profile_update';
          value?: Record<string, unknown> | null;
          at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
