import { canManageUsers } from '../../auth/roles.js';
import {
  createDashboardPublicInvite,
  listPublicInvites,
  revokePublicInvite,
} from '../../../services/publicInvitesService.js';

export async function ConvitesPublicosPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page public-invites-page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem criar convites publicos.</div>';
    return page;
  }

  page.innerHTML = `
    <header class="page-header">
      <div>
        <h1>Convites publicos</h1>
        <p>Links temporarios para consulta controlada do sistema.</p>
      </div>
    </header>
    <section class="public-invites-layout">
      <form class="form public-invite-form">
        <h2>Novo convite</h2>
        <label>
          Nome do convite
          <input name="title" type="text" maxlength="80" required placeholder="Ex.: Painel para ensaio de hoje">
        </label>
        <label>
          Opcao liberada
          <select name="module_key" required>
            <option value="dashboard">Painel</option>
          </select>
        </label>
        <label>
          Valido ate
          <input name="expires_at" type="datetime-local" required>
        </label>
        <label>
          Limite de acessos
          <input name="max_uses" type="number" min="1" step="1" placeholder="Sem limite">
        </label>
        <div class="form-actions field-full">
          <button class="button" type="submit">Criar link publico</button>
        </div>
        <p class="form-message field-full" aria-live="polite"></p>
      </form>
      <section class="public-invites-list-panel">
        <h2>Links criados</h2>
        <div data-role="public-invites-list">
          <p class="page-status">Carregando convites...</p>
        </div>
      </section>
    </section>
  `;

  const form = page.querySelector('.public-invite-form');
  const message = page.querySelector('.form-message');
  const listSlot = page.querySelector('[data-role="public-invites-list"]');

  form.elements.expires_at.value = getDefaultExpiresAt();

  async function loadInvites() {
    listSlot.innerHTML = '<p class="page-status">Carregando convites...</p>';
    const { data, error } = await listPublicInvites();

    if (error) {
      listSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar convites.')}</p>`;
      return;
    }

    listSlot.replaceChildren(createInvitesList(data || [], loadInvites));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const payload = readInviteForm(form, session);

    button.disabled = true;
    message.className = 'form-message field-full';
    message.textContent = 'Criando convite...';

    const { data, error } = await createDashboardPublicInvite(payload);
    button.disabled = false;

    if (error) {
      message.className = 'form-message error field-full';
      message.textContent = error.message || 'Nao foi possivel criar o convite.';
      return;
    }

    const url = getPublicInviteUrl(data.token);
    await copyText(url);
    form.reset();
    form.elements.expires_at.value = getDefaultExpiresAt();
    message.className = 'form-message success field-full';
    message.textContent = 'Link criado e copiado para a area de transferencia.';
    await loadInvites();
  });

  await loadInvites();

  return page;
}

function createInvitesList(invites, onChange) {
  if (!invites.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhum convite criado ainda.';
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'public-invites-list';

  invites.forEach((invite) => {
    const item = document.createElement('article');
    const status = getInviteStatus(invite);
    const url = getPublicInviteUrl(invite.token);
    item.className = `public-invite-card ${status.key}`;
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(invite.title)}</h3>
        <p>${escapeHtml(formatModule(invite.module_key))} - ${escapeHtml(status.label)}</p>
        <small>Valido ate ${escapeHtml(formatDateTime(invite.expires_at))}</small>
        <input type="text" readonly value="${escapeHtml(url)}" aria-label="Link publico">
      </div>
      <div class="public-invite-actions">
        <button class="button-link secondary" type="button" data-action="copy">Copiar</button>
        ${status.key === 'is-active' ? '<button class="button-link danger" type="button" data-action="revoke">Revogar</button>' : ''}
      </div>
    `;

    item.querySelector('[data-action="copy"]').addEventListener('click', async () => {
      await copyText(url);
      item.querySelector('[data-action="copy"]').textContent = 'Copiado';
      window.setTimeout(() => {
        item.querySelector('[data-action="copy"]').textContent = 'Copiar';
      }, 1600);
    });

    item.querySelector('[data-action="revoke"]')?.addEventListener('click', async () => {
      const confirmed = window.confirm(`Revogar o convite "${invite.title}"?`);
      if (!confirmed) return;

      const { error } = await revokePublicInvite(invite.id);
      if (error) {
        window.alert(error.message || 'Nao foi possivel revogar o convite.');
        return;
      }

      await onChange();
    });

    list.append(item);
  });

  return list;
}

function readInviteForm(form, session) {
  return {
    title: form.elements.title.value.trim(),
    expiresAt: new Date(form.elements.expires_at.value).toISOString(),
    maxUses: Number(form.elements.max_uses.value || 0) || null,
    createdBy: session?.user?.id,
  };
}

function getDefaultExpiresAt() {
  const date = new Date();
  date.setHours(date.getHours() + 2);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getInviteStatus(invite) {
  if (invite.revoked_at) return { key: 'is-revoked', label: 'Revogado' };
  if (new Date(invite.expires_at).getTime() <= Date.now()) return { key: 'is-expired', label: 'Expirado' };
  if (invite.max_uses && Number(invite.use_count || 0) >= Number(invite.max_uses)) return { key: 'is-expired', label: 'Limite atingido' };
  return { key: 'is-active', label: 'Ativo' };
}

function getPublicInviteUrl(token) {
  const url = new URL('/publico', window.location.origin);
  url.searchParams.set('token', token);
  return url.toString();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}

function formatModule(moduleKey) {
  const labels = {
    dashboard: 'Painel',
  };

  return labels[moduleKey] || moduleKey;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
