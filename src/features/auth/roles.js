export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  MUSICO: 'musico',
};

export function canEditContent(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.EDITOR;
}

export function canManageUsers(role) {
  return role === USER_ROLES.ADMIN;
}

