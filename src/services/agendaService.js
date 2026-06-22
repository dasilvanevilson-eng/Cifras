import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listAgendaEventos(from, to) {
  assertSupabaseConfig();
  return supabase.from('agenda_eventos').select('*, agenda_evento_repertorios(repertorio_id, repertorios(id,nome,data))').gte('inicio', from).lt('inicio', to).order('inicio');
}
export async function createAgendaEvento(evento, repertorioIds = []) {
  assertSupabaseConfig();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: userError || new Error('Usuario nao encontrado.') };
  const { data, error } = await supabase.from('agenda_eventos').insert({ ...evento, created_by: userData.user.id }).select().single();
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
