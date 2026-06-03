export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  MUSICO: 'musico',
};

export function canEditContent(role) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === USER_ROLES.ADMIN || normalizedRole === USER_ROLES.EDITOR;
}

export function canManageUsers(role) {
  return normalizeRole(role) === USER_ROLES.ADMIN;
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}
