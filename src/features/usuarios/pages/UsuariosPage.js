import { USER_ROLES, canManageUsers } from '../../auth/roles.js';
import { createUser, deleteUser, listProfiles, updateUser } from '../../../services/usersService.js';

export async function UsuariosPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem gerenciar usuarios.</div>';
    return page;
  }

  page.innerHTML = `
    <h1>Usuarios</h1>
    <div class="page-grid usuarios-grid">
      <section>
        <h2 data-role="form-title">Novo usuario</h2>
        <div class="form-slot"></div>
      </section>
      <section>
        <h2>Usuarios cadastrados</h2>
        <div class="list-slot">
          <div class="page-status">Carregando usuarios...</div>
        </div>
      </section>
    </div>
  `;

  const formTitle = page.querySelector('[data-role="form-title"]');
  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');
  let currentUsers = [];
  let editingUser = null;

  function renderForm() {
    formTitle.textContent = editingUser ? 'Editar usuario' : 'Novo usuario';
    formSlot.replaceChildren(createUserForm({
      user: editingUser,
      onCancel: () => {
        editingUser = null;
        renderForm();
      },
      onSaved: async (savedUser) => {
        editingUser = null;
        currentUsers = mergeUsers([savedUser, ...currentUsers]);
        listSlot.replaceChildren(createUsersTable(currentUsers, tableOptions));
        renderForm();

        try {
          currentUsers = await refreshUsers(listSlot, tableOptions);
        } catch (_error) {
          // A lista local ja foi atualizada com o retorno da operacao.
        }
      },
    }));
  }

  const tableOptions = {
    currentUserId: session?.user?.id,
    onEdit: (user) => {
      editingUser = user;
      renderForm();
      window.scrollTo({ top: formSlot.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
    },
    onDeleted: async (userId) => {
      currentUsers = currentUsers.filter((user) => user.id !== userId);
      listSlot.replaceChildren(createUsersTable(currentUsers, tableOptions));
    },
  };

  renderForm();

  try {
    currentUsers = await refreshUsers(listSlot, tableOptions);
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar usuarios.';
  }

  return page;
}

function createUserForm({ user = null, onCancel, onSaved }) {
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
    </div>
    <p class="form-message" aria-live="polite"></p>
  `;

  const button = form.querySelector('button[type="submit"]');
  const cancelButton = form.querySelector('[data-action="cancel"]');
  const message = form.querySelector('.form-message');

  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      if (onCancel) onCancel();
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

async function refreshUsers(slot, options) {
  const { data, error } = await listProfiles();

  if (error) {
    throw error;
  }

  const users = data || [];
  slot.replaceChildren(createUsersTable(users, options));
  return users;
}

function createUsersTable(users, options = {}) {
  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhum usuario cadastrado ainda.';
    return empty;
  }

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nome</th>
        <th>E-mail</th>
        <th>Telefone</th>
        <th>Papel</th>
        <th>Observacao</th>
        <th>Acoes</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  users.forEach((user) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(user.nome || '-')}</td>
      <td>${escapeHtml(user.email || '-')}</td>
      <td>${escapeHtml(user.telefone || '-')}</td>
      <td>${escapeHtml(formatRole(user.papel))}</td>
      <td>${escapeHtml(user.observacao || '-')}</td>
      <td class="table-actions"></td>
    `;

    const actionsCell = row.querySelector('.table-actions');
    actionsCell.append(createEditButton(user, options));
    actionsCell.append(createDeleteButton(user, options));
    body.append(row);
  });

  return table;
}

function createEditButton(user, options) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-button';
  button.textContent = 'Editar';

  button.addEventListener('click', () => {
    if (options.onEdit) options.onEdit(user);
  });

  return button;
}

function createDeleteButton(user, options) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger-button';
  button.textContent = 'Excluir';
  button.disabled = user.id === options.currentUserId;
  button.title = button.disabled ? 'Voce nao pode excluir o proprio usuario.' : 'Excluir usuario';

  button.addEventListener('click', async () => {
    const confirmed = window.confirm(`Excluir o usuario "${user.nome || user.email}"? Esta acao remove o login deste usuario.`);
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Excluindo...';

    const { data, error } = await deleteUser(user.id);

    if (error || data?.error) {
      button.disabled = false;
      button.textContent = 'Excluir';
      window.alert(error?.message || data?.error || 'Nao foi possivel excluir usuario.');
      return;
    }

    if (options.onDeleted) {
      options.onDeleted(user.id);
    }
  });

  return button;
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

function formatRole(role) {
  const roles = {
    [USER_ROLES.MUSICO]: 'Musico',
    [USER_ROLES.EDITOR]: 'Editor',
    [USER_ROLES.ADMIN]: 'Admin',
  };

  return roles[role] || role || '-';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
