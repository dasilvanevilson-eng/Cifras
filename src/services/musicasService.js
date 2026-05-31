import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listMusicas() {
  assertSupabaseConfig();
  return supabase.from('musicas').select('*');
}

export async function getMusicaById(id) {
  assertSupabaseConfig();
  return supabase.from('musicas').select('*').eq('id', id).single();
}

export async function createMusica(musica) {
  assertSupabaseConfig();
  return supabase.from('musicas').insert(musica).select().single();
}

export async function updateMusica(id, musica) {
  assertSupabaseConfig();
  return supabase.from('musicas').update(musica).eq('id', id).select().single();
}

export async function deleteMusica(id) {
  assertSupabaseConfig();
  return supabase.from('musicas').delete().eq('id', id);
}
