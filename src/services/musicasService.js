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

export async function listRepertoriosComMusica(id) {
  assertSupabaseConfig();
  return supabase
    .from('repertorio_musicas')
    .select(`
      id,
      repertorio_id,
      repertorios (
        id,
        nome,
        data
      )
    `)
    .eq('musica_id', id);
}

export async function removeMusicaDeTodosRepertorios(id) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').delete().eq('musica_id', id);
}

export async function countMusicasNoRepertorio(repertorioId) {
  assertSupabaseConfig();
  return supabase
    .from('repertorio_musicas')
    .select('id', { count: 'exact', head: true })
    .eq('repertorio_id', repertorioId);
}

export async function deleteRepertorios(ids) {
  assertSupabaseConfig();
  return supabase.from('repertorios').delete().in('id', ids);
}

export async function deleteMusica(id) {
  assertSupabaseConfig();
  return supabase.from('musicas').delete().eq('id', id);
}
