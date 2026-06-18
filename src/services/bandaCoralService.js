import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listSessoesBanda() {
  assertSupabaseConfig();
  return supabase
    .from('sessoes_banda')
    .select(`
      *,
      repertorios (
        id,
        nome,
        data
      ),
      musicas (
        id,
        titulo,
        artista,
        tom,
        cifra_original,
        cifra_chordpro,
        cifra_exibicao,
        cifra_editor_state,
        musica_link
      )
    `)
    .eq('ativa', true)
    .order('updated_at', { ascending: false });
}

export async function getSessaoBandaById(id) {
  assertSupabaseConfig();
  return supabase
    .from('sessoes_banda')
    .select(`
      *,
      repertorios (
        id,
        nome,
        data
      ),
      musicas (
        id,
        titulo,
        artista,
        tom,
        cifra_original,
        cifra_chordpro,
        cifra_exibicao,
        cifra_editor_state,
        musica_link
      )
    `)
    .eq('id', id)
    .single();
}

export async function createSessaoBanda(values = {}) {
  assertSupabaseConfig();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return { data: null, error: authError };
  }

  const userId = authData.user?.id;

  if (!userId) {
    return { data: null, error: new Error('Usuario autenticado nao encontrado.') };
  }

  const { data: sessao, error: sessaoError } = await supabase
    .from('sessoes_banda')
    .insert({
      nome: values.nome,
      repertorio_id: values.repertorio_id || null,
      musica_atual_id: values.musica_atual_id || null,
      tom_atual: values.tom_atual || null,
      criada_por: userId,
      ativa: true,
    })
    .select()
    .single();

  if (sessaoError) {
    return { data: null, error: sessaoError };
  }

  const { error: participanteError } = await upsertSessaoBandaParticipante(sessao.id, 'lider');

  if (participanteError) {
    return { data: null, error: participanteError };
  }

  return { data: sessao, error: null };
}

export async function updateSessaoBanda(id, values = {}) {
  assertSupabaseConfig();
  const updates = {};

  ['repertorio_id', 'musica_atual_id', 'tom_atual', 'ativa'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(values, field)) {
      updates[field] = values[field] || (field === 'ativa' ? false : null);
    }
  });

  return supabase
    .from('sessoes_banda')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

export async function upsertSessaoBandaParticipante(sessaoId, papel = 'integrante', seguirLider = true) {
  assertSupabaseConfig();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return { data: null, error: authError };
  }

  const userId = authData.user?.id;

  if (!userId) {
    return { data: null, error: new Error('Usuario autenticado nao encontrado.') };
  }

  return supabase
    .from('sessoes_banda_participantes')
    .upsert({
      sessao_id: sessaoId,
      usuario_id: userId,
      papel,
      seguir_lider: seguirLider,
    }, {
      onConflict: 'sessao_id,usuario_id',
    })
    .select()
    .single();
}

export async function updateSeguirLider(participanteId, seguirLider) {
  assertSupabaseConfig();
  return supabase
    .from('sessoes_banda_participantes')
    .update({ seguir_lider: Boolean(seguirLider) })
    .eq('id', participanteId)
    .select()
    .single();
}

export async function listParticipantesSessaoBanda(sessaoId) {
  assertSupabaseConfig();
  const { data: participantes, error } = await supabase
    .from('sessoes_banda_participantes')
    .select('*')
    .eq('sessao_id', sessaoId)
    .order('entrou_em', { ascending: true });

  if (error || !participantes?.length) {
    return { data: participantes || [], error };
  }

  const userIds = [...new Set(participantes.map((participante) => participante.usuario_id).filter(Boolean))];

  if (!userIds.length) {
    return { data: participantes, error: null };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,nome,papel')
    .in('id', userIds);

  if (profilesError) {
    return { data: participantes, error: null };
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return {
    data: participantes.map((participante) => ({
      ...participante,
      profile: profilesById.get(participante.usuario_id) || null,
    })),
    error: null,
  };
}

export async function listMusicasSessaoRepertorio(repertorioId) {
  assertSupabaseConfig();

  if (!repertorioId) {
    return { data: [], error: null };
  }

  return supabase
    .from('repertorio_musicas')
    .select(`
      id,
      ordem,
      musica_id,
      tom,
      observacao,
      musicas (
        id,
        titulo,
        artista,
        tom,
        cifra_original,
        cifra_chordpro,
        cifra_exibicao,
        cifra_editor_state,
        musica_link
      )
    `)
    .eq('repertorio_id', repertorioId)
    .order('ordem');
}

export async function listMusicasAvulsasBanda() {
  assertSupabaseConfig();

  return supabase
    .from('musicas')
    .select(`
      id,
      titulo,
      artista,
      tom,
      cifra_original,
      cifra_chordpro,
      cifra_exibicao,
      cifra_editor_state,
      musica_link
    `)
    .order('titulo', { ascending: true });
}

export function subscribeSessaoBanda(sessaoId, callback) {
  assertSupabaseConfig();

  const channel = supabase
    .channel(`sessao-banda-${sessaoId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessoes_banda',
      filter: `id=eq.${sessaoId}`,
    }, (payload) => {
      callback(payload.new);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
