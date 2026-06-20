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
  module('banda_coral', 'Banda/Coral', 'Sessões ao vivo para liderança e participação.', [
    action('can_view', 'Acessar Banda/Coral', 'Visualizar e entrar nas sessões disponíveis.'),
    action('can_create', 'Criar sessões ao vivo', 'Iniciar uma nova sessão para banda ou coral.'),
    action('can_edit', 'Conduzir sessões como líder', 'Escolher músicas, repertórios e atualizar a execução ao vivo.'),
    action('can_delete', 'Excluir sessões ao vivo', 'Remover sessões encerradas.'),
    action('can_execute', 'Participar da execução ao vivo', 'Entrar como integrante e acompanhar a música em execução.'),
    action('can_manage', 'Consultar participantes da sessão', 'Ver quem está conectado à sessão liderada.'),
  ]),
  module('musicas', 'Cifras', 'Acervo de músicas, cifras e letras.', [
    action('can_view', 'Consultar o acervo de cifras', 'Pesquisar, abrir cifras e letras das músicas.'),
    action('can_create', 'Cadastrar novas músicas', 'Incluir uma música no acervo.'),
    action('can_edit', 'Editar músicas e cifras', 'Alterar dados, letra, cifra e conteúdo musical.'),
    action('can_delete', 'Excluir músicas do acervo', 'Remover uma música e seus vínculos quando aplicável.'),
    action('can_execute', 'Executar músicas', 'Abrir o modo de execução, transpor tom e usar controles de apresentação.'),
    action('can_export', 'Imprimir cifras', 'Usar a opção de impressão na visualização da música.'),
  ]),
  module('acordes', 'Dicionário de acordes', 'Consulta visual de acordes e posições para violão.', [
    action('can_view', 'Consultar o dicionário de acordes', 'Pesquisar acordes e visualizar suas posições.'),
  ]),
  module('afinador', 'Afinador', 'Afinador de violão que usa o microfone do dispositivo.', [
    action('can_view', 'Acessar o Afinador', 'Abrir a tela do afinador.'),
    action('can_execute', 'Iniciar a captação pelo microfone', 'Usar o microfone para detectar a afinação.'),
  ]),
  module('letras', 'Letras', 'Consulta de letras por música ou repertório.', [
    action('can_view', 'Consultar letras', 'Pesquisar e abrir letras de músicas e repertórios.'),
    action('can_export', 'Copiar, imprimir ou gerar TXT de letras', 'Exportar letras individuais ou listas de repertório.'),
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
  module('sugestoes', 'Sugestões de músicas', 'Envio e revisão de sugestões para o acervo.', [
    action('can_view', 'Acessar Sugestões de músicas', 'Visualizar as abas de envio e revisão de sugestões.'),
    action('can_create', 'Enviar sugestões de músicas', 'Registrar uma nova sugestão para o acervo.'),
    action('can_edit', 'Revisar e aprovar sugestões', 'Aprovar uma sugestão e cadastrá-la como música.'),
    action('can_delete', 'Rejeitar sugestões', 'Recusar uma sugestão enviada.'),
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
  { href: '/banda-coral', moduleKey: 'banda_coral' },
  { href: '/musicas', moduleKey: 'musicas' },
  { href: '/acordes', moduleKey: 'acordes' },
  { href: '/afinador', moduleKey: 'afinador' },
  { href: '/musicas-letras', moduleKey: 'letras' },
  { href: '/repertorios', moduleKey: 'repertorios' },
  { href: '/repertorios-pdf', moduleKey: 'pdf_repertorio' },
  { href: '/sugestoes', moduleKey: 'sugestoes' },
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
    banda_coral: createActions(true, { can_delete: false, can_export: false, can_manage: false }),
    musicas: createActions(true, { can_manage: false }),
    acordes: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    afinador: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    letras: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    repertorios: createActions(true, { can_manage: false }),
    pdf_repertorio: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    sugestoes: createActions(true, { can_create: true, can_edit: true, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    minha_conta: createActions(true, { can_create: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    usuarios: createActions(false),
    permissoes: createActions(false),
    personalizacao: createActions(false),
    convites_publicos: createActions(false),
  },
  [USER_ROLES.MUSICO]: {
    dashboard: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
    banda_coral: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    musicas: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_manage: false }),
    acordes: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    afinador: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_export: false, can_manage: false }),
    letras: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    repertorios: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_manage: false }),
    pdf_repertorio: createActions(true, { can_create: false, can_edit: false, can_delete: false, can_execute: false, can_manage: false }),
    sugestoes: createActions(true, { can_edit: false, can_delete: false, can_execute: false, can_export: false, can_manage: false }),
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
    Object.prototype.hasOwnProperty.call(overrides, action.key) ? overrides[action.key] : value,
  ]));
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}
