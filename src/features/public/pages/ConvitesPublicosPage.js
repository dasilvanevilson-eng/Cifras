import { canManageUsers } from '../../auth/roles.js';
import {
  createBandaCoralPublicInvite,
  createDashboardPublicInvite,
  deletePublicInvite,
  listPublicInvites,
  revokePublicInvite,
} from '../../../services/publicInvitesService.js';
import { listRepertorios } from '../../../services/repertoriosService.js';

export async function ConvitesPublicosPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page public-invites-page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem criar convites publicos.</div>';
    return page;
  }

  page.innerHTML = `
    <header class="dashboard-header">
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
            <option value="banda_coral">Modo Banda/Coral</option>
          </select>
        </label>
        <label data-role="banda-access-mode" hidden>
          Entrar como
          <select name="access_mode">
            <option value="ambos">Lider ou integrante</option>
            <option value="lider">Apenas lider</option>
            <option value="integrante">Apenas integrante</option>
          </select>
        </label>
        <fieldset class="public-invite-repertorios field-full" data-role="banda-repertorios" hidden>
          <legend>Repertorios liberados</legend>
          <div data-role="banda-repertorios-list">
            <p class="page-status">Carregando repertorios...</p>
          </div>
        </fieldset>
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
  const bandaAccessMode = page.querySelector('[data-role="banda-access-mode"]');
  const bandaRepertorios = page.querySelector('[data-role="banda-repertorios"]');
  const repertoriosSlot = page.querySelector('[data-role="banda-repertorios-list"]');
  let repertorios = [];

  form.elements.expires_at.value = getDefaultExpiresAt();
  updateModuleFields(form, bandaAccessMode, bandaRepertorios);

  form.elements.module_key.addEventListener('change', () => {
    updateModuleFields(form, bandaAccessMode, bandaRepertorios);
  });

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

    if (payload.moduleKey === 'banda_coral' && !payload.repertorioIds.length) {
      message.className = 'form-message error field-full';
      message.textContent = 'Selecione pelo menos um repertorio para o convite Banda/Coral.';
      return;
    }

    button.disabled = true;
    message.className = 'form-message field-full';
    message.textContent = 'Criando convite...';

    const { data, error } = payload.moduleKey === 'banda_coral'
      ? await createBandaCoralPublicInvite(payload)
      : await createDashboardPublicInvite(payload);
    button.disabled = false;

    if (error) {
      message.className = 'form-message error field-full';
      message.textContent = error.message || 'Nao foi possivel criar o convite.';
      return;
    }

    const url = getPublicInviteUrl(data.token, data.module_key);
    await copyText(url);
    form.reset();
    form.elements.expires_at.value = getDefaultExpiresAt();
    updateModuleFields(form, bandaAccessMode, bandaRepertorios);
    message.className = 'form-message success field-full';
    message.textContent = 'Link criado e copiado para a area de transferencia.';
    await loadInvites();
  });

  await Promise.all([loadRepertorios(), loadInvites()]);

  return page;

  async function loadRepertorios() {
    const { data, error } = await listRepertorios();

    if (error) {
      repertoriosSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar repertorios.')}</p>`;
      return;
    }

    repertorios = data || [];
    repertoriosSlot.replaceChildren(createRepertoriosChecklist(repertorios));
  }
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
    const url = getPublicInviteUrl(invite.token, invite.module_key);
    item.className = `public-invite-card ${status.key}`;
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(invite.title)}</h3>
        <p class="public-invite-meta">
          <span>${escapeHtml(formatModule(invite.module_key))}</span>
          <strong>${escapeHtml(status.label)}</strong>
        </p>
        <small>Valido ate ${escapeHtml(formatDateTime(invite.expires_at))}</small>
        <small>${escapeHtml(formatUses(invite))}</small>
        <input type="text" readonly value="${escapeHtml(url)}" aria-label="Link publico">
      </div>
      <div class="public-invite-actions">
        <button class="button-link secondary" type="button" data-action="copy">Copiar</button>
        ${status.key === 'is-active' ? '<button class="button-link danger" type="button" data-action="revoke">Revogar</button>' : ''}
        <button class="button-link danger" type="button" data-action="delete">Excluir</button>
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

    item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      const confirmed = window.confirm(`Excluir definitivamente o convite "${invite.title}"? Esta acao remove o link da lista.`);
      if (!confirmed) return;

      const { error } = await deletePublicInvite(invite.id);
      if (error) {
        window.alert(error.message || 'Nao foi possivel excluir o convite.');
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
    moduleKey: form.elements.module_key.value,
    title: form.elements.title.value.trim(),
    expiresAt: new Date(form.elements.expires_at.value).toISOString(),
    maxUses: Number(form.elements.max_uses.value || 0) || null,
    createdBy: session?.user?.id,
    accessMode: form.elements.access_mode?.value || 'ambos',
    repertorioIds: Array.from(form.querySelectorAll('[name="repertorio_ids"]:checked')).map((input) => input.value),
  };
}

function updateModuleFields(form, bandaAccessMode, bandaRepertorios) {
  const isBandaCoral = form.elements.module_key.value === 'banda_coral';
  bandaAccessMode.hidden = !isBandaCoral;
  bandaRepertorios.hidden = !isBandaCoral;
}

function createRepertoriosChecklist(repertorios) {
  if (!repertorios.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhum repertorio cadastrado.';
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'public-invite-repertorios-list';

  repertorios.forEach((repertorio) => {
    const label = document.createElement('label');
    label.className = 'checkbox-label public-invite-repertorio-option';
    label.innerHTML = `
      <input name="repertorio_ids" type="checkbox" value="${escapeHtml(repertorio.id)}">
      <span>${escapeHtml(repertorio.nome || repertorio.titulo || 'Repertorio')}</span>
    `;
    list.append(label);
  });

  return list;
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

function getPublicInviteUrl(token, moduleKey = 'dashboard') {
  const path = moduleKey === 'banda_coral' ? '/publico/banda-coral' : '/publico';
  const url = new URL(path, window.location.origin);
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
    banda_coral: 'Modo Banda/Coral',
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

function formatUses(invite) {
  const count = Number(invite.use_count || 0);
  if (!invite.max_uses) return `${count} acesso${count === 1 ? '' : 's'} registrados`;
  return `${count} de ${Number(invite.max_uses)} acesso${Number(invite.max_uses) === 1 ? '' : 's'}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
