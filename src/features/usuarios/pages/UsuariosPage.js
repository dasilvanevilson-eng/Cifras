import { USER_ROLES, canManageUsers } from '../../auth/roles.js';
import { createUser, deleteUser, listProfiles, updateUser } from '../../../services/usersService.js';
import { validatePassword } from '../../../utils/password.js';

export async function UsuariosPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page usuarios-page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem gerenciar usuarios.</div>';
    return page;
  }

  page.innerHTML = `
    <h1>Usuarios</h1>
    <section class="user-search-panel">
      <label>
        Buscar usuario
        <input type="search" data-action="search-user" placeholder="Nome, e-mail, telefone ou papel">
      </label>
      <div class="user-search-results" data-role="search-results" hidden></div>
      <p class="page-status" data-role="load-status">Carregando usuarios...</p>
    </section>
    <section class="registered-users-panel">
      <h2>Usuarios cadastrados</h2>
      <div data-role="registered-users"></div>
    </section>
    <section>
      <h2 data-role="form-title">Novo usuario</h2>
      <div class="form-slot"></div>
    </section>
  `;

  const formTitle = page.querySelector('[data-role="form-title"]');
  const formSlot = page.querySelector('.form-slot');
  const searchInput = page.querySelector('[data-action="search-user"]');
  const searchResults = page.querySelector('[data-role="search-results"]');
  const loadStatus = page.querySelector('[data-role="load-status"]');
  const registeredUsersSlot = page.querySelector('[data-role="registered-users"]');
  let currentUsers = [];
  let editingUser = null;
  let isSearchFocused = false;

  function renderForm() {
    formTitle.textContent = editingUser ? 'Editar usuario' : 'Novo usuario';
    formSlot.replaceChildren(createUserForm({
      user: editingUser,
      currentUserId: session?.user?.id,
      onCancel: () => {
        editingUser = null;
        searchInput.value = '';
        hideSearchResults(searchResults);
        renderRegisteredUsers(registeredUsersSlot, currentUsers, searchInput.value, onSelectUser);
        renderForm();
      },
      onDeleted: (userId) => {
        currentUsers = currentUsers.filter((user) => user.id !== userId);
        editingUser = null;
        searchInput.value = '';
        hideSearchResults(searchResults);
        renderRegisteredUsers(registeredUsersSlot, currentUsers, searchInput.value, onSelectUser);
        renderForm();
      },
      onSaved: async (savedUser) => {
        editingUser = null;
        currentUsers = mergeUsers([savedUser, ...currentUsers]);
        searchInput.value = '';
        hideSearchResults(searchResults);
        renderRegisteredUsers(registeredUsersSlot, currentUsers, searchInput.value, onSelectUser);
        renderForm();

        try {
          currentUsers = await loadUsers();
          renderRegisteredUsers(registeredUsersSlot, currentUsers, searchInput.value, onSelectUser);
          hideSearchResults(searchResults);
        } catch (_error) {
          // A lista local ja foi atualizada com o retorno da operacao.
        }
      },
    }));
  }

  function onSelectUser(user) {
    editingUser = user;
    searchInput.value = formatUserLabel(user);
    hideSearchResults(searchResults);
    renderForm();
    window.scrollTo({ top: formSlot.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
  }

  searchInput.addEventListener('input', () => {
    renderRegisteredUsers(registeredUsersSlot, currentUsers, searchInput.value, onSelectUser);
    if (!isSearchFocused) return;
    renderSearchResults(searchResults, currentUsers, searchInput.value, onSelectUser);
  });

  searchInput.addEventListener('focus', () => {
    isSearchFocused = true;
    renderSearchResults(searchResults, currentUsers, searchInput.value, onSelectUser);
  });

  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (document.activeElement?.closest('.user-search-results')) return;
      isSearchFocused = false;
      hideSearchResults(searchResults);
    }, 120);
  });

  renderForm();

  try {
    currentUsers = await loadUsers();
    loadStatus.hidden = true;
    renderRegisteredUsers(registeredUsersSlot, currentUsers, searchInput.value, onSelectUser);
    hideSearchResults(searchResults);
  } catch (error) {
    loadStatus.className = 'page-status error';
    loadStatus.textContent = error.message || 'Nao foi possivel carregar usuarios.';
  }

  return page;
}

function renderRegisteredUsers(slot, users, query, onSelectUser) {
  const normalizedQuery = normalizeText(query);
  const results = normalizedQuery
    ? users.filter((user) => matchesUserSearch(user, normalizedQuery))
    : users;

  if (!results.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhum usuario encontrado.';
    slot.replaceChildren(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'registered-users-list';

  results.forEach((user) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'registered-user-item';
    button.innerHTML = `
      <strong>${escapeHtml(user.nome || '-')}</strong>
      <span>${escapeHtml(user.email || '-')}</span>
      <span>${escapeHtml([formatRole(user.papel), user.telefone].filter(Boolean).join(' | ') || '-')}</span>
    `;
    button.addEventListener('click', () => onSelectUser(user));
    list.append(button);
  });

  slot.replaceChildren(list);
}

function hideSearchResults(slot) {
  slot.hidden = true;
}

function createUserForm({ user = null, currentUserId, onCancel, onDeleted, onSaved }) {
  const isEditing = Boolean(user?.id);
  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <label>
      Nome
      <input name="nome" type="text" autocomplete="name" value="${escapeHtml(user?.nome || '')}" required>
    </label>
    <label>
      E-mail
      <input name="email" type="email" autocomplete="email" value="${escapeHtml(user?.email || '')}" ${isEditing ? 'disabled' : 'required'}>
    </label>
    <label>
      ${isEditing ? 'Nova senha' : 'Senha inicial'}
      <input
        name="password"
        type="password"
        autocomplete="new-password"
        minlength="6"
        ${isEditing ? 'placeholder="Deixe em branco para manter a senha atual"' : 'required'}
      >
    </label>
    <label>
      Telefone
      <input name="telefone" type="tel" autocomplete="tel" value="${escapeHtml(user?.telefone || '')}">
    </label>
    <label>
      Observacao
      <textarea name="observacao" rows="4">${escapeHtml(user?.observacao || '')}</textarea>
    </label>
    <label>
      Papel
      <select name="papel">
        ${createRoleOptions(user?.papel || USER_ROLES.MUSICO)}
      </select>
    </label>
    <div class="form-actions">
      <button class="button" type="submit">${isEditing ? 'Salvar alteracoes' : 'Cadastrar usuario'}</button>
      ${isEditing ? '<button class="button-link secondary" type="button" data-action="cancel">Cancelar</button>' : ''}
      ${isEditing ? '<button class="danger-button" type="button" data-action="delete">Excluir</button>' : ''}
    </div>
    <p class="form-message" aria-live="polite"></p>
  `;

  const button = form.querySelector('button[type="submit"]');
  const cancelButton = form.querySelector('[data-action="cancel"]');
  const deleteButton = form.querySelector('[data-action="delete"]');
  const message = form.querySelector('.form-message');

  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      if (onCancel) onCancel();
    });
  }

  if (deleteButton) {
    deleteButton.disabled = user.id === currentUserId;
    deleteButton.title = deleteButton.disabled ? 'Voce nao pode excluir o proprio usuario.' : 'Excluir usuario';
    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm(`Excluir o usuario "${user.nome || user.email}"? Esta acao remove o login deste usuario.`);
      if (!confirmed) return;

      deleteButton.disabled = true;
      deleteButton.textContent = 'Excluindo...';

      const { data, error } = await deleteUser(user.id);

      if (error || data?.error) {
        deleteButton.disabled = user.id === currentUserId;
        deleteButton.textContent = 'Excluir';
        window.alert(error?.message || data?.error || 'Nao foi possivel excluir usuario.');
        return;
      }

      if (onDeleted) onDeleted(user.id);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const values = {
      id: user?.id,
      nome: String(formData.get('nome') || '').trim(),
      email: String(formData.get('email') || user?.email || '').trim(),
      password: String(formData.get('password') || ''),
      telefone: String(formData.get('telefone') || '').trim(),
      observacao: String(formData.get('observacao') || '').trim(),
      papel: String(formData.get('papel') || USER_ROLES.MUSICO),
    };

    if (values.password) {
      const passwordError = validatePassword(values.password);

      if (passwordError) {
        message.className = 'form-message error';
        message.textContent = passwordError;
        return;
      }
    }

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = isEditing ? 'Salvando...' : 'Cadastrando...';

    const { data, error } = isEditing
      ? await updateUser(values)
      : await createUser(values);

    if (error || data?.error) {
      button.disabled = false;
      message.className = 'form-message error';
      message.textContent = error?.message || data?.error || 'Nao foi possivel salvar usuario.';
      return;
    }

    form.reset();
    button.disabled = false;
    message.className = 'form-message success';
    message.textContent = isEditing ? 'Usuario atualizado com sucesso.' : 'Usuario cadastrado com sucesso.';

    if (data?.user && onSaved) {
      onSaved({ ...user, ...data.user, email: data.user.email || user?.email || values.email });
    }
  });

  return form;
}

async function loadUsers() {
  const { data, error } = await listProfiles();

  if (error) {
    throw error;
  }

  return data || [];
}

function renderSearchResults(slot, users, query, onSelectUser) {
  const normalizedQuery = normalizeText(query);
  const results = normalizedQuery
    ? users.filter((user) => matchesUserSearch(user, normalizedQuery))
    : users.slice(0, 8);

  if (!results.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhum usuario encontrado.';
    slot.replaceChildren(empty);
    slot.hidden = false;
    return;
  }

  const list = document.createElement('div');
  list.className = 'user-search-list';

  results.forEach((user) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'user-search-item';
    button.innerHTML = `
      <strong>${escapeHtml(user.nome || '-')}</strong>
      <span>${escapeHtml(user.email || '-')}</span>
      <span>${escapeHtml([formatRole(user.papel), user.telefone].filter(Boolean).join(' | ') || '-')}</span>
    `;
    button.addEventListener('click', () => onSelectUser(user));
    list.append(button);
  });

  slot.replaceChildren(list);
  slot.hidden = false;
}

function matchesUserSearch(user, normalizedQuery) {
  return normalizeText([
    user.nome,
    user.email,
    user.telefone,
    user.papel,
    user.observacao,
  ].join(' ')).includes(normalizedQuery);
}

function mergeUsers(users) {
  const uniqueUsers = new Map();

  users.forEach((user) => {
    if (!user?.id) return;
    uniqueUsers.set(user.id, {
      ...uniqueUsers.get(user.id),
      ...user,
    });
  });

  return [...uniqueUsers.values()];
}

function createRoleOptions(selectedRole) {
  return [
    [USER_ROLES.MUSICO, 'Musico'],
    [USER_ROLES.EDITOR, 'Editor'],
    [USER_ROLES.ADMIN, 'Admin'],
  ].map(([value, label]) => (
    `<option value="${value}"${value === selectedRole ? ' selected' : ''}>${label}</option>`
  )).join('');
}

function formatUserLabel(user) {
  return [user.nome, user.email].filter(Boolean).join(' - ');
}

function formatRole(role) {
  const roles = {
    [USER_ROLES.MUSICO]: 'Musico',
    [USER_ROLES.EDITOR]: 'Editor',
    [USER_ROLES.ADMIN]: 'Admin',
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
