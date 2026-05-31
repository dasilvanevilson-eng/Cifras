import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function assertSupabaseConfig() {
  if (!hasSupabaseConfig()) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.');
  }
}

export const supabase = hasSupabaseConfig()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
