import { USER_ROLES, canManageUsers } from '../../auth/roles.js';
import { createUser, listProfiles, updateProfile } from '../../../services/usersService.js';

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
        <h2>Novo usuario</h2>
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

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');
  let currentUsers = [];

  formSlot.append(createUserForm(async () => {
    const refreshedUsers = await refreshUsers(listSlot);
    currentUsers = mergeUsers([...currentUsers, ...refreshedUsers]);
    listSlot.replaceChildren(createUsersTable(currentUsers));
  }, (createdUser) => {
    currentUsers = mergeUsers([createdUser, ...currentUsers]);
    listSlot.replaceChildren(createUsersTable(currentUsers));
  }));

  try {
    currentUsers = await refreshUsers(listSlot);
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar usuarios.';
  }

  return page;
}

function createUserForm(onRefresh, onCreated) {
  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <label>
      Nome
      <input name="nome" type="text" autocomplete="name">
    </label>
    <label>
      E-mail
      <input name="email" type="email" autocomplete="email" required>
    </label>
    <label>
      Senha inicial
      <input name="password" type="password" autocomplete="new-password" minlength="6" required>
    </label>
    <label>
      Papel
      <select name="papel">
        ${createRoleOptions(USER_ROLES.MUSICO)}
      </select>
    </label>
    <button class="button" type="submit">Cadastrar usuario</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const button = form.querySelector('button');
  const message = form.querySelector('.form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Cadastrando...';

    const { data, error } = await createUser({
      nome: String(formData.get('nome') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      papel: String(formData.get('papel') || USER_ROLES.MUSICO),
    });

    if (error || data?.error) {
      button.disabled = false;
      message.className = 'form-message error';
      message.textContent = error?.message || data?.error || 'Nao foi possivel cadastrar usuario.';
      return;
    }

    form.reset();
    button.disabled = false;
    message.className = 'form-message success';
    message.textContent = 'Usuario cadastrado com sucesso.';

    if (data?.user && onCreated) {
      onCreated(data.user);
    }

    try {
      await onRefresh();
    } catch (refreshError) {
      message.className = 'form-message success';
      message.textContent = 'Usuario cadastrado. Atualize a pagina se ele nao aparecer na lista.';
    }
  });

  return form;
}

async function refreshUsers(slot) {
  const { data, error } = await listProfiles();

  if (error) {
    throw error;
  }

  const users = data || [];
  slot.replaceChildren(createUsersTable(users));
  return users;
}

function createUsersTable(users) {
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
        <th>Papel</th>
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
      <td></td>
    `;

    const roleCell = row.querySelector('td:last-child');
    roleCell.append(createRoleSelect(user));
    body.append(row);
  });

  return table;
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

function createRoleSelect(user) {
  const wrapper = document.createElement('span');
  wrapper.className = 'inline-edit';
  wrapper.innerHTML = `
    <select aria-label="Papel de ${escapeHtml(user.nome || 'usuario')}">
      ${createRoleOptions(user.papel)}
    </select>
  `;

  const select = wrapper.querySelector('select');

  select.addEventListener('change', async () => {
    select.disabled = true;

    const { error } = await updateProfile(user.id, { papel: select.value });

    select.disabled = false;

    if (error) {
      select.value = user.papel;
      window.alert(error.message || 'Nao foi possivel alterar o papel.');
      return;
    }

    user.papel = select.value;
  });

  return wrapper;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
