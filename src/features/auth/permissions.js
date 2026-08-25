import { USER_ROLES } from './roles.js';

export const PERMISSION_ACTIONS = [
  { key: 'can_view', label: 'Acessar tela' },
  { key: 'can_create', label: 'Criar' },
  { key: 'can_edit', label: 'Alterar' },
  { key: 'can_delete', label: 'Excluir' },
  { key: 'can_execute', label: 'Usar recursos' },
  { key: 'can_export', label: 'Gerar ou exportar' },
  { key: 'can_manage', label: 'Gerenciar' },
];

export const PERMISSION_MODULES = [
  module('dashboard', 'Painel', 'Tela inicial com atalhos, itens recentes e buscas.', [
    action('can_view', 'Acessar o Painel', 'Visualizar atalhos, músicas e repertórios recentes.'),
    action('can_execute', 'Iniciar músicas e repertórios pelo Painel', 'Abrir a execução a partir de atalhos e resultados da busca.'),
  ]),
  module('agenda', 'Agenda', 'Calendario de compromissos, locais, horarios e repertorios vinculados.', [
    action('can_view', 'Acessar Agenda', 'Visualizar os compromissos programados.'),
    action('can_create', 'Criar compromissos', 'Adicionar novos compromissos na agenda.'),
    action('can_edit', 'Alterar compromissos', 'Editar dados, status e repertorios vinculados.'),
    action('can_delete', 'Excluir compromissos', 'Remover compromissos da agenda.'),
  ]),
  module('musicas', 'Cifras', 'Acervo de músicas, cifras e letras.', [
    action('can_view', 'Consultar o acervo de cifras', 'Pesquisar, abrir cifras e letras das músicas.'),
    action('can_create', 'Cadastrar novas músicas', 'Incluir uma música no acervo.'),
    action('can_edit', 'Editar músicas e cifras', 'Alterar dados, letra, cifra e conteúdo musical.'),
    action('can_delete', 'Excluir músicas do acervo', 'Remover uma música e seus vínculos quando aplicável.'),
    action('can_execute', 'Executar músicas', 'Abrir o modo de execução, transpor tom e usar controles de apresentação.'),
    action('can_export', 'Imprimir cifras', 'Usar a opção de impressão na visualização da música.'),
  ]),
  module('afinador', 'Afinador', 'Afinador de violão que usa o microfone do dispositivo.', [
    action('can_view', 'Acessar o Afinador', 'Abrir a tela do afinador.'),
    action('can_execute', 'Iniciar a captação pelo microfone', 'Usar o microfone para detectar a afinação.'),
  ]),
  module('repertorios', 'Repertórios', 'Criação, organização e execução de listas de músicas.', [
    action('can_view', 'Consultar repertórios', 'Pesquisar, abrir detalhes e ver as músicas de cada repertório.'),
    action('can_create', 'Criar repertórios', 'Montar uma nova lista de músicas.'),
    action('can_edit', 'Editar repertórios e suas músicas', 'Alterar dados, ordem, tom e itens do repertório.'),
    action('can_delete', 'Excluir repertórios ou remover músicas', 'Apagar repertórios e desvincular músicas da lista.'),
    action('can_execute', 'Executar repertórios', 'Abrir a apresentação sequencial das músicas.'),
    action('can_export', 'Consultar histórico de alterações', 'Visualizar o histórico de mudanças do repertório.'),
  ]),
  module('pdf_repertorio', 'PDF de repertório', 'Geração de PDFs de cifras ou somente letras.', [
    action('can_view', 'Acessar PDFs de repertórios', 'Pesquisar repertórios disponíveis para impressão.'),
    action('can_export', 'Gerar e imprimir PDF de repertório', 'Criar PDFs cifrados ou somente com letras.'),
  ]),
  module('minha_conta', 'Minha conta', 'Dados pessoais e senha do próprio usuário.', [
    action('can_view', 'Acessar Minha conta', 'Visualizar os dados do próprio acesso.'),
    action('can_edit', 'Alterar a própria senha', 'Definir uma nova senha de acesso.'),
  ]),
  module('usuarios', 'Usuários', 'Cadastro e manutenção de contas do sistema.', [
    action('can_view', 'Consultar usuários', 'Pesquisar e abrir os cadastros de usuários.'),
    action('can_create', 'Cadastrar usuários', 'Criar uma nova conta de acesso.'),
    action('can_edit', 'Editar usuários', 'Alterar dados e papel de um usuário.'),
    action('can_delete', 'Excluir usuários', 'Remover uma conta de acesso, exceto a própria.'),
  ]),
  module('permissoes', 'Permissões', 'Definição dos acessos de cada usuário.', [
    action('can_view', 'Acessar Permissões', 'Selecionar um usuário e consultar seus acessos.'),
    action('can_manage', 'Alterar permissões de usuários', 'Salvar acessos individuais, aplicar ao mesmo papel ou restaurar o padrão.'),
  ]),
  module('personalizacao', 'Personalização', 'Identidade visual e configurações padrão do sistema.', [
    action('can_view', 'Acessar Personalização', 'Visualizar os ajustes globais de aparência.'),
    action('can_manage', 'Alterar a personalização do sistema', 'Salvar ou restaurar identidade visual e preferências de execução.'),
  ]),
  module('convites_publicos', 'Convites públicos', 'Links temporários para acesso público controlado.', [
    action('can_view', 'Consultar convites públicos', 'Visualizar links públicos e seu status.'),
    action('can_create', 'Criar links públicos', 'Gerar novos convites com acessos definidos.'),
    action('can_edit', 'Editar links públicos', 'Alterar nome, expiração e permissões de um convite.'),
    action('can_delete', 'Revogar ou excluir links públicos', 'Desativar ou remover definitivamente um convite.'),
  ]),
];

function module(key, label, description, actions) {
  return { key, label, description, actions };
}

function action(key, label, description) {
  return { key, label, description };
}

const MENU_ROUTE_ORDER = [
  { href: '/dashboard', moduleKey: 'dashboard' },
  { href: '/agenda', moduleKey: 'agenda' },
  { href: '/musicas', moduleKey: 'musicas' },
  { href: '/afinador', moduleKey: 'afinador' },
  { href: '/repertorios', moduleKey: 'repertorios' },
  { href: '/repertorios-pdf', moduleKey: 'pdf_repertorio' },
  { href: '/minha-conta', moduleKey: 'minha_conta' },
  { href: '/usuarios', moduleKey: 'usuarios', adminOnly: true },
  { href: '/permissoes', moduleKey: 'permissoes', adminOnly: true },
  { href: '/personalizacao', moduleKey: 'personalizacao', adminOnly: true },
  { href: '/convites-publicos', moduleKey: 'convites_publicos', adminOnly: true },
];

const EMPTY_ACTIONS = createActions(false);

const ROLE_DEFAULTS = {
  [USER_ROLES.ADMIN]: Object.fromEntries(PERMISSION_MODULES.map((module) => [module.key, createActions(true)])),
  [USER_ROLES.EDITOR]: {
    dashboard: createActions(true, { can_manage: false }),
    agenda: createActions(false, { can_view: true, can_create: true, can_edit: true, can_delete: true }),
    musicas: createActions(true, { can_manage: false }),
    afinador: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    repertorios: createActions(true, { can_manage: false }),
    pdf_repertorio: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    minha_conta: createActions(true, { can_create: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    usuarios: createActions(false),
    permissoes: createActions(false),
    personalizacao: createActions(false),
    convites_publicos: createActions(false),
  },
  [USER_ROLES.MUSICO]: {
    dashboard: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    agenda: createActions(false, { can_view: true, can_create: true, can_edit: true, can_delete: true }),
    musicas: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_manage: false }),
    afinador: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    repertorios: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_manage: false }),
    pdf_repertorio: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    minha_conta: createActions(true, { can_create: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    usuarios: createActions(false),
    permissoes: createActions(false),
    personalizacao: createActions(false),
    convites_publicos: createActions(false),
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
  const route = MENU_ROUTE_ORDER.find((item) => canViewModule(session, item.moduleKey));

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
    Object.prototype.hasOwnProperty.call(overrides, action.key) ? overrides[action.key] : value,
  ]));
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}
