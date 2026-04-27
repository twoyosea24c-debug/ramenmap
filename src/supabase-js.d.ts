declare module '@supabase/supabase-js' {
  export type SupabaseClient = {
    // Minimal surface for now; concrete usage will be added during migration.
    readonly __brand?: 'SupabaseClient';
  };

  export function createClient(url: string, key: string): SupabaseClient;
}
