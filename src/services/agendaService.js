import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { user: null, error };
  }

  if (!data.user?.id) {
    return { user: null, error: new Error('Usuario autenticado nao encontrado.') };
  }

  return { user: data.user, error: null };
}

export async function listAgendaEventos(from, to) {
  assertSupabaseConfig();
  const { user, error } = await getAuthenticatedUser();

  if (error) {
    return { data: null, error };
  }

  return supabase
    .from('agenda_eventos')
    .select('*, agenda_evento_repertorios(repertorio_id, repertorios(id,nome,data))')
    .eq('created_by', user.id)
    .lt('inicio', to)
    .or(`fim.is.null,fim.gte.${from}`)
    .order('inicio');
}
export async function createAgendaEvento(evento, repertorioIds = []) {
  assertSupabaseConfig();
  const { user, error: userError } = await getAuthenticatedUser();
  if (userError) return { data: null, error: userError };
  const { data, error } = await supabase.from('agenda_eventos').insert({ ...evento, created_by: user.id }).select().single();
  if (error || !data) return { data: null, error };
  const { error: linkError } = await replaceAgendaEventoRepertorios(data.id, repertorioIds);
  return { data, error: linkError };
}
export async function replaceAgendaEventoRepertorios(eventoId, repertorioIds = []) {
  const { error: removeError } = await supabase.from('agenda_evento_repertorios').delete().eq('evento_id', eventoId);
  if (removeError) return { error: removeError };
  const ids = [...new Set(repertorioIds.filter(Boolean))];
  return ids.length ? supabase.from('agenda_evento_repertorios').insert(ids.map((repertorio_id) => ({ evento_id: eventoId, repertorio_id }))) : { error: null };
}
export async function updateAgendaEvento(eventoId, evento, repertorioIds = []) {
  assertSupabaseConfig();
  const { user, error: userError } = await getAuthenticatedUser();
  if (userError) return { data: null, error: userError };
  const { data, error } = await supabase.from('agenda_eventos').update(evento).eq('id', eventoId).eq('created_by', user.id).select().single();
  if (error || !data) return { data: null, error };
  const { error: linkError } = await replaceAgendaEventoRepertorios(eventoId, repertorioIds);
  return { data, error: linkError };
}
export async function deleteAgendaEvento(eventoId) {
  assertSupabaseConfig();
  const { user, error } = await getAuthenticatedUser();
  if (error) return { data: null, error };
  return supabase.from('agenda_eventos').delete().eq('id', eventoId).eq('created_by', user.id);
}
