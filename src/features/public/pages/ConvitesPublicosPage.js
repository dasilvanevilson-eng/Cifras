import { canManageUsers } from '../../auth/roles.js';
import {
  createBandaCoralPublicInvite,
  createDashboardPublicInvite,
  createLetrasRepertorioPublicInvite,
  deletePublicInvite,
  listPublicInvites,
  revokePublicInvite,
  updatePublicInvite,
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
        <p data-page-info>Links temporarios para consulta controlada do sistema.</p>
      </div>
    </header>
    <section class="public-invites-layout">
      <form class="form public-invite-form">
        <h2 data-role="form-title">Novo convite</h2>
        <label>
          Nome do convite
          <input name="title" type="text" maxlength="80" required placeholder="Ex.: Painel para ensaio de hoje">
        </label>
        <label>
          Opcao liberada
          <select name="module_key" required>
            <option value="dashboard">Painel</option>
            <option value="banda_coral">Modo Banda/Coral</option>
            <option value="letras_repertorio">Modo Letras</option>
          </select>
        </label>
        <fieldset class="public-invite-permissions field-full" data-role="banda-permissions" hidden>
          <legend>Permissoes e restricoes</legend>
          <div class="banda-access-options" data-role="banda-access-mode">
            <span>Permitir entrar como</span>
            <label class="checkbox-label"><input name="allow_banda_leader" type="checkbox" checked><span>Líder</span></label>
            <label class="checkbox-label"><input name="allow_banda_member" type="checkbox" checked><span>Integrante</span></label>
          </div>
          <label class="checkbox-label" data-role="banda-acervo-access">
            <input name="allow_acervo" type="checkbox" checked>
            <span>Permitir acesso ao acervo</span>
          </label>
          <div class="public-invite-repertorios" data-role="banda-repertorios">
            <h3>Repertorios liberados</h3>
            <label class="public-invite-repertorio-search">
              Buscar repertório
              <input data-action="search-banda-repertorios" type="search" placeholder="Nome ou data">
            </label>
            <div class="public-invite-repertorio-cascade" data-role="banda-repertorios-list" hidden>
              <p class="page-status">Carregando repertorios...</p>
            </div>
          </div>
        </fieldset>
        <fieldset class="public-invite-permissions field-full" data-role="letras-permissions" hidden>
          <legend>Repertorio liberado</legend>
          <div class="letras-content-options">
            <span>Compartilhar</span>
            <label class="checkbox-label"><input name="share_cifras" type="checkbox"><span>Cifras</span></label>
            <label class="checkbox-label"><input name="share_letras" type="checkbox" checked><span>Letras</span></label>
          </div>
          <div class="public-invite-repertorios" data-role="letras-repertorios">
            <label class="public-invite-repertorio-search">
              Buscar repertório liberado
              <input data-action="search-letras-repertorios" type="search" placeholder="Nome ou data">
            </label>
            <div class="public-invite-repertorio-cascade" data-role="letras-repertorios-list" hidden>
              <p class="page-status">Carregando repertorios...</p>
            </div>
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
          <button class="button-link secondary" type="button" data-action="cancel-edit" hidden>Cancelar edicao</button>
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
  const formTitle = page.querySelector('[data-role="form-title"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const cancelEditButton = form.querySelector('[data-action="cancel-edit"]');
  const message = page.querySelector('.form-message');
  const listSlot = page.querySelector('[data-role="public-invites-list"]');
  const bandaPermissions = page.querySelector('[data-role="banda-permissions"]');
  const letrasPermissions = page.querySelector('[data-role="letras-permissions"]');
  const repertoriosSlot = page.querySelector('[data-role="banda-repertorios-list"]');
  const repertoriosSearch = page.querySelector('[data-action="search-banda-repertorios"]');
  const letrasRepertoriosSearch = page.querySelector('[data-action="search-letras-repertorios"]');
  const letrasRepertoriosSlot = page.querySelector('[data-role="letras-repertorios-list"]');
  const bandaLeaderInput = form.elements.allow_banda_leader;
  const bandaMemberInput = form.elements.allow_banda_member;
  const shareCifrasInput = form.elements.share_cifras;
  const shareLetrasInput = form.elements.share_letras;
  let repertorios = [];
  let editingInvite = null;

  form.elements.expires_at.value = getDefaultExpiresAt();
  updateModuleFields(form, { bandaPermissions, letrasPermissions });

  form.elements.module_key.addEventListener('change', () => {
    updateModuleFields(form, { bandaPermissions, letrasPermissions });
  });
  [bandaLeaderInput, bandaMemberInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (!bandaLeaderInput.checked && !bandaMemberInput.checked) input.checked = true;
    });
  });
  [shareCifrasInput, shareLetrasInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (!shareCifrasInput.checked && !shareLetrasInput.checked) input.checked = true;
    });
  });
  repertoriosSearch.addEventListener('input', filterBandaRepertorios);
  repertoriosSearch.addEventListener('focus', filterBandaRepertorios);
  page.querySelector('[data-role="banda-repertorios"]').addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!page.querySelector('[data-role="banda-repertorios"]').contains(document.activeElement)) repertoriosSlot.hidden = true;
    });
  });
  letrasRepertoriosSearch.addEventListener('input', filterLetrasRepertorios);
  letrasRepertoriosSearch.addEventListener('focus', filterLetrasRepertorios);
  page.querySelector('[data-role="letras-repertorios"]').addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!page.querySelector('[data-role="letras-repertorios"]').contains(document.activeElement)) letrasRepertoriosSlot.hidden = true;
    });
  });

  async function loadInvites() {
    listSlot.innerHTML = '<p class="page-status">Carregando convites...</p>';
    const { data, error } = await listPublicInvites();

    if (error) {
      listSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar convites.')}</p>`;
      return;
    }

    listSlot.replaceChildren(createInvitesList(data || [], {
      onChange: loadInvites,
      onEdit: startEditInvite,
    }));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = readInviteForm(form, session);

    if (payload.moduleKey === 'banda_coral' && !payload.allowAcervo && !payload.repertorioIds.length) {
      message.className = 'form-message error field-full';
      message.textContent = 'Revise as permissões';
      return;
    }

    if (payload.moduleKey === 'letras_repertorio' && !payload.repertorioIds.length) {
      message.className = 'form-message error field-full';
      message.textContent = 'Selecione um repertorio para liberar o modo Letras.';
      return;
    }

    submitButton.disabled = true;
    message.className = 'form-message field-full';
    message.textContent = editingInvite ? 'Salvando convite...' : 'Criando convite...';
    const wasEditing = Boolean(editingInvite);

    const { data, error } = editingInvite
      ? await updatePublicInvite(editingInvite.id, payload)
      : await createInviteByModule(payload);
    submitButton.disabled = false;

    if (error) {
      message.className = 'form-message error field-full';
      message.textContent = error.message || (editingInvite ? 'Nao foi possivel atualizar o convite.' : 'Nao foi possivel criar o convite.');
      return;
    }

    if (!wasEditing) {
      const url = getPublicInviteUrl(data.token, data.module_key);
      await copyText(url);
    }

    resetForm();
    message.className = 'form-message success field-full';
    message.textContent = wasEditing
      ? 'Convite atualizado.'
      : 'Link criado e copiado para a area de transferencia.';
    await loadInvites();
  });

  cancelEditButton.addEventListener('click', () => {
    resetForm();
    message.className = 'form-message field-full';
    message.textContent = '';
  });

  await Promise.all([loadRepertorios(), loadInvites()]);

  return page;

  async function loadRepertorios() {
    const { data, error } = await listRepertorios();

    if (error) {
      repertoriosSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar repertorios.')}</p>`;
      letrasRepertoriosSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar repertorios.')}</p>`;
      return;
    }

    repertorios = data || [];
    repertoriosSlot.replaceChildren(createRepertoriosChecklist(repertorios, { name: 'banda_repertorio_ids', multiple: true }));
    repertoriosSlot.hidden = true;
    letrasRepertoriosSlot.replaceChildren(createRepertoriosChecklist(repertorios, { name: 'letras_repertorio_id', multiple: false }));
    letrasRepertoriosSlot.hidden = true;
  }

  function startEditInvite(invite) {
    const metadata = getInviteMetadata(invite);
    editingInvite = invite;

    formTitle.textContent = 'Editar convite';
    submitButton.textContent = 'Salvar alteracoes';
    cancelEditButton.hidden = false;
    message.className = 'form-message field-full';
    message.textContent = 'Editando link existente. O token atual sera preservado.';

    form.elements.title.value = invite.title || '';
    form.elements.module_key.value = invite.module_key || 'dashboard';
    setBandaAccessMode(form, metadata.access_mode || 'ambos');
    form.elements.allow_acervo.checked = metadata.allow_acervo !== false;
    form.elements.share_cifras.checked = metadata.letras_content_mode === 'full_cifra';
    form.elements.share_letras.checked = true;
    form.elements.expires_at.value = toDateTimeLocalValue(invite.expires_at);
    form.elements.max_uses.value = invite.max_uses || '';
    setCheckedRepertorios(form, getInviteRepertorioIds(invite, metadata));
    updateModuleFields(form, { bandaPermissions, letrasPermissions });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetForm() {
    editingInvite = null;
    form.reset();
    formTitle.textContent = 'Novo convite';
    submitButton.textContent = 'Criar link publico';
    cancelEditButton.hidden = true;
    form.elements.expires_at.value = getDefaultExpiresAt();
    form.elements.allow_acervo.checked = true;
    setBandaAccessMode(form, 'ambos');
    form.elements.share_cifras.checked = false;
    form.elements.share_letras.checked = true;
    repertoriosSearch.value = '';
    repertoriosSlot.hidden = true;
    letrasRepertoriosSearch.value = '';
    letrasRepertoriosSlot.hidden = true;
    updateModuleFields(form, { bandaPermissions, letrasPermissions });
  }

  function filterBandaRepertorios() {
    const query = normalizeText(repertoriosSearch.value);
    repertoriosSlot.querySelectorAll('.public-invite-repertorio-option').forEach((option) => {
      option.hidden = query && !normalizeText(option.textContent).includes(query);
    });
    repertoriosSlot.hidden = false;
  }

  function filterLetrasRepertorios() {
    const query = normalizeText(letrasRepertoriosSearch.value);
    letrasRepertoriosSlot.querySelectorAll('.public-invite-repertorio-option').forEach((option) => {
      option.hidden = query && !normalizeText(option.textContent).includes(query);
    });
    letrasRepertoriosSlot.hidden = false;
  }
}

function createInvitesList(invites, { onChange, onEdit }) {
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
          <span class="public-invite-expiry">Válido até ${escapeHtml(formatDateTime(invite.expires_at))}</span>
        </p>
        <small>${escapeHtml(formatUses(invite))}</small>
      </div>
      <div class="public-invite-actions">
        <button class="button-link secondary" type="button" data-action="copy">Copiar link</button>
        <button class="button-link secondary" type="button" data-action="edit">Editar</button>
        ${status.key === 'is-active' ? '<button class="button-link danger" type="button" data-action="revoke">Revogar</button>' : ''}
        <button class="button-link danger" type="button" data-action="delete">Excluir</button>
      </div>
    `;

    item.querySelector('[data-action="copy"]').addEventListener('click', async () => {
      await copyText(createInviteShareText(invite.title, url));
      item.querySelector('[data-action="copy"]').textContent = 'Copiado';
      window.setTimeout(() => {
        item.querySelector('[data-action="copy"]').textContent = 'Copiar';
      }, 1600);
    });

    item.querySelector('[data-action="edit"]').addEventListener('click', () => {
      onEdit(invite);
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
  const moduleKey = form.elements.module_key.value;

  return {
    moduleKey,
    title: form.elements.title.value.trim(),
    expiresAt: new Date(form.elements.expires_at.value).toISOString(),
    maxUses: Number(form.elements.max_uses.value || 0) || null,
    createdBy: session?.user?.id,
    accessMode: getBandaAccessMode(form),
    allowAcervo: Boolean(form.elements.allow_acervo?.checked),
    letrasContentMode: form.elements.share_cifras?.checked ? 'full_cifra' : 'lyrics_only',
    repertorioIds: getSelectedRepertorioIds(form, moduleKey),
  };
}

function getBandaAccessMode(form) {
  const leader = form.elements.allow_banda_leader?.checked;
  const member = form.elements.allow_banda_member?.checked;
  if (leader && member) return 'ambos';
  return leader ? 'lider' : 'integrante';
}

function setBandaAccessMode(form, accessMode) {
  form.elements.allow_banda_leader.checked = accessMode !== 'integrante';
  form.elements.allow_banda_member.checked = accessMode !== 'lider';
}

function getSelectedRepertorioIds(form, moduleKey) {
  if (moduleKey === 'letras_repertorio') {
    return Array.from(form.querySelectorAll('[name="letras_repertorio_id"]:checked')).map((input) => input.value).slice(0, 1);
  }

  return Array.from(form.querySelectorAll('[name="banda_repertorio_ids"]:checked')).map((input) => input.value);
}

function updateModuleFields(form, { bandaPermissions, letrasPermissions }) {
  const isBandaCoral = form.elements.module_key.value === 'banda_coral';
  const isLetrasRepertorio = form.elements.module_key.value === 'letras_repertorio';
  bandaPermissions.hidden = !isBandaCoral;
  letrasPermissions.hidden = !isLetrasRepertorio;
}

function createRepertoriosChecklist(repertorios, { name, multiple = true } = {}) {
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
      <input name="${escapeHtml(name)}" type="${multiple ? 'checkbox' : 'radio'}" value="${escapeHtml(repertorio.id)}">
      <span>${escapeHtml(repertorio.nome || repertorio.titulo || 'Repertorio')}</span>
    `;
    list.append(label);
  });

  return list;
}

function setCheckedRepertorios(form, repertorioIds) {
  const selected = new Set((repertorioIds || []).map(String));
  form.querySelectorAll('[name="banda_repertorio_ids"], [name="letras_repertorio_id"]').forEach((input) => {
    input.checked = selected.has(input.value);
  });
}

function getInviteRepertorioIds(invite, metadata) {
  if (invite.module_key === 'letras_repertorio' && invite.target_id) {
    return [invite.target_id];
  }

  return metadata.repertorio_ids || [];
}

function getDefaultExpiresAt() {
  const date = new Date();
  date.setHours(date.getHours() + 2);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toDateTimeLocalValue(value) {
  if (!value) return getDefaultExpiresAt();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getDefaultExpiresAt();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getInviteMetadata(invite) {
  return invite?.metadata && typeof invite.metadata === 'object' ? invite.metadata : {};
}

function getInviteStatus(invite) {
  if (invite.revoked_at) return { key: 'is-revoked', label: 'Revogado' };
  if (new Date(invite.expires_at).getTime() <= Date.now()) return { key: 'is-expired', label: 'Expirado' };
  if (invite.max_uses && Number(invite.use_count || 0) >= Number(invite.max_uses)) return { key: 'is-expired', label: 'Limite atingido' };
  return { key: 'is-active', label: 'Ativo' };
}

function getPublicInviteUrl(token, moduleKey = 'dashboard') {
  const paths = {
    banda_coral: '/publico/banda-coral',
    letras_repertorio: '/publico/letras',
  };
  const path = paths[moduleKey] || '/publico';
  const url = new URL(path, window.location.origin);
  url.searchParams.set('token', token);
  return url.toString();
}

function createInviteByModule(payload) {
  if (payload.moduleKey === 'banda_coral') {
    return createBandaCoralPublicInvite(payload);
  }

  if (payload.moduleKey === 'letras_repertorio') {
    return createLetrasRepertorioPublicInvite(payload);
  }

  return createDashboardPublicInvite(payload);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}

function createInviteShareText(title, url) {
  return `Convite: *${String(title || 'Link publico')}*\n${url}`;
}

function formatModule(moduleKey) {
  const labels = {
    dashboard: 'Painel',
    banda_coral: 'Modo Banda/Coral',
    letras_repertorio: 'Modo Letras',
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

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
