import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function signInWithPassword(email, password) {
  assertSupabaseConfig();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  assertSupabaseConfig();
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  assertSupabaseConfig();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
