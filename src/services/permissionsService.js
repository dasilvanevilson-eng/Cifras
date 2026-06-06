import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '../features/auth/permissions.js';
import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export async function listCurrentUserPermissionOverrides(userId) {
  if (!userId) {
    return { data: [], error: null };
  }

  return listUserPermissionOverrides(userId);
}

export async function listUserPermissionOverrides(userId) {
  assertSupabaseConfig();
  return supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .order('module_key', { ascending: true });
}

export async function saveUserPermissions(userId, permissions) {
  assertSupabaseConfig();

  if (!userId) {
    return { data: null, error: new Error('Usuario nao informado.') };
  }

  return saveUsersPermissions([userId], permissions);
}

export async function saveUsersPermissions(userIds, permissions) {
  assertSupabaseConfig();

  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];

  if (!uniqueUserIds.length) {
    return { data: null, error: new Error('Nenhum usuario informado.') };
  }

  const rows = uniqueUserIds.flatMap((userId) => createPermissionRows(userId, permissions));

  return supabase
    .from('user_permissions')
    .upsert(rows, { onConflict: 'user_id,module_key' })
    .select();
}

export async function resetUserPermissions(userId) {
  assertSupabaseConfig();

  if (!userId) {
    return { data: null, error: new Error('Usuario nao informado.') };
  }

  return supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId);
}

function createPermissionRows(userId, permissions) {
  return PERMISSION_MODULES.map((module) => {
    const modulePermissions = permissions?.[module.key] || {};
    return {
      user_id: userId,
      module_key: module.key,
      ...Object.fromEntries(PERMISSION_ACTIONS.map((action) => [
        action.key,
        Boolean(modulePermissions[action.key]),
      ])),
    };
  });
}
