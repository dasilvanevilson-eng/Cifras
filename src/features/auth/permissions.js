import { USER_ROLES } from './roles.js';

export const PERMISSION_ACTIONS = [
  { key: 'can_view', label: 'Ver' },
  { key: 'can_create', label: 'Criar' },
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_delete', label: 'Excluir' },
  { key: 'can_execute', label: 'Executar' },
  { key: 'can_export', label: 'Exportar' },
  { key: 'can_manage', label: 'Administrar' },
];

export const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'Painel', description: 'Tela inicial e resumo do sistema.' },
  { key: 'banda_coral', label: 'Banda/Coral', description: 'Sessoes ao vivo, lideranca e participacao.' },
  { key: 'musicas', label: 'Cifras', description: 'Cadastro, consulta e execucao de musicas cifradas.' },
  { key: 'letras', label: 'Letras', description: 'Consulta e exportacao de letras em texto.' },
  { key: 'repertorios', label: 'Repertorios', description: 'Montagem, edicao e execucao de repertorios.' },
  { key: 'pdf_repertorio', label: 'PDF Repertorio', description: 'Geracao de PDFs cifrados ou somente letras.' },
  { key: 'sugestoes', label: 'Sugestao', description: 'Envio e revisao de sugestoes musicais.' },
  { key: 'minha_conta', label: 'Minha conta', description: 'Dados pessoais e senha do usuario.' },
  { key: 'usuarios', label: 'Usuarios', description: 'Cadastro e manutencao de usuarios.' },
  { key: 'permissoes', label: 'Permissoes', description: 'Configuracao de acessos por usuario.' },
];

const MENU_ROUTE_ORDER = [
  { href: '/dashboard', moduleKey: 'dashboard' },
  { href: '/banda-coral', moduleKey: 'banda_coral' },
  { href: '/musicas', moduleKey: 'musicas' },
  { href: '/musicas-letras', moduleKey: 'letras' },
  { href: '/repertorios', moduleKey: 'repertorios' },
  { href: '/repertorios-pdf', moduleKey: 'pdf_repertorio' },
  { href: '/sugestoes', moduleKey: 'sugestoes' },
  { href: '/minha-conta', moduleKey: 'minha_conta' },
  { href: '/usuarios', moduleKey: 'usuarios', adminOnly: true },
  { href: '/permissoes', moduleKey: 'permissoes', adminOnly: true },
];

const EMPTY_ACTIONS = createActions(false);

const ROLE_DEFAULTS = {
  [USER_ROLES.ADMIN]: Object.fromEntries(PERMISSION_MODULES.map((module) => [module.key, createActions(true)])),
  [USER_ROLES.EDITOR]: {
    dashboard: createActions(true, { can_manage: false }),
    banda_coral: createActions(true, { can_delete: false, can_export: false, can_manage: false }),
    musicas: createActions(true, { can_manage: false }),
    letras: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    repertorios: createActions(true, { can_manage: false }),
    pdf_repertorio: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    sugestoes: createActions(true, { can_create: true, can_edit: true, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    minha_conta: createActions(true, { can_create: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    usuarios: createActions(false),
    permissoes: createActions(false),
  },
  [USER_ROLES.MUSICO]: {
    dashboard: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    banda_coral: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    musicas: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_manage: false }),
    letras: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    repertorios: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_manage: false }),
    pdf_repertorio: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    sugestoes: createActions(true, { can_edit: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    minha_conta: createActions(true, { can_create: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    usuarios: createActions(false),
    permissoes: createActions(false),
  },
};

export function resolvePermissions(role, overrides = []) {
  const defaults = ROLE_DEFAULTS[normalizeRole(role)] || ROLE_DEFAULTS[USER_ROLES.MUSICO];
  const permissions = Object.fromEntries(PERMISSION_MODULES.map((module) => [
    module.key,
    {
      ...EMPTY_ACTIONS,
      ...(defaults[module.key] || EMPTY_ACTIONS),
    },
  ]));

  overrides.forEach((override) => {
    if (!override?.module_key || !permissions[override.module_key]) return;

    PERMISSION_ACTIONS.forEach((action) => {
      if (typeof override[action.key] === 'boolean') {
        permissions[override.module_key][action.key] = override[action.key];
      }
    });
  });

  return permissions;
}

export function canViewModule(session, moduleKey) {
  return hasPermission(session, moduleKey, 'can_view');
}

export function getFirstVisibleMenuRoute(session) {
  const role = normalizeRole(session?.profile?.papel);
  const route = MENU_ROUTE_ORDER.find((item) => (
    (!item.adminOnly || role === USER_ROLES.ADMIN)
    && canViewModule(session, item.moduleKey)
  ));

  return route?.href || '/minha-conta';
}

export function hasPermission(session, moduleKey, actionKey) {
  if (!moduleKey || !actionKey) return false;
  const permissions = session?.permissions || resolvePermissions(session?.profile?.papel);
  return Boolean(permissions?.[moduleKey]?.[actionKey]);
}

function createActions(value, overrides = {}) {
  return Object.fromEntries(PERMISSION_ACTIONS.map((action) => [
    action.key,
    Object.hasOwn(overrides, action.key) ? overrides[action.key] : value,
  ]));
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}
