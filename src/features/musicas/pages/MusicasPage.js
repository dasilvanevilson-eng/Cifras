import { MusicaForm } from '../components/MusicaForm.js';
import {
  createMusica,
  deleteMusica,
  deleteMusicaComVinculos,
  duplicateMusicaToPrivate,
  listMusicas,
  listRepertoriosComMusica,
  publishPrivateMusicaToCommunity,
  updateMusica,
  MUSICA_VISIBILITY,
} from '../../../services/musicasService.js';
import { markSugestaoMusicaAprovada } from '../../../services/sugestoesMusicasService.js';
import { canEditContent } from '../../auth/roles.js';
import { hasPermission } from '../../auth/permissions.js';

const LIBRARY_SCOPES = [
  { key: 'community', label: 'Comunidade', visibility: MUSICA_VISIBILITY.PUBLICA },
  { key: 'mine', label: 'Minhas cifras', visibility: MUSICA_VISIBILITY.PRIVADA },
];

export async function MusicasPage({ session } = {}) {
  const canManageGlobalMusic = canEditContent(session?.profile?.papel) && hasPermission(session, 'musicas', 'can_edit');
  const canCreateMusic = Boolean(session?.user);
  const page = document.createElement('section');
  page.className = `page musicas-page${canCreateMusic ? ' can-edit-music' : ' read-only-music'}`;
  page.innerHTML = `
    <header class="musicas-header musicas-hero">
      <div class="musicas-hero-copy">
        <h1>Cifras <span class="musicas-summary" data-page-info-accessory aria-live="polite"><span><strong data-count="musicas">0</strong> cifras</span></span></h1>
        <p data-page-info>Consulte a comunidade e organize suas cifras no acervo privado.</p>
      </div>
    </header>
    <section class="music-search-panel music-library-panel">
      <div class="music-library-heading">
        <div>
          <h2>Biblioteca de cifras</h2>
          <p data-section-info>Busque somente pelo titulo. Cifras novas ficam em Minhas cifras e podem ser publicadas depois na Comunidade.</p>
        </div>
        <span class="music-library-mode">Multiusuario</span>
      </div>
      <div class="list-slot">
        <div class="page-status">Carregando cifras...</div>
      </div>
    </section>
    <div class="page-grid musicas-content-grid">
      <section class="music-editor-panel music-editor-stage">
        <div class="form-slot"></div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');
  const musicasCount = page.querySelector('[data-count="musicas"]');
  let currentScope = 'community';
  let musicas = [];
  let pendingNewMusicaTitle = '';

  try {
    const musicasResult = await loadMusicasForScope(currentScope);

    if (musicasResult.error) throw musicasResult.error;

    musicas = musicasResult.data || [];
    musicasCount.textContent = String(musicas.length);

    const pendingSugestao = canManageGlobalMusic ? readPendingSugestaoMusica() : null;
    const pendingSugestaoMusica = pendingSugestao?.tipo_sugestao === 'ajuste'
      ? musicas.find((musica) => musica.id === pendingSugestao.musica_origem_id)
      : null;

    if (canCreateMusic) {
      renderForm(formSlot, {
        selectedMusica: pendingSugestaoMusica || null,
        pendingSugestao,
        session,
        scope: pendingSugestaoMusica ? currentScope : 'mine',
        canManageGlobalMusic,
        hideTitleField: true,
        onAfterSave: handleSavedMusica,
        onAfterDelete: handleDeletedMusica,
        onAfterPublish: handlePublishedMusica,
      });
    } else {
      formSlot.append(createReadOnlyNotice('Entre no sistema para personalizar cifras no seu acervo.', []));
    }

    renderBrowser();
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as cifras.';
  }

  return page;

  async function setScope(scope) {
    currentScope = scope;
    listSlot.innerHTML = '<div class="page-status">Carregando cifras...</div>';
    const { data, error } = await loadMusicasForScope(scope);

    if (error) {
      listSlot.innerHTML = `<div class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar as cifras.')}</div>`;
      return;
    }

    musicas = data || [];
    musicasCount.textContent = String(musicas.length);
    renderBrowser();
  }

  function loadMusicasForScope(scope, query = '') {
    return listMusicas({
      scope,
      query,
      limit: 120,
      userId: session?.user?.id,
    });
  }

  function renderBrowser() {
    musicasCount.textContent = String(musicas.length);
    listSlot.replaceChildren(createMusicasBrowser(musicas, {
      canCreate: canCreateMusic,
      canManageGlobalMusic,
      currentScope,
      onScopeChange: setScope,
      onCreateDraft: async (title) => {
        pendingNewMusicaTitle = title.trim();
        clearPendingSugestaoMusica();
        if (currentScope !== 'mine') {
          await setScope('mine');
        }
        renderForm(formSlot, {
          initialTitle: pendingNewMusicaTitle,
          session,
          scope: 'mine',
          canManageGlobalMusic,
          hideTitleField: true,
          onAfterSave: handleSavedMusica,
          onAfterDelete: handleDeletedMusica,
          onAfterPublish: handlePublishedMusica,
        });
        scrollToForm();
      },
      onSelect: (musica) => {
        pendingNewMusicaTitle = '';
        clearPendingSugestaoMusica();
        renderForm(formSlot, {
          selectedMusica: musica,
          session,
          scope: currentScope,
          canManageGlobalMusic,
          hideTitleField: true,
          onAfterSave: handleSavedMusica,
          onAfterDelete: handleDeletedMusica,
          onAfterPublish: handlePublishedMusica,
        });
        scrollToForm();
      },
      onPersonalize: personalizeMusica,
      session,
    }));
  }

  async function personalizeMusica(musica) {
    const { data, error } = await duplicateMusicaToPrivate(getRootCommunityMusicaId(musica), {
      titulo: getField(musica, ['titulo', 'nome', 'title']),
    }, session?.user?.id);

    if (error) {
      window.alert(error.message || 'Nao foi possivel personalizar esta cifra.');
      return;
    }

    await setScope('mine');
    renderForm(formSlot, {
      selectedMusica: data,
      session,
      scope: 'mine',
      canManageGlobalMusic,
      hideTitleField: true,
      onAfterSave: handleSavedMusica,
      onAfterDelete: handleDeletedMusica,
      onAfterPublish: handlePublishedMusica,
    });
    scrollToForm();
  }

  async function handlePublishedMusica(publishedMusica) {
    if (!publishedMusica?.id) return;

    await setScope('community');
    renderForm(formSlot, {
      selectedMusica: publishedMusica,
      session,
      scope: 'community',
      canManageGlobalMusic,
      hideTitleField: true,
      onAfterSave: handleSavedMusica,
      onAfterDelete: handleDeletedMusica,
      onAfterPublish: handlePublishedMusica,
    });
    scrollToForm();
  }

  async function handleSavedMusica(savedMusica, previousMusica = null) {
    if (!savedMusica?.id) return;

    if (savedMusica.visibility === MUSICA_VISIBILITY.PRIVADA && currentScope !== 'mine') {
      await setScope('mine');
    }

    const existingIndex = musicas.findIndex((item) => item.id === savedMusica.id);
    if (existingIndex >= 0) {
      musicas[existingIndex] = savedMusica;
    } else if (isMusicaInScope(savedMusica, currentScope, session)) {
      musicas.push(savedMusica);
    }

    const nextScope = savedMusica.visibility === MUSICA_VISIBILITY.PRIVADA ? 'mine' : currentScope;
    pendingNewMusicaTitle = '';
    renderBrowser();
    renderForm(formSlot, {
      selectedMusica: savedMusica || previousMusica,
      session,
      scope: nextScope,
      canManageGlobalMusic,
      hideTitleField: true,
      onAfterSave: handleSavedMusica,
      onAfterDelete: handleDeletedMusica,
      onAfterPublish: handlePublishedMusica,
    });
  }

  function handleDeletedMusica(deletedMusica) {
    pendingNewMusicaTitle = '';
    removeMusicaFromList(musicas, deletedMusica?.id);
    renderBrowser();
  }

  function scrollToForm() {
    window.scrollTo({ top: formSlot.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
  }
}

function renderForm(formSlot, {
  selectedMusica = null,
  pendingSugestao = null,
  initialTitle = '',
  session = {},
  scope = 'community',
  canManageGlobalMusic = false,
  hideTitleField = false,
  onAfterSave = null,
  onAfterDelete = null,
  onAfterPublish = null,
}) {
  const initialValues = pendingSugestao || selectedMusica || {};
  const reviewerName = getReviewerName(session);
  const canEditSelected = selectedMusica
    ? canEditMusicaRecord(selectedMusica, session, canManageGlobalMusic)
    : Boolean(session?.user);

  if (selectedMusica && !canEditSelected) {
    formSlot.replaceChildren(createLockedMusicaPanel(selectedMusica, {
      onPersonalize: async () => {
        const { data, error } = await duplicateMusicaToPrivate(getRootCommunityMusicaId(selectedMusica), {
          titulo: getField(selectedMusica, ['titulo', 'nome', 'title']),
        }, session?.user?.id);

        if (error) {
          window.alert(error.message || 'Nao foi possivel personalizar esta cifra.');
          return;
        }

        renderForm(formSlot, {
          selectedMusica: data,
          session,
          scope: 'mine',
          canManageGlobalMusic,
          hideTitleField,
          onAfterSave,
          onAfterDelete,
          onAfterPublish,
        });
        onAfterSave?.(data, selectedMusica);
      },
    }));
    return;
  }

  formSlot.replaceChildren(createMusicaOwnershipShell({
    scope,
    selectedMusica,
    session,
    onPublish: async () => {
      const confirmed = window.confirm(getPublishConfirmationMessage(selectedMusica));

      if (!confirmed) {
        return;
      }

      const { data, error } = await publishPrivateMusicaToCommunity(selectedMusica.id, {
        id: session?.user?.id,
        nome: session?.profile?.nome,
        email: session?.user?.email,
      });

      if (error) {
        window.alert(error.message || 'Nao foi possivel publicar a cifra na Comunidade.');
        return;
      }

      window.alert(getPublishSuccessMessage(selectedMusica));
      onAfterPublish?.(data);
    },
    content: MusicaForm({
      initialValues: {
        titulo: initialValues.titulo || initialTitle || '',
        artista: initialValues.artista || '',
        tom: initialValues.tom || '',
        tags: initialValues.tags || '',
        musica_link: initialValues.musica_link || '',
        colaborador_nome: initialValues.colaborador_nome || '',
        revisado_por_nome: selectedMusica?.revisado_por_nome || pendingSugestao?.revisado_por_nome || reviewerName,
        cifra_original: initialValues.cifra_original || '',
        cifra_chordpro: initialValues.cifra_chordpro || initialValues.chordpro || initialValues.conteudo_chordpro || '',
        cifra_exibicao: initialValues.cifra_exibicao || '',
        cifra_editor_state: initialValues.cifra_editor_state || null,
      },
      submitLabel: selectedMusica ? 'Salvar alteracoes' : 'Salvar musica',
      canDelete: Boolean(selectedMusica && canEditSelected),
      hideTitleField,
      onClear: () => {
        clearPendingSugestaoMusica();
        renderForm(formSlot, { session, scope, canManageGlobalMusic, hideTitleField, onAfterSave, onAfterDelete, onAfterPublish });
      },
      onDelete: selectedMusica
        ? async () => {
          const deleted = await deleteSelectedMusica(selectedMusica);

          if (!deleted) {
            return false;
          }

          renderForm(formSlot, { session, scope, canManageGlobalMusic, hideTitleField, onAfterSave, onAfterDelete, onAfterPublish });
          onAfterDelete?.(selectedMusica);
          return true;
        }
        : null,
      onSubmit: async (musica) => {
        const ownershipValues = getOwnershipValues(scope, session, selectedMusica);
        const payload = {
          ...musica,
          ...ownershipValues,
        };
        const result = selectedMusica
          ? await updateMusica(selectedMusica.id, payload)
          : await createMusica(payload);

        if (result.error) {
          throw result.error;
        }

        if (pendingSugestao?.sugestao_id) {
          const { error: sugestaoError } = await markSugestaoMusicaAprovada(pendingSugestao.sugestao_id, {
            musica_id: result.data?.id || selectedMusica?.id,
            revisado_por: pendingSugestao.revisado_por || session?.user?.id,
          });

          if (sugestaoError) {
            throw sugestaoError;
          }

          clearPendingSugestaoMusica();
        }

        onAfterSave?.(result.data, selectedMusica);
      },
    }),
  }));
}

function createMusicaOwnershipShell({ scope, selectedMusica, session, onPublish, content }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'musica-ownership-shell';
  const currentVisibility = selectedMusica?.visibility || getDefaultVisibilityForScope(scope);
  const publishActionLabel = getPublishActionLabel(selectedMusica);
  wrapper.innerHTML = `
    <div class="musica-ownership-bar">
      <div>
        <strong>Acervo</strong>
        <span>${escapeHtml(getVisibilityLabel(currentVisibility))}</span>
      </div>
      <span class="music-scope-hint">${escapeHtml(getVisibilityHint(currentVisibility))}</span>
      ${publishActionLabel && session?.user ? `<button class="button" type="button" data-action="publish-community">${escapeHtml(publishActionLabel)}</button>` : ''}
    </div>
  `;
  wrapper.append(content);

  wrapper.querySelector('[data-action="publish-community"]')?.addEventListener('click', () => onPublish?.());

  return wrapper;
}

function getOwnershipValues(scope, session = {}, selectedMusica = null) {
  const visibility = selectedMusica?.visibility || getDefaultVisibilityForScope(scope);
  const isNewPrivateMusica = !selectedMusica && visibility === MUSICA_VISIBILITY.PRIVADA;

  return {
    visibility,
    organization_id: null,
    ...(isNewPrivateMusica && session?.user?.id
      ? {
        owner_id: session.user.id,
        created_by: session.user.id,
      }
      : {}),
  };
}

function createMusicasBrowser(musicas, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser musicas-browser';
  wrapper.innerHTML = `
    <div class="music-scope-tabs" role="tablist" aria-label="Acervos de cifras">
      ${LIBRARY_SCOPES.map((scope) => `
        <button class="nav-button${options.currentScope === scope.key ? ' is-active' : ''}" type="button" data-scope="${scope.key}">
          ${escapeHtml(scope.label)}
        </button>
      `).join('')}
    </div>
    <div class="list-toolbar">
      <label class="music-library-search">
        <span>Titulo da cifra</span>
        <input class="search-input" type="search" placeholder="Digite o titulo da cifra">
      </label>
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;
  let currentResults = [];

  wrapper.querySelectorAll('[data-scope]').forEach((button) => {
    button.addEventListener('click', () => {
      options.onScopeChange?.(button.dataset.scope);
    });
  });

  function getSearchValue() {
    return searchInput.value.trim();
  }

  function findExactMusica(value) {
    const query = normalizeText(value);
    if (!query) return null;

    return musicas.find((musica) => normalizeText(getField(musica, ['titulo', 'nome', 'title'])) === query) || null;
  }

  function render() {
    const value = getSearchValue();
    const query = normalizeText(value);
    currentResults = musicas
      .filter((musica) => matchesSearch(musica, query))
      .sort((a, b) => compareText(getField(a, ['titulo', 'nome', 'title']), getField(b, ['titulo', 'nome', 'title'])));

    if (!currentResults.length) {
      tableSlot.replaceChildren(createEmptySearchResult(value, options));
      return;
    }

    tableSlot.replaceChildren(createMusicasTable(currentResults, {
      ...options,
      onSelect: (musica) => {
        searchInput.value = getField(musica, ['titulo', 'nome', 'title']);
        tableSlot.hidden = true;
        options.onSelect?.(musica);
      },
    }));
  }

  searchInput.addEventListener('input', () => {
    render();
    tableSlot.hidden = false;
  });
  searchInput.addEventListener('focus', () => {
    render();
    tableSlot.hidden = false;
  });
  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (!isPointerInsideResults) {
        tableSlot.hidden = true;
      }
    }, 120);
  });
  tableSlot.addEventListener('mouseenter', () => {
    isPointerInsideResults = true;
    tableSlot.hidden = false;
  });
  tableSlot.addEventListener('mouseleave', () => {
    isPointerInsideResults = false;

    if (document.activeElement !== searchInput) {
      tableSlot.hidden = true;
    }
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();

    if (currentResults.length) {
      const exactMatch = findExactMusica(getSearchValue());
      const selectedMusica = exactMatch || currentResults[0];
      searchInput.value = getField(selectedMusica, ['titulo', 'nome', 'title']);
      tableSlot.hidden = true;
      options.onSelect?.(selectedMusica);
      return;
    }

    if (options.onCreateDraft && getSearchValue()) {
      options.onCreateDraft(getSearchValue());
      tableSlot.hidden = true;
    }
  });
  render();

  return wrapper;
}

function createEmptySearchResult(searchValue, options = {}) {
  const empty = document.createElement('div');
  empty.className = 'music-empty-result page-status';

  if (!options.canCreate || !searchValue) {
    empty.textContent = searchValue
      ? 'Nenhuma cifra encontrada para esta busca.'
      : 'Digite para consultar o acervo.';
    return empty;
  }

  empty.innerHTML = `
    <div>
      <strong>Nenhuma cifra encontrada.</strong>
      <span>Voce pode iniciar uma nova cifra em Minhas cifras.</span>
    </div>
    <button class="button" type="button" data-action="create-music">Cadastrar "${escapeHtml(searchValue)}"</button>
  `;

  empty.querySelector('[data-action="create-music"]')?.addEventListener('click', () => {
    options.onCreateDraft?.(searchValue);
  });

  return empty;
}

function createMusicasTable(musicas, options = {}) {
  const list = document.createElement('div');
  list.className = 'musicas-results-list';

  musicas.forEach((musica) => {
    const id = getField(musica, ['id']);
    const title = getDisplayTitle(musica);
    const artist = getField(musica, ['artista', 'autor', 'artist']);
    const key = getField(musica, ['tom', 'key']);
    const tags = formatTags(getField(musica, ['tags']));
    const readOnlyUrl = getReadOnlyMusicaUrl(id);
    const canEdit = canEditMusicaRecord(musica, options.session, options.canManageGlobalMusic);
    const canPersonalize = Boolean(options.canCreate && musica.visibility === MUSICA_VISIBILITY.PUBLICA);
    const card = document.createElement('article');
    card.tabIndex = 0;
    card.className = 'musica-result-card';

    card.innerHTML = `
      <div class="musica-result-main">
        <span class="musica-result-type">${escapeHtml(getMusicaScopeLabel(musica))}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(artist)}</p>
      </div>
      <div class="musica-result-meta" aria-label="Informacoes da musica">
        <span>${escapeHtml(key !== '-' ? key : 'Sem tom')}</span>
        <small>${escapeHtml(tags)}</small>
      </div>
      <div class="musica-result-actions">
        <a class="button-link secondary" href="${escapeHtml(readOnlyUrl)}">Executar</a>
        ${canEdit ? '<button class="nav-button" type="button" data-action="select-music">Editar</button>' : ''}
        ${canPersonalize ? '<button class="nav-button" type="button" data-action="personalize-music">Acrescentar as Minhas cifras</button>' : ''}
      </div>
    `;
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;

      if (canEdit && options.onSelect) {
        event.preventDefault();
        options.onSelect(musica);
        return;
      }

      window.location.href = readOnlyUrl;
    });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (event.target.closest('a, button')) return;

      if (canEdit && options.onSelect) {
        options.onSelect(musica);
        return;
      }

      window.location.href = readOnlyUrl;
    });
    card.querySelector('[data-action="select-music"]')?.addEventListener('click', () => options.onSelect?.(musica));
    card.querySelector('[data-action="personalize-music"]')?.addEventListener('click', () => options.onPersonalize?.(musica));
    list.append(card);
  });

  return list;
}

function createLockedMusicaPanel(musica, options = {}) {
  const panel = document.createElement('section');
  panel.className = 'page-status musica-locked-panel';
  panel.innerHTML = `
    <div>
      <strong>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</strong>
      <p>Esta cifra esta disponivel para consulta. Para alterar sem afetar o acervo original, personalize e salve no seu acervo privado.</p>
    </div>
    <div class="musica-result-actions">
      <a class="button-link secondary" href="${escapeHtml(getReadOnlyMusicaUrl(musica.id))}">Executar</a>
      <button class="button" type="button" data-action="personalize-music">Personalizar</button>
    </div>
  `;
  panel.querySelector('[data-action="personalize-music"]').addEventListener('click', () => options.onPersonalize?.());
  return panel;
}

function getReviewerName(session = {}) {
  return session?.profile?.nome || session?.user?.email || 'Usuario';
}

async function deleteSelectedMusica(musica) {
  const musicaId = musica?.id;
  const title = getField(musica, ['titulo', 'nome', 'title']);

  if (!musicaId) {
    throw new Error('Musica nao informada para exclusao.');
  }

  const { data: vinculos, error: vinculosError } = await listRepertoriosComMusica(musicaId);

  if (vinculosError) {
    throw vinculosError;
  }

  const repertorios = loadRepertoriosAfetados(vinculos || []);
  const confirmed = window.confirm(createDeleteConfirmationMessage(title, repertorios));

  if (!confirmed) {
    return false;
  }

  const { error } = repertorios.length
    ? await deleteMusicaComVinculos(musicaId)
    : await deleteMusica(musicaId);

  if (error) {
    throw new Error(getDeleteErrorMessage(error));
  }

  return true;
}

function loadRepertoriosAfetados(vinculos) {
  return vinculos
    .map((vinculo) => vinculo.repertorios)
    .filter(Boolean)
    .map((repertorio) => ({
      id: repertorio.id,
      nome: getField(repertorio, ['nome', 'titulo', 'name']),
      data: formatDate(getField(repertorio, ['data', 'date'])),
    }));
}

function createDeleteConfirmationMessage(title, repertorios) {
  if (!repertorios.length) {
    return `Excluir a musica "${title}"? Esta acao nao pode ser desfeita.`;
  }

  const repertoriosList = repertorios
    .map((repertorio) => {
      const data = repertorio.data !== '-' ? ` (${repertorio.data})` : '';
      return `- ${repertorio.nome}${data}`;
    })
    .join('\n');

  return [
    `A musica "${title}" faz parte de um ou mais repertorios.`,
    'Ao confirmar, ela sera excluida do acervo, mas continuara visivel nos repertorios abaixo como "musica excluida".',
    '',
    'Repertorios vinculados:',
    '',
    repertoriosList,
    '',
    'Confirma a exclusao?',
  ].join('\n');
}

function getDeleteErrorMessage(error) {
  if (error?.code === '23503') {
    return 'Esta musica ainda esta vinculada a um ou mais repertorios.';
  }

  return error?.message || 'Nao foi possivel excluir a musica.';
}

function removeMusicaFromList(musicas, musicaId) {
  const index = musicas.findIndex((item) => item.id === musicaId);

  if (index >= 0) {
    musicas.splice(index, 1);
  }
}

function readPendingSugestaoMusica() {
  try {
    const value = window.sessionStorage.getItem('masterCifras.pendingSugestaoMusica');
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

function clearPendingSugestaoMusica() {
  window.sessionStorage.removeItem('masterCifras.pendingSugestaoMusica');
}

function createReadOnlyNotice(text, items = []) {
  const notice = document.createElement('section');
  notice.className = 'page-status role-notice';
  notice.innerHTML = `
    <p>${escapeHtml(text)}</p>
    ${items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
  `;
  return notice;
}

function getReadOnlyMusicaUrl(id) {
  const params = new URLSearchParams({
    id: String(id),
    returnTo: '/musicas',
  });

  return `/musicas/execucao?${params.toString()}`;
}

function getRootCommunityMusicaId(musica) {
  return musica?.source_musica_id || musica?.id;
}

function matchesSearch(musica, query) {
  if (!query) return true;

  const title = getField(musica, ['titulo', 'nome', 'title']);

  return normalizeText(title).includes(query);
}

function formatTags(value) {
  if (!value || value === '-') return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? record[fieldName] : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = String(value).split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function getDefaultVisibilityForScope(scope) {
  return LIBRARY_SCOPES.find((item) => item.key === scope)?.visibility || MUSICA_VISIBILITY.PRIVADA;
}

function getVisibilityLabel(visibility) {
  if (visibility === MUSICA_VISIBILITY.PRIVADA) return 'Minhas cifras';
  return 'Comunidade publica';
}

function getVisibilityHint(visibility) {
  if (visibility === MUSICA_VISIBILITY.PRIVADA) return 'Somente voce acessa esta versao.';
  return 'Todos os usuarios autenticados podem acessar esta cifra.';
}

function getPublishActionLabel(musica) {
  if (!musica || musica.visibility !== MUSICA_VISIBILITY.PRIVADA) return '';
  if (musica.source_musica_id) return 'Publicar ajuste na Comunidade';
  return 'Publicar na Comunidade';
}

function getPublishConfirmationMessage(musica) {
  if (musica?.source_musica_id) {
    return 'Esta acao publicara seu ajuste na Comunidade. Se voce for o autor original, a versao publica sera atualizada. Caso contrario, sera criada uma nova versao publica desta cifra.';
  }

  return 'Esta cifra ficara visivel para todos os usuarios autenticados na Comunidade.';
}

function getPublishSuccessMessage(musica) {
  if (musica?.source_musica_id) {
    return 'Ajuste publicado na Comunidade.';
  }

  return 'Cifra publicada na Comunidade.';
}

function getMusicaScopeLabel(musica) {
  if (musica.visibility === MUSICA_VISIBILITY.PRIVADA) return 'Minha';
  return 'Comunidade';
}

function getDisplayTitle(musica) {
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const versionName = getVersionName(musica);

  return versionName ? `${title} - Versao ${versionName}` : title;
}

function getVersionName(musica) {
  if (musica?.visibility !== MUSICA_VISIBILITY.PUBLICA || !musica.source_musica_id) {
    return '';
  }

  return musica.colaborador_nome || 'Usuario';
}

function isOwnedByCurrentUser(musica, session = {}) {
  return Boolean(session?.user?.id && (
    musica.owner_id === session.user.id
    || musica.created_by === session.user.id
  ));
}

function canEditMusicaRecord(musica, session = {}, canManageGlobalMusic = false) {
  return Boolean(canManageGlobalMusic || isOwnedByCurrentUser(musica, session));
}

function isMusicaInScope(musica, scope, session = {}) {
  if (scope === 'community') return musica.visibility === MUSICA_VISIBILITY.PUBLICA;
  if (scope === 'mine') return musica.visibility === MUSICA_VISIBILITY.PRIVADA && isOwnedByCurrentUser(musica, session);
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
