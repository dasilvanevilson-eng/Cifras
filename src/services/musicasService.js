import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';
import { getCifraExibicao } from '../utils/chordpro.js';

const MUSICA_LIST_COLUMNS = `
  id,
  titulo,
  artista,
  tom,
  tags,
  visibility,
  owner_id,
  organization_id,
  source_musica_id,
  created_by,
  colaborador_nome,
  updated_at
`;

const MUSICA_DETAIL_COLUMNS = `
  *,
  musica_compartilhamentos(user_id, can_edit),
  musica_group_shares(organization_id, can_edit)
`;

export const MUSICA_VISIBILITY = {
  PUBLICA: 'publica',
  PRIVADA: 'privada',
  ORGANIZACAO: 'organizacao',
  COMPARTILHADA: 'compartilhada',
};

export async function listMusicas(options = {}) {
  assertSupabaseConfig();
  const {
    scope = 'visible',
    query = '',
    limit = 120,
    userId = null,
    organizationId = null,
  } = options;

  if (scope === 'shared') {
    return listSharedMusicas({ query, limit, userId, organizationId });
  }

  let request = supabase
    .from('musicas')
    .select(MUSICA_LIST_COLUMNS)
    .order('titulo', { ascending: true })
    .limit(limit);

  if (query?.trim()) {
    request = request.ilike('titulo', `%${query.trim()}%`);
  }

  if (scope === 'community') {
    request = request.eq('visibility', MUSICA_VISIBILITY.PUBLICA);
  } else if (scope === 'mine' && userId) {
    request = request
      .eq('visibility', MUSICA_VISIBILITY.PRIVADA)
      .or(`owner_id.eq.${userId},created_by.eq.${userId}`);
  } else if (scope === 'organization' && organizationId) {
    request = request
      .eq('visibility', MUSICA_VISIBILITY.ORGANIZACAO)
      .eq('organization_id', organizationId);
  }

  const result = await request;

  if (result.error) {
    return result;
  }

  return enrichMusicasWithVersionNames(result);
}

async function listSharedMusicas({ query = '', limit = 120, userId = null, organizationId = null } = {}) {
  if (!userId && !organizationId) {
    return { data: [], error: null };
  }

  const userRequest = userId
    ? applyTitleFilter(
      supabase
        .from('musicas')
        .select(`${MUSICA_LIST_COLUMNS}, musica_compartilhamentos!inner(user_id)`)
        .eq('musica_compartilhamentos.user_id', userId)
        .order('titulo', { ascending: true })
        .limit(limit),
      query,
    )
    : Promise.resolve({ data: [], error: null });

  const groupRequest = organizationId
    ? applyTitleFilter(
      supabase
        .from('musicas')
        .select(`${MUSICA_LIST_COLUMNS}, musica_group_shares!inner(organization_id)`)
        .eq('musica_group_shares.organization_id', organizationId)
        .order('titulo', { ascending: true })
        .limit(limit),
      query,
    )
    : Promise.resolve({ data: [], error: null });

  const [userResult, groupResult] = await Promise.all([userRequest, groupRequest]);

  if (userResult.error) return { data: null, error: userResult.error };
  if (groupResult.error) return { data: null, error: groupResult.error };

  const byId = new Map();
  [...(userResult.data || []), ...(groupResult.data || [])].forEach((musica) => {
    byId.set(musica.id, {
      ...musica,
      visibility: musica.visibility === MUSICA_VISIBILITY.PUBLICA
        ? musica.visibility
        : MUSICA_VISIBILITY.COMPARTILHADA,
    });
  });

  return {
    data: [...byId.values()]
      .sort((a, b) => String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR', { sensitivity: 'base' }))
      .slice(0, limit),
    error: null,
  };
}

function applyTitleFilter(request, query = '') {
  if (!query?.trim()) {
    return request;
  }

  return request.ilike('titulo', `%${query.trim()}%`);
}

export async function getMusicaById(id) {
  assertSupabaseConfig();
  return supabase.from('musicas').select(MUSICA_DETAIL_COLUMNS).eq('id', id).single();
}

export async function createMusica(musica) {
  assertSupabaseConfig();
  const payload = normalizeMusicaPayload(musica);
  const contentError = getMusicaContentError(payload);

  if (contentError) {
    return { data: null, error: contentError };
  }

  return supabase.from('musicas').insert(payload).select().single();
}

export async function updateMusica(id, musica) {
  assertSupabaseConfig();
  const payload = normalizeMusicaPayload(musica);
  const contentError = getMusicaContentError(payload);

  if (contentError) {
    return { data: null, error: contentError };
  }

  return supabase.from('musicas').update(payload).eq('id', id).select().single();
}

export async function publishPrivateMusicaToCommunity(musicaId, sessionProfile = {}) {
  assertSupabaseConfig();
  const profileName = getProfileDisplayName(sessionProfile);

  return supabase
    .rpc('publish_private_musica_to_community', {
      p_musica_id: musicaId,
      p_colaborador_nome: profileName,
      p_revisado_por_nome: profileName,
    });
}

export async function publishPrivateMusicaAsCommunityVersion(musicaId, sessionProfile = {}) {
  assertSupabaseConfig();
  return publishPrivateMusicaToCommunity(musicaId, sessionProfile);
}

export async function updateSourceCommunityMusicaFromPrivate(musicaId) {
  assertSupabaseConfig();
  return publishPrivateMusicaToCommunity(musicaId);
}

export async function duplicateMusicaToPrivate(musicaId, overrides = {}, _ownerId = null) {
  assertSupabaseConfig();
  return supabase
    .rpc('duplicate_musica_to_private', {
      p_musica_id: musicaId,
      p_titulo: overrides.titulo || null,
    });
}

export async function replaceMusicaCompartilhamentos(musicaId, userShares = [], groupShares = []) {
  assertSupabaseConfig();

  const { error: userDeleteError } = await supabase
    .from('musica_compartilhamentos')
    .delete()
    .eq('musica_id', musicaId);

  if (userDeleteError) {
    return { error: userDeleteError };
  }

  const uniqueUserShares = dedupeShares(userShares, 'user_id');

  if (uniqueUserShares.length) {
    const { error: userInsertError } = await supabase
      .from('musica_compartilhamentos')
      .insert(uniqueUserShares.map((share) => ({
        musica_id: musicaId,
        user_id: share.user_id,
        can_edit: Boolean(share.can_edit),
      })));

    if (userInsertError) {
      return { error: userInsertError };
    }
  }

  const { error: groupDeleteError } = await supabase
    .from('musica_group_shares')
    .delete()
    .eq('musica_id', musicaId);

  if (groupDeleteError) {
    return { error: groupDeleteError };
  }

  const uniqueGroupShares = dedupeShares(groupShares, 'organization_id');

  if (!uniqueGroupShares.length) {
    return { error: null };
  }

  return supabase
    .from('musica_group_shares')
    .insert(uniqueGroupShares.map((share) => ({
      musica_id: musicaId,
      organization_id: share.organization_id,
      can_edit: Boolean(share.can_edit),
    })));
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

export async function deleteMusicaComVinculos(id) {
  assertSupabaseConfig();
  return supabase.rpc('delete_musica_com_vinculos', { p_musica_id: id });
}

function normalizeMusicaPayload(musica = {}) {
  const payload = { ...musica };

  if (!payload.visibility) {
    payload.visibility = MUSICA_VISIBILITY.PRIVADA;
  }

  if (payload.visibility === MUSICA_VISIBILITY.PUBLICA) {
    payload.owner_id = null;
    payload.organization_id = null;
  }

  if (payload.visibility === MUSICA_VISIBILITY.PRIVADA) {
    payload.organization_id = null;
  }

  return payload;
}

function getMusicaContentError(musica = {}) {
  if (String(getCifraExibicao(musica) || '').trim()) {
    return null;
  }

  return new Error('Informe a cifra antes de salvar.');
}

async function enrichMusicasWithVersionNames(result) {
  const musicas = result.data || [];
  const missingNameUserIds = [...new Set(musicas
    .filter((musica) => !musica.colaborador_nome && musica.created_by)
    .map((musica) => musica.created_by))];

  if (!missingNameUserIds.length) {
    return result;
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, nome')
    .in('id', missingNameUserIds);

  if (error) {
    return result;
  }

  const namesById = new Map((profiles || []).map((profile) => [profile.id, profile.nome]));

  return {
    ...result,
    data: musicas.map((musica) => ({
      ...musica,
      colaborador_nome: musica.colaborador_nome || namesById.get(musica.created_by) || null,
    })),
  };
}

function getProfileDisplayName(profile = {}) {
  return profile?.nome || profile?.email || 'Usuario';
}

function dedupeShares(shares = [], key) {
  const map = new Map();

  shares.forEach((share) => {
    const value = share?.[key];
    if (!value) return;

    map.set(value, {
      [key]: value,
      can_edit: Boolean(share.can_edit),
    });
  });

  return [...map.values()];
}
