import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function createSugestaoMusica(values) {
  assertSupabaseConfig();
  return supabase
    .from('sugestoes_musicas')
    .insert({
      titulo: values.titulo,
      artista: values.artista || null,
      tom: values.tom || null,
      cifra_original: values.cifra_original,
      musica_link: values.musica_link || null,
      observacao: values.observacao || null,
      enviado_por_nome: values.enviado_por_nome || null,
      enviado_por_email: values.enviado_por_email || null,
      enviado_por_papel: values.enviado_por_papel || null,
      status: 'pendente',
    })
    .select()
    .single();
}

export async function listMinhasSugestoes() {
  assertSupabaseConfig();
  return supabase
    .from('sugestoes_musicas')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function listSugestoesPendentes() {
  assertSupabaseConfig();
  return supabase
    .from('sugestoes_musicas')
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: true });
}

export async function countSugestoesPendentes() {
  assertSupabaseConfig();
  return supabase
    .from('sugestoes_musicas')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendente');
}

export async function approveSugestaoMusica(sugestao, musica) {
  assertSupabaseConfig();

  const { data: createdMusica, error: musicaError } = await supabase
    .from('musicas')
    .insert(musica)
    .select()
    .single();

  if (musicaError) {
    return { data: null, error: musicaError };
  }

  const { data, error } = await supabase
    .from('sugestoes_musicas')
    .update({
      status: 'aprovada',
      musica_id: createdMusica.id,
      revisado_por: sugestao.revisado_por,
      reviewed_at: new Date().toISOString(),
      motivo_rejeicao: null,
    })
    .eq('id', sugestao.id)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: { sugestao: data, musica: createdMusica }, error: null };
}

export async function rejectSugestaoMusica(id, values) {
  assertSupabaseConfig();
  return supabase
    .from('sugestoes_musicas')
    .update({
      status: 'rejeitada',
      motivo_rejeicao: values.motivo_rejeicao || null,
      revisado_por: values.revisado_por,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function markSugestaoMusicaAprovada(id, values) {
  assertSupabaseConfig();
  return supabase
    .from('sugestoes_musicas')
    .update({
      status: 'aprovada',
      musica_id: values.musica_id,
      revisado_por: values.revisado_por,
      reviewed_at: new Date().toISOString(),
      motivo_rejeicao: null,
    })
    .eq('id', id)
    .select()
    .single();
}
