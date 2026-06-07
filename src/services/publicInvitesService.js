import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listPublicInvites() {
  assertSupabaseConfig();
  return supabase
    .from('public_invites')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function createDashboardPublicInvite({ title, expiresAt, maxUses, createdBy }) {
  assertSupabaseConfig();

  return supabase
    .from('public_invites')
    .insert({
      title,
      token: createPublicToken(),
      module_key: 'dashboard',
      target_type: 'module',
      target_id: null,
      allowed_actions: ['view', 'execute'],
      metadata: {
        version: 1,
        description: 'Acesso publico temporario ao painel e execucao em modo visualizacao.',
      },
      expires_at: expiresAt,
      max_uses: maxUses || null,
      created_by: createdBy,
    })
    .select()
    .single();
}

export async function createBandaCoralPublicInvite({
  title,
  expiresAt,
  maxUses,
  createdBy,
  accessMode = 'ambos',
  repertorioIds = [],
}) {
  assertSupabaseConfig();

  return supabase
    .from('public_invites')
    .insert({
      title,
      token: createPublicToken(),
      module_key: 'banda_coral',
      target_type: 'module',
      target_id: null,
      allowed_actions: ['view', 'execute'],
      metadata: {
        version: 1,
        access_mode: accessMode,
        repertorio_ids: repertorioIds,
        description: 'Acesso publico temporario ao Modo Banda/Coral em busca e execucao.',
      },
      expires_at: expiresAt,
      max_uses: maxUses || null,
      created_by: createdBy,
    })
    .select()
    .single();
}

export async function revokePublicInvite(id) {
  assertSupabaseConfig();
  return supabase
    .from('public_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function deletePublicInvite(id) {
  assertSupabaseConfig();
  return supabase
    .from('public_invites')
    .delete()
    .eq('id', id);
}

export async function getPublicDashboardData(token) {
  assertSupabaseConfig();
  return supabase.rpc('get_public_dashboard_data', { p_token: token });
}

export async function getPublicBandaCoralData(token) {
  assertSupabaseConfig();
  return supabase.rpc('get_public_banda_coral_data', { p_token: token });
}

export async function updatePublicBandaCoralState(token, state) {
  assertSupabaseConfig();
  return supabase.rpc('update_public_banda_coral_state', {
    p_token: token,
    p_item_type: state.itemType,
    p_musica_id: state.musicaId || null,
    p_repertorio_id: state.repertorioId || null,
    p_transpose_semitones: Number(state.transposeSemitones || 0),
    p_capo: Number(state.capo || 0),
  });
}

export async function getPublicBandaCoralState(token) {
  assertSupabaseConfig();
  return supabase.rpc('get_public_banda_coral_state', { p_token: token });
}

export async function claimPublicBandaCoralLeader(token, clientId) {
  assertSupabaseConfig();
  return supabase.rpc('claim_public_banda_coral_leader', {
    p_token: token,
    p_client_id: clientId,
  });
}

export async function heartbeatPublicBandaCoralLeader(token, clientId) {
  assertSupabaseConfig();
  return supabase.rpc('heartbeat_public_banda_coral_leader', {
    p_token: token,
    p_client_id: clientId,
  });
}

export async function releasePublicBandaCoralLeader(token, clientId) {
  assertSupabaseConfig();
  return supabase.rpc('release_public_banda_coral_leader', {
    p_token: token,
    p_client_id: clientId,
  });
}

export async function getPublicBandaCoralPresence(token) {
  assertSupabaseConfig();
  return supabase.rpc('get_public_banda_coral_presence', { p_token: token });
}

export async function listPublicRepertorioMusicas(token, repertorioId) {
  assertSupabaseConfig();
  const { data, error } = await supabase.rpc('get_public_repertorio_musicas', {
    p_token: token,
    p_repertorio_id: repertorioId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data?.valid) {
    return { data: [], error: new Error('Convite expirado ou invalido.') };
  }

  return { data: data.musicas || [], error: null };
}

export async function getPublicMusicaData(token, musicaId) {
  assertSupabaseConfig();
  const { data, error } = await supabase.rpc('get_public_musica_data', {
    p_token: token,
    p_musica_id: musicaId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data?.valid) {
    return { data: null, error: new Error('Convite expirado, invalido ou musica nao encontrada.') };
  }

  return { data: data.musica, error: null };
}

export async function getPublicRepertorioExecutionData(token, repertorioId) {
  assertSupabaseConfig();
  const { data, error } = await supabase.rpc('get_public_repertorio_execution_data', {
    p_token: token,
    p_repertorio_id: repertorioId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data?.valid) {
    return { data: null, error: new Error('Convite expirado, invalido ou repertorio nao encontrado.') };
  }

  return {
    data: {
      repertorio: data.repertorio,
      musicas: data.musicas || [],
    },
    error: null,
  };
}

function createPublicToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
