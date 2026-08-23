import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listOrganizations() {
  assertSupabaseConfig();
  return supabase
    .from('organizations')
    .select('id, nome, slug')
    .order('nome', { ascending: true });
}

export async function listCurrentUserOrganizations(userId) {
  assertSupabaseConfig();

  if (!userId) {
    return { data: [], error: null };
  }

  return supabase
    .from('organization_members')
    .select('papel, organizations(id, nome, slug)')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .order('created_at', { ascending: true });
}
