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

export async function createRepertorioComMusicas(repertorio, musicas = [], compartilhadoCom = []) {
  assertSupabaseConfig();

  const { data: novoRepertorio, error: repertorioError } = await createRepertorio(repertorio);

  if (repertorioError) {
    return { data: null, error: repertorioError };
  }

  const associacoes = musicas.map((musica, index) => ({
    repertorio_id: novoRepertorio.id,
    musica_id: musica.id,
    ordem: index + 1,
    tom: musica.tom || null,
    observacao: musica.observacao || null,
  }));

  if (!associacoes.length) {
    await deleteRepertorio(novoRepertorio.id);
    return { data: null, error: new Error('Inclua pelo menos uma musica no repertorio.') };
  }

  const { error: associacoesError } = await supabase.from('repertorio_musicas').insert(associacoes);

  if (associacoesError) {
    await deleteRepertorio(novoRepertorio.id);
    return { data: null, error: associacoesError };
  }

  const { error: compartilhamentoError } = await replaceRepertorioCompartilhamentos(
    novoRepertorio.id,
    repertorio.visibilidade === 'seletivo' ? compartilhadoCom : [],
  );

  if (compartilhamentoError) {
    await deleteRepertorio(novoRepertorio.id);
    return { data: null, error: compartilhamentoError };
  }

  return { data: novoRepertorio, error: null };
}

export async function listRepertorioCompartilhamentos(repertorioId) {
  assertSupabaseConfig();
  return supabase
    .from('repertorio_compartilhamentos')
    .select('user_id')
    .eq('repertorio_id', repertorioId);
}

export async function listRepertorioHistorico(repertorioId) {
  assertSupabaseConfig();
  return supabase
    .from('repertorio_historico')
    .select('*')
    .eq('repertorio_id', repertorioId)
    .order('created_at', { ascending: false });
}

export async function replaceRepertorioCompartilhamentos(repertorioId, userIds = []) {
  assertSupabaseConfig();

  const { error: deleteError } = await supabase
    .from('repertorio_compartilhamentos')
    .delete()
    .eq('repertorio_id', repertorioId);

  if (deleteError) {
    return { error: deleteError };
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueUserIds.length) {
    return { error: null };
  }

  return supabase
    .from('repertorio_compartilhamentos')
    .insert(uniqueUserIds.map((userId) => ({
      repertorio_id: repertorioId,
      user_id: userId,
    })));
}

export async function updateRepertorio(id, repertorio) {
  assertSupabaseConfig();
  return supabase.from('repertorios').update(repertorio).eq('id', id).select().single();
}

export async function deleteRepertorio(id) {
  assertSupabaseConfig();
  return supabase.from('repertorios').delete().eq('id', id);
}

export async function duplicateRepertorio(repertorio, musicasAssociadas = []) {
  assertSupabaseConfig();

  const { data: novoRepertorio, error: repertorioError } = await createRepertorio({
    nome: `${repertorio.nome || 'Repertorio'} - copia`,
    data: repertorio.data || null,
  });

  if (repertorioError) {
    return { data: null, error: repertorioError };
  }

  const associacoes = musicasAssociadas.map((item, index) => ({
    repertorio_id: novoRepertorio.id,
    musica_id: item.musica_id || null,
    ordem: item.ordem || index + 1,
    tom: item.tom || item.musicas?.tom || null,
    musica_titulo: item.musica_titulo || item.musicas?.titulo || null,
    musica_artista: item.musica_artista || item.musicas?.artista || null,
    musica_tom_original: item.musica_tom_original || item.musicas?.tom || null,
    musica_excluida_em: item.musica_excluida_em || null,
    musica_excluida_usuario: item.musica_excluida_usuario || null,
    observacao: item.observacao || null,
  }));

  if (!associacoes.length) {
    return { data: novoRepertorio, error: null };
  }

  const { error: associacoesError } = await supabase.from('repertorio_musicas').insert(associacoes);

  if (associacoesError) {
    await deleteRepertorio(novoRepertorio.id);
    return { data: null, error: associacoesError };
  }

  return { data: novoRepertorio, error: null };
}

export async function listMusicasDoRepertorio(repertorioId) {
  assertSupabaseConfig();
  return supabase
    .from('repertorio_musicas')
    .select(`
      id,
      ordem,
      musica_id,
      tom,
      musica_titulo,
      musica_artista,
      musica_tom_original,
      musica_excluida_em,
      musica_excluida_usuario,
      observacao,
      musicas (*)
    `)
    .eq('repertorio_id', repertorioId)
    .order('ordem');
}

export async function addMusicaToRepertorio(repertorioId, musicaId, ordem, tom = null, observacao = null) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').insert({
    repertorio_id: repertorioId,
    musica_id: musicaId,
    ordem,
    tom,
    observacao,
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

export async function swapOrdemMusicasRepertorio(currentId, targetId) {
  assertSupabaseConfig();
  return supabase.rpc('swap_repertorio_musicas_ordem', {
    p_current_id: currentId,
    p_target_id: targetId,
  });
}

export async function updateTomMusicaRepertorio(id, tom) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').update({ tom }).eq('id', id);
}

export async function updateObservacaoMusicaRepertorio(id, observacao) {
  assertSupabaseConfig();
  return supabase.from('repertorio_musicas').update({ observacao }).eq('id', id);
}
