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
