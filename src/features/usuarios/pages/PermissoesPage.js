import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  resolvePermissions,
} from '../../auth/permissions.js';
import { canManageUsers } from '../../auth/roles.js';
import { listProfiles } from '../../../services/usersService.js';
import {
  listUserPermissionOverrides,
  resetUserPermissions,
  saveUserPermissions,
  saveUsersPermissions,
} from '../../../services/permissionsService.js';

export async function PermissoesPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page permissoes-page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem configurar permissoes.</div>';
    return page;
  }

  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Permissoes</h1>
        <p>Controle o que cada usuario pode ver e executar.</p>
      </div>
    </header>
    <section class="permissions-layout">
      <aside class="permissions-users-panel">
        <label>
          Buscar usuario
          <input type="search" data-action="search-user" placeholder="Nome, e-mail ou papel">
        </label>
        <p class="page-status" data-role="load-status">Carregando usuarios...</p>
        <div class="permissions-user-results" data-role="users-list" hidden></div>
        <p class="permissions-selected-user" data-role="selected-user" hidden></p>
      </aside>
      <section class="permissions-editor-panel">
        <p class="page-status">Selecione um usuario para configurar as permissoes.</p>
      </section>
    </section>
  `;

  const searchInput = page.querySelector('[data-action="search-user"]');
  const loadStatus = page.querySelector('[data-role="load-status"]');
  const usersSlot = page.querySelector('[data-role="users-list"]');
  const selectedUserLabel = page.querySelector('[data-role="selected-user"]');
  const editorSlot = page.querySelector('.permissions-editor-panel');
  let users = [];
  let selectedUser = null;
  let isSearchFocused = false;

  function renderUsers() {
    usersSlot.replaceChildren(createUsersList(users, searchInput.value, async (user) => {
      selectedUser = user;
      searchInput.value = formatUserLabel(user);
      renderSelectedUser(selectedUserLabel, selectedUser);
      hideUsersList(usersSlot);
      await renderEditor(editorSlot, selectedUser, users);
    }, selectedUser?.id));
    usersSlot.hidden = false;
  }

  searchInput.addEventListener('input', () => {
    if (!isSearchFocused) return;
    renderUsers();
  });

  searchInput.addEventListener('focus', () => {
    isSearchFocused = true;
    renderUsers();
  });

  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (document.activeElement?.closest('.permissions-user-results')) return;
      isSearchFocused = false;
      hideUsersList(usersSlot);
    }, 120);
  });

  try {
    const { data, error } = await listProfiles();

    if (error) throw error;

    users = data || [];
    loadStatus.hidden = true;
    hideUsersList(usersSlot);
  } catch (error) {
    loadStatus.className = 'page-status error';
    loadStatus.textContent = error.message || 'Nao foi possivel carregar usuarios.';
  }

  return page;
}

function createUsersList(users, query, onSelect, selectedUserId) {
  const normalizedQuery = normalizeText(query);
  const filteredUsers = normalizedQuery
    ? users.filter((user) => matchesUserSearch(user, normalizedQuery))
    : users.slice(0, 8);

  if (!filteredUsers.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhum usuario encontrado.';
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'permissions-users-list';

  filteredUsers.forEach((user) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `permissions-user-item${user.id === selectedUserId ? ' is-active' : ''}`;
    button.innerHTML = `
      <strong>${escapeHtml(user.nome || '-')}</strong>
      <span>${escapeHtml(user.email || '-')}</span>
      <small>${escapeHtml(formatRole(user.papel))}</small>
    `;
    button.addEventListener('click', () => onSelect(user));
    list.append(button);
  });

  return list;
}

function hideUsersList(slot) {
  slot.hidden = true;
}

function renderSelectedUser(slot, user) {
  slot.hidden = !user;
  slot.textContent = user ? `Selecionado: ${formatUserLabel(user)}` : '';
}

async function renderEditor(slot, user, users = []) {
  slot.innerHTML = '<p class="page-status">Carregando permissoes...</p>';

  const { data, error } = await listUserPermissionOverrides(user.id);

  if (error) {
    slot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar permissoes.')}</p>`;
    return;
  }

  const permissions = resolvePermissions(user.papel, data || []);
  const editor = createPermissionsEditor(user, permissions, Boolean(data?.length), async (nextPermissions, message, button) => {
    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando permissoes...';

    const { error: saveError } = await saveUserPermissions(user.id, nextPermissions);

    button.disabled = false;

    if (saveError) {
      message.className = 'form-message error';
      message.textContent = saveError.message || 'Nao foi possivel salvar permissoes.';
      return;
    }

    const sameRoleUsers = getSameRoleUsers(users, user);

    if (sameRoleUsers.length) {
      const confirmed = window.confirm(`Aplicar estas mesmas permissoes aos outros ${sameRoleUsers.length} usuario${sameRoleUsers.length === 1 ? '' : 's'} com papel "${formatRole(user.papel)}"?`);

      if (confirmed) {
        button.disabled = true;
        message.className = 'form-message';
        message.textContent = 'Aplicando permissoes aos usuarios do mesmo papel...';

        const { error: bulkSaveError } = await saveUsersPermissions(sameRoleUsers.map((sameRoleUser) => sameRoleUser.id), nextPermissions);

        button.disabled = false;

        if (bulkSaveError) {
          message.className = 'form-message error';
          message.textContent = bulkSaveError.message || 'Permissoes salvas para o usuario, mas nao foi possivel aplicar aos demais.';
          return;
        }

        message.className = 'form-message success';
        message.textContent = `Permissoes salvas e aplicadas a ${sameRoleUsers.length} usuario${sameRoleUsers.length === 1 ? '' : 's'} com o mesmo papel.`;
        return;
      }
    }

    message.className = 'form-message success';
    message.textContent = 'Permissoes salvas com sucesso.';
  }, async (message) => {
    const confirmed = window.confirm(`Restaurar as permissoes padrao do perfil de "${user.nome || user.email}"?`);
    if (!confirmed) return;

    message.className = 'form-message';
    message.textContent = 'Restaurando permissoes padrao...';

    const { error: resetError } = await resetUserPermissions(user.id);

    if (resetError) {
      message.className = 'form-message error';
      message.textContent = resetError.message || 'Nao foi possivel restaurar permissoes.';
      return;
    }

    await renderEditor(slot, user, users);
  });

  slot.replaceChildren(editor);
}

function getSameRoleUsers(users, currentUser) {
  const currentRole = normalizeText(currentUser?.papel);
  return (users || []).filter((user) => (
    user.id
    && user.id !== currentUser?.id
    && normalizeText(user.papel) === currentRole
  ));
}

function createPermissionsEditor(user, permissions, hasCustomPermissions, onSave, onReset) {
  const form = document.createElement('form');
  form.className = 'permissions-editor form';
  form.innerHTML = `
    <header class="permissions-editor-header">
      <div>
        <h2>${escapeHtml(user.nome || 'Usuario')}</h2>
        <p>${escapeHtml([user.email, formatRole(user.papel)].filter(Boolean).join(' | '))}</p>
      </div>
      <span class="user-role">${hasCustomPermissions ? 'Personalizado' : 'Padrao do perfil'}</span>
    </header>
    <div class="permissions-table-wrap">
      <table class="data-table permissions-table">
        <thead>
          <tr>
            <th>Opcao</th>
            ${PERMISSION_ACTIONS.map((action) => `<th>${escapeHtml(action.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${PERMISSION_MODULES.map((module) => createModuleRow(module, permissions[module.key])).join('')}
        </tbody>
      </table>
    </div>
    <div class="form-actions">
      <button class="button" type="submit">Salvar permissoes</button>
      <button class="button-link secondary" type="button" data-action="reset-permissions">Restaurar padrao do perfil</button>
    </div>
    <p class="form-message" aria-live="polite"></p>
  `;

  const message = form.querySelector('.form-message');
  const saveButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await onSave(readPermissionsFromForm(form), message, saveButton);
  });

  form.querySelector('[data-action="reset-permissions"]').addEventListener('click', async () => {
    await onReset(message);
  });

  return form;
}

function createModuleRow(module, modulePermissions = {}) {
  return `
    <tr>
      <th scope="row">
        <strong>${escapeHtml(module.label)}</strong>
        <small>${escapeHtml(module.description)}</small>
      </th>
      ${PERMISSION_ACTIONS.map((action) => `
        <td>
          <label class="permission-toggle" title="${escapeHtml(action.label)} - ${escapeHtml(module.label)}">
            <input
              type="checkbox"
              name="${escapeHtml(module.key)}.${escapeHtml(action.key)}"
              ${modulePermissions[action.key] ? 'checked' : ''}
            >
            <span>${escapeHtml(action.label)}</span>
          </label>
        </td>
      `).join('')}
    </tr>
  `;
}

function readPermissionsFromForm(form) {
  return Object.fromEntries(PERMISSION_MODULES.map((module) => [
    module.key,
    Object.fromEntries(PERMISSION_ACTIONS.map((action) => [
      action.key,
      Boolean(form.elements[`${module.key}.${action.key}`]?.checked),
    ])),
  ]));
}

function matchesUserSearch(user, normalizedQuery) {
  return normalizeText([
    user.nome,
    user.email,
    user.papel,
  ].join(' ')).includes(normalizedQuery);
}

function formatUserLabel(user) {
  return [user.nome, user.email].filter(Boolean).join(' - ');
}

function formatRole(role) {
  const roles = {
    admin: 'Admin',
    editor: 'Editor',
    musico: 'Musico',
  };

  return roles[role] || role || '';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
