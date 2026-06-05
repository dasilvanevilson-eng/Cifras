import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';
import { USER_ROLES } from '../features/auth/roles.js';

export function createDefaultProfile(user) {
  return {
    id: user?.id || null,
    email: user?.email || '',
    nome: user?.email || 'Usuario',
    papel: USER_ROLES.MUSICO,
  };
}

export async function getProfileByUserId(userId) {
  assertSupabaseConfig();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, papel')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listShareableProfiles() {
  assertSupabaseConfig();
  return supabase
    .from('profiles')
    .select('id, nome, papel')
    .order('nome', { ascending: true });
}
