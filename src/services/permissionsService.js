import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '../features/auth/permissions.js';
import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

// Hoje todas as permissões pertencem ao sistema. Quando houver organizações,
// basta fornecer { type: 'tenant', key: organizationId } nas mesmas chamadas.
export const SYSTEM_PERMISSION_SCOPE = Object.freeze({ type: 'system', key: 'global' });

export async function listCurrentUserPermissionOverrides(userId, scope = SYSTEM_PERMISSION_SCOPE) {
  if (!userId) {
    return { data: [], error: null };
  }

  return listUserPermissionOverrides(userId, scope);
}

export async function listUserPermissionOverrides(userId, scope = SYSTEM_PERMISSION_SCOPE) {
  assertSupabaseConfig();
  return supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('scope_type', scope.type)
    .eq('scope_key', scope.key)
    .order('module_key', { ascending: true });
}

export async function saveUserPermissions(userId, permissions, scope = SYSTEM_PERMISSION_SCOPE) {
  assertSupabaseConfig();

  if (!userId) {
    return { data: null, error: new Error('Usuario nao informado.') };
  }

  return saveUsersPermissions([userId], permissions, scope);
}

export async function saveUsersPermissions(userIds, permissions, scope = SYSTEM_PERMISSION_SCOPE) {
  assertSupabaseConfig();

  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];

  if (!uniqueUserIds.length) {
    return { data: null, error: new Error('Nenhum usuario informado.') };
  }

  const rows = uniqueUserIds.flatMap((userId) => createPermissionRows(userId, permissions, scope));

  return supabase
    .from('user_permissions')
    .upsert(rows, { onConflict: 'user_id,scope_type,scope_key,module_key' })
    .select();
}

export async function resetUserPermissions(userId, scope = SYSTEM_PERMISSION_SCOPE) {
  assertSupabaseConfig();

  if (!userId) {
    return { data: null, error: new Error('Usuario nao informado.') };
  }

  return supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('scope_type', scope.type)
    .eq('scope_key', scope.key);
}

function createPermissionRows(userId, permissions, scope) {
  return PERMISSION_MODULES.map((module) => {
    const modulePermissions = permissions?.[module.key] || {};
    return {
      user_id: userId,
      scope_type: scope.type,
      scope_key: scope.key,
      module_key: module.key,
      ...Object.fromEntries(PERMISSION_ACTIONS.map((action) => [
        action.key,
        Boolean(modulePermissions[action.key]),
      ])),
    };
  });
}
