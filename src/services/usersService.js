import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listProfiles() {
  assertSupabaseConfig();
  const result = await supabase.functions.invoke('create-user', {
    method: 'GET',
  });

  if (result.error) {
    const parsedError = await parseFunctionError(result.error);

    if (parsedError) {
      return { data: null, error: { message: parsedError } };
    }

    return result;
  }

  return {
    data: result.data?.users || [],
    error: null,
  };
}

export async function updateProfile(id, values) {
  assertSupabaseConfig();
  return supabase
    .from('profiles')
    .update(values)
    .eq('id', id)
    .select('id, nome, papel, created_at')
    .single();
}

export async function createUser(values) {
  assertSupabaseConfig();
  const result = await supabase.functions.invoke('create-user', {
    body: values,
  });

  if (result.error) {
    const parsedError = await parseFunctionError(result.error);

    if (parsedError) {
      return { data: { error: parsedError }, error: null };
    }
  }

  return result;
}

async function parseFunctionError(error) {
  const context = error?.context;

  if (!context?.json) return '';

  try {
    const body = await context.json();
    return body?.error || '';
  } catch (_error) {
    return '';
  }
}
