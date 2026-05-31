import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listRepertorios() {
  assertSupabaseConfig();
  return supabase.from('repertorios').select('*').order('created_at', { ascending: false });
}

export async function getRepertorioById(id) {
  assertSupabaseConfig();
  return supabase.from('repertorios').select('*').eq('id', id).single();
}

export async function createRepertorio(repertorio) {
  assertSupabaseConfig();
  return supabase.from('repertorios').insert(repertorio).select().single();
}

export async function updateRepertorio(id, repertorio) {
  assertSupabaseConfig();
  return supabase.from('repertorios').update(repertorio).eq('id', id).select().single();
}

export async function listMusicasDoRepertorio(repertorioId) {
  assertSupabaseConfig();
  return supabase
    .from('repertorio_musicas')
    .select(`
      id,
      ordem,
      musica_id,
      musicas (*)
    `)
    .eq('repertorio_id', repertorioId)
    .order('ordem');
}

export async function addMusicaToRepertorio(repertorioId, musicaId, ordem) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').insert({
    repertorio_id: repertorioId,
    musica_id: musicaId,
    ordem,
  });
}

export async function removeMusicaDoRepertorio(id) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').delete().eq('id', id);
}

export async function updateOrdemMusicaRepertorio(id, ordem) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').update({ ordem }).eq('id', id);
}
