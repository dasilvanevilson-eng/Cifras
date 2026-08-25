import {
  ensurePrivateMusicaForRepertorio,
  listMusicas,
  MUSICA_VISIBILITY,
} from '../../../services/musicasService.js';
import {
  createRepertorioComMusicas,
  deleteRepertorio,
  duplicateRepertorio,
  listMusicasDoRepertorio,
  listRepertorios,
  replaceMusicasDoRepertorio,
  updateRepertorio,
} from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';

const REPERTORIO_DRAFT_PREFIX = 'masterCifras.repertorioDraft.';

export async function RepertoriosPage({ session } = {}) {
  const canEdit = canEditContent(session?.profile?.papel);
  const page = document.createElement('section');
  page.className = `page repertorios-page${canEdit ? ' can-edit-repertorio' : ' read-only-repertorio'}`;
  page.innerHTML = `
    <header class="repertorios-header repertorios-hero">
      <div class="repertorios-hero-copy">
        <span class="repertorios-kicker">Central de repertorios</span>
        <h1>Repertorios</h1>
        <p data-page-info>${canEdit ? 'Monte, revise e execute sequencias musicais com mais agilidade.' : 'Consulte e execute os repertorios disponiveis para o seu acesso.'}</p>
      </div>
      <div class="repertorios-summary" aria-live="polite">
        <span><strong data-count="repertorios">0</strong> repertorios</span>
      </div>
    </header>
    <section class="repertorios-search-panel repertorio-library-panel">
      <div class="repertorio-library-heading">
        <div>
          <h2>Buscar ou criar repertorio</h2>
          <p data-section-info>${canEdit ? 'Pesquise para localizar um repertorio existente ou use o botao de criacao para iniciar um novo.' : 'Pesquise por nome ou data para localizar, abrir e executar os repertorios liberados para o seu acesso.'}</p>
        </div>
        <span class="repertorio-library-mode">${canEdit ? 'Modo montagem' : 'Modo consulta'}</span>
      </div>
      <div class="list-slot">
        <div class="page-status">Carregando repertorios...</div>
      </div>
    </section>
    <section class="repertorios-form-panel repertorio-composer-stage">
      <div class="form-slot"></div>
    </section>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');
  const repertoriosCount = page.querySelector('[data-count="repertorios"]');
  let loadedRepertorios = [];
  let musicasCache = null;
  let pendingNewRepertorioName = '';
  const restoredDraft = readRepertorioDraftFromUrl();

  async function loadMusicasOnce() {
    if (musicasCache) {
      return { data: musicasCache, error: null };
    }

    const result = await listMusicas();
    if (!result.error) {
      musicasCache = result.data || [];
    }
    return result;
  }

  async function renderForm(selectedRepertorio = null, options = {}) {
    if (!canEdit) return;

    formSlot.innerHTML = '<p class="page-status">Carregando formulario...</p>';
    formSlot.replaceChildren(await createRepertorioUnifiedForm({
      existingRepertorios: loadedRepertorios,
      selectedRepertorio,
      initialName: selectedRepertorio ? '' : options.initialName || pendingNewRepertorioName,
      draft: options.draft || null,
      loadMusicas: loadMusicasOnce,
    }));
  }

  function renderCreatePrompt() {
    if (!canEdit) return;

    const prompt = document.createElement('section');
    prompt.className = 'new-repertorio-panel repertorio-create-prompt';
    prompt.innerHTML = `
      <div class="repertorio-form-heading">
        <h2>Novo repertorio</h2>
        <p class="repertorio-current-name">Use o botao "Criar novo repertorio" para abrir o formulario de montagem.</p>
      </div>
    `;
    formSlot.replaceChildren(prompt);
  }

  async function prepareNewRepertorio(name = '') {
    pendingNewRepertorioName = name.trim();
    await renderForm(null, { initialName: pendingNewRepertorioName });
  }

  try {
    const { data, error } = await listRepertorios();

    if (error) {
      throw error;
    }

    loadedRepertorios = data || [];
    repertoriosCount.textContent = String(loadedRepertorios.length);

    if (!loadedRepertorios.length) {
      listSlot.replaceChildren(createRepertoriosBrowser([], { onSelect: renderForm, onCreateDraft: prepareNewRepertorio, canEdit }));
    } else {
      listSlot.replaceChildren(createRepertoriosBrowser(loadedRepertorios, { onSelect: renderForm, onCreateDraft: prepareNewRepertorio, canEdit }));
    }
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar os repertorios.';
  }

  if (canEdit) {
    const draftRepertorio = restoredDraft?.selectedRepertorioId
      ? loadedRepertorios.find((repertorio) => repertorio.id === restoredDraft.selectedRepertorioId) || null
      : null;
    if (draftRepertorio || restoredDraft) {
      await renderForm(draftRepertorio, { draft: restoredDraft });
    } else {
      renderCreatePrompt();
    }
    if (restoredDraft?.scrollY) {
      window.requestAnimationFrame(() => window.scrollTo({ top: restoredDraft.scrollY, left: 0, behavior: 'auto' }));
    }
  } else {
    formSlot.append(createReadOnlyNotice(
      'No momento seu acesso e restrito nesta opcao.',
      [
        'Consultar todos os repertorios;',
        'Incluir e editar novos repertorios;',
        'Alterar facilmente a sequencia das musicas;',
        'Usar os controles de execucao para ajustar tom, fonte, tema, capo e rolagem automatica.',
      ],
    ));
  }

  return page;
}

async function createRepertorioUnifiedForm({
  existingRepertorios = [],
  selectedRepertorio = null,
  initialName = '',
  draft = null,
  loadMusicas = listMusicas,
} = {}) {
  const wrapper = document.createElement('section');
  wrapper.className = 'new-repertorio-panel';
  wrapper.innerHTML = '<p class="page-status">Carregando musicas...</p>';

  const [
    { data: musicas, error },
    { data: musicasAssociadas, error: musicasAssociadasError },
  ] = await Promise.all([
    loadMusicas(),
    ...(selectedRepertorio ? [
      listMusicasDoRepertorio(selectedRepertorio.id),
    ] : [
      Promise.resolve({ data: [], error: null }),
    ]),
  ]);

  if (error) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar as musicas.')}</p>`;
    return wrapper;
  }
  if (musicasAssociadasError) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(musicasAssociadasError.message || 'Nao foi possivel carregar as musicas do repertorio.')}</p>`;
    return wrapper;
  }
  wrapper.replaceChildren(createNewRepertorioComposer(musicas || [], existingRepertorios, {
    selectedRepertorio,
    musicasAssociadas: musicasAssociadas || [],
    initialName,
    draft,
  }));
  return wrapper;
}

function createNewRepertorioComposer(musicas, existingRepertorios = [], options = {}) {
  const selectedRepertorio = options.selectedRepertorio || null;
  let currentRepertorio = selectedRepertorio ? { ...selectedRepertorio } : null;
  const isEditing = Boolean(selectedRepertorio?.id);
  const draft = options.draft || null;
  const initialName = draft?.nome || selectedRepertorio?.nome || options.initialName || '';
  const form = document.createElement('form');
  form.className = 'form new-repertorio-form';
  form.innerHTML = `
    <section class="repertorio-form-section repertorio-basic-fields">
      <div class="repertorio-form-heading">
        <h2>${isEditing ? 'Editar repertorio' : 'Novo repertorio'}</h2>
        <p class="repertorio-current-name">${escapeHtml(initialName ? `Nome: ${initialName}` : 'Digite um nome no campo acima para iniciar.')}</p>
        <div class="repertorio-inline-actions"></div>
      </div>
      <div class="repertorio-title-date-grid">
        <label>
          Nome
          <input name="nome" type="text" required value="${escapeHtml(initialName)}" placeholder="Nome do repertorio">
        </label>

        <label>
          Data
          <input name="data" type="date" value="${escapeHtml(selectedRepertorio?.data || '')}">
        </label>
      </div>
      <label class="repertorio-song-search-field">
        Buscar musica
        <input class="song-search-input" type="search" placeholder="Buscar pelo titulo da musica" autocomplete="off">
      </label>
      <div class="song-search-results" hidden></div>
      <div class="selected-repertorio-songs"></div>
    </section>

    <section class="repertorio-form-section repertorio-music-fields">
    </section>

    <div class="repertorio-save-bar">
      <p class="form-message" aria-live="polite"></p>
    </div>
  `;

  const nomeInput = form.querySelector('[name="nome"]');
  const dataInput = form.querySelector('[name="data"]');
  const currentName = form.querySelector('.repertorio-current-name');
  const searchInput = form.querySelector('.song-search-input');
  const resultsSlot = form.querySelector('.song-search-results');
  const selectedSlot = form.querySelector('.selected-repertorio-songs');
  const message = form.querySelector('.form-message');
  const selectedMusicas = draft?.musicas?.length
    ? draft.musicas.map((musica) => ({ ...musica }))
    : (options.musicasAssociadas || [])
      .filter((item) => item.musica_id && item.musicas)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
      .map((item) => ({
        ...item.musicas,
        tom: item.tom || item.musicas?.tom || '',
        observacao: item.observacao || '',
      }));
  const sortedMusicas = sortMusicasByName(musicas);
  const existingNames = new Set(existingRepertorios
    .filter((repertorio) => !isEditing || repertorio.id !== selectedRepertorio.id)
    .map((repertorio) => normalizeText(getField(repertorio, ['nome', 'titulo', 'name']))));
  let isPointerInsideResults = false;
  let draggedMusicaIndex = null;
  let dragAutoScrollFrame = null;
  let dragAutoScrollClientY = 0;
  let autosaveTimer = null;
  let isAutosaving = false;
  let hasPendingAutosave = false;
  let lastSavedSignature = createRepertorioSignature();

  renderInlineActions();

  function updateSubmitState() {
    form.classList.toggle('can-autosave', Boolean(nomeInput.value.trim() && selectedMusicas.length));
  }

  function renderResults() {
    const query = normalizeText(searchInput.value);
    const selectedIds = new Set(selectedMusicas.map((musica) => musica.id));
    const selectedSourceIds = new Set(selectedMusicas
      .map((musica) => musica.source_musica_id)
      .filter(Boolean));
    const filtered = sortedMusicas
      .filter((musica) => !selectedIds.has(musica.id))
      .filter((musica) => !selectedSourceIds.has(musica.id))
      .filter((musica) => matchesMusicaSearch(musica, query))
      .slice(0, 60);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = selectedMusicas.length === musicas.length
        ? 'Todas as musicas ja foram incluidas.'
        : 'Nenhuma musica encontrada.';
      resultsSlot.replaceChildren(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'song-search-list';

    filtered.forEach((musica) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'song-search-item';
      item.innerHTML = `
        <strong>${escapeHtml(formatMusicaName(musica))}</strong>
        <span class="song-search-scope">${escapeHtml(getMusicaScopeLabel(musica))}</span>
      `;

      item.addEventListener('click', async () => {
        item.disabled = true;
        message.textContent = 'Preparando musica...';
        message.className = 'form-message';

        const preparedMusica = await prepareMusicaForRepertorio(musica, musicas, message);
        item.disabled = false;

        if (!preparedMusica) {
          return;
        }

        selectedMusicas.push({
          ...preparedMusica,
          observacao: '',
        });
        searchInput.value = '';
        message.textContent = '';
        message.className = 'form-message';
        renderSelected();
        renderResults();
        isPointerInsideResults = false;
        resultsSlot.hidden = true;
        updateSubmitState();
        scheduleAutosave();
      });

      list.append(item);
    });

    resultsSlot.replaceChildren(list);
  }

  function renderSelected() {
    if (!selectedMusicas.length) {
      selectedSlot.replaceChildren();
      return;
    }

    const list = document.createElement('div');
    list.className = 'selected-repertorio-song-list';
    list.addEventListener('dragover', updateDragAutoScroll);

    selectedMusicas.forEach((musica, index) => {
      const row = document.createElement('article');
      row.className = 'selected-repertorio-song';
      row.draggable = true;
      row.dataset.index = String(index);
      row.title = 'Arraste para reposicionar';
      row.innerHTML = `
        <button class="danger-button selected-repertorio-remove" type="button" aria-label="Remover musica">X</button>
        <div>
          <strong>${escapeHtml(formatMusicaName(musica))}</strong>
          <span class="selected-repertorio-song-scope">${escapeHtml(getMusicaScopeLabel(musica))}</span>
        </div>
        <a class="nav-button icon-button selected-repertorio-play" href="${escapeHtml(getMusicaExecucaoUrl(musica))}" aria-label="Executar ${escapeHtml(formatMusicaName(musica))}" title="Executar musica">&#9654;</a>
        <label class="selected-repertorio-song-moment">
          <input type="text" maxlength="80" value="${escapeHtml(musica.observacao || '')}" placeholder="Entrada, louvor...">
        </label>
      `;

      row.addEventListener('dragstart', (event) => {
        draggedMusicaIndex = index;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        draggedMusicaIndex = null;
        stopDragAutoScroll();
        row.classList.remove('is-dragging');
        selectedSlot.querySelectorAll('.selected-repertorio-song').forEach((item) => {
          item.classList.remove('is-drop-target');
        });
      });

      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        updateDragAutoScroll(event);
        if (draggedMusicaIndex === null || draggedMusicaIndex === index) return;

        selectedSlot.querySelectorAll('.selected-repertorio-song').forEach((item) => {
          item.classList.remove('is-drop-target');
        });
        row.classList.add('is-drop-target');
      });

      row.addEventListener('drop', (event) => {
        event.preventDefault();
        stopDragAutoScroll();
        if (draggedMusicaIndex === null || draggedMusicaIndex === index) return;

        const [draggedMusica] = selectedMusicas.splice(draggedMusicaIndex, 1);
        selectedMusicas.splice(index, 0, draggedMusica);
        draggedMusicaIndex = null;
        renderSelected();
        scheduleAutosave();
      });

      row.querySelector('.selected-repertorio-remove').addEventListener('click', () => {
        selectedMusicas.splice(index, 1);
        renderSelected();
        renderResults();
        updateSubmitState();
        scheduleAutosave();
      });
      row.querySelector('.selected-repertorio-play').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = getMusicaExecucaoUrl(musica, saveRepertorioDraft());
      });
      row.querySelector('.selected-repertorio-play').addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      row.querySelector('.selected-repertorio-song-moment input').addEventListener('input', (event) => {
        selectedMusicas[index].observacao = event.target.value.trim();
        scheduleAutosave(650);
      });
      row.querySelector('.selected-repertorio-song-moment input').addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });

      list.append(row);
    });

    selectedSlot.replaceChildren(list);
  }

  function updateDragAutoScroll(event) {
    if (draggedMusicaIndex === null) return;

    dragAutoScrollClientY = event.clientY;

    if (dragAutoScrollFrame) return;

    dragAutoScrollFrame = window.requestAnimationFrame(runDragAutoScroll);
  }

  function runDragAutoScroll() {
    dragAutoScrollFrame = null;

    if (draggedMusicaIndex === null) return;

    const scrollTarget = getDragScrollTarget();
    const edgeSize = 72;
    const maxSpeed = 18;
    const top = scrollTarget.isWindow ? 0 : scrollTarget.element.getBoundingClientRect().top;
    const bottom = scrollTarget.isWindow ? window.innerHeight : scrollTarget.element.getBoundingClientRect().bottom;
    let delta = 0;

    if (dragAutoScrollClientY < top + edgeSize) {
      delta = -Math.ceil(((top + edgeSize - dragAutoScrollClientY) / edgeSize) * maxSpeed);
    } else if (dragAutoScrollClientY > bottom - edgeSize) {
      delta = Math.ceil(((dragAutoScrollClientY - (bottom - edgeSize)) / edgeSize) * maxSpeed);
    }

    if (delta !== 0) {
      if (scrollTarget.isWindow) {
        window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
      } else {
        scrollTarget.element.scrollTop += delta;
      }
    }

    dragAutoScrollFrame = window.requestAnimationFrame(runDragAutoScroll);
  }

  function getDragScrollTarget() {
    if (selectedSlot.scrollHeight > selectedSlot.clientHeight + 1) {
      return { element: selectedSlot, isWindow: false };
    }

    return { element: document.scrollingElement || document.documentElement, isWindow: true };
  }

  function stopDragAutoScroll() {
    if (!dragAutoScrollFrame) return;

    window.cancelAnimationFrame(dragAutoScrollFrame);
    dragAutoScrollFrame = null;
  }

  function saveRepertorioDraft() {
    const draftKey = crypto.randomUUID();
    const formData = new FormData(form);

    try {
      window.sessionStorage.setItem(`${REPERTORIO_DRAFT_PREFIX}${draftKey}`, JSON.stringify({
        selectedRepertorioId: currentRepertorio?.id || null,
        nome: String(formData.get('nome') || '').trim(),
        data: String(formData.get('data') || '') || null,
        musicas: selectedMusicas.map((musica) => ({ ...musica })),
        scrollY: window.scrollY || 0,
      }));
    } catch (_error) {
      return '';
    }

    return draftKey;
  }

  nomeInput.addEventListener('input', () => {
    const value = nomeInput.value.trim();
    currentName.textContent = value ? `Nome: ${value}` : 'Informe o nome do repertorio.';
    updateSubmitState();
    scheduleAutosave(650);
  });

  dataInput.addEventListener('change', () => {
    scheduleAutosave();
  });

  searchInput.addEventListener('input', () => {
    renderResults();
    resultsSlot.hidden = false;
  });

  searchInput.addEventListener('focus', () => {
    renderResults();
    resultsSlot.hidden = false;
  });

  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (!isPointerInsideResults) {
        resultsSlot.hidden = true;
      }
    }, 120);
  });

  resultsSlot.addEventListener('mouseenter', () => {
    isPointerInsideResults = true;
    resultsSlot.hidden = false;
  });

  resultsSlot.addEventListener('mouseleave', () => {
    isPointerInsideResults = false;

    if (document.activeElement !== searchInput) {
      resultsSlot.hidden = true;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    await saveRepertorio({ focusOnError: true });
  });

  renderSelected();
  renderResults();
  updateSubmitState();

  return form;

  function renderInlineActions() {
    if (!isEditing) return;

    const actions = form.querySelector('.repertorio-inline-actions');
    actions.innerHTML = `
      <a class="button-link" href="${escapeHtml(getRepertorioExecucaoUrl(selectedRepertorio))}">Execucao</a>
      <button class="nav-button" type="button" data-action="duplicate">Duplicar</button>
      <button class="danger-button" type="button" data-action="delete">Excluir</button>
    `;

    actions.querySelector('[data-action="duplicate"]').addEventListener('click', async () => {
      const confirmed = window.confirm('Duplicar este repertorio com as mesmas musicas e ordem?');
      if (!confirmed) return;

      const { error } = await duplicateRepertorio(selectedRepertorio, options.musicasAssociadas || []);

      if (error) {
        window.alert(error.message || 'Nao foi possivel duplicar o repertorio.');
        return;
      }

      window.location.href = '/repertorios';
    });

    actions.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      const confirmed = window.confirm(`Excluir o repertorio "${selectedRepertorio.nome}"?`);
      if (!confirmed) return;

      const { error } = await deleteRepertorio(selectedRepertorio.id);

      if (error) {
        window.alert(error.message || 'Nao foi possivel excluir o repertorio.');
        return;
      }

      window.location.href = '/repertorios';
    });
  }

  function scheduleAutosave(delay = 260) {
    window.clearTimeout(autosaveTimer);

    autosaveTimer = window.setTimeout(() => {
      saveRepertorio({ autosave: true });
    }, delay);
  }

  async function saveRepertorio({ autosave = false, focusOnError = false } = {}) {
    const validation = validateRepertorioForSave();

    if (!validation.valid) {
      if (!autosave || validation.showDuringAutosave) {
        message.className = 'form-message error';
        message.textContent = validation.message;
        if (!autosave || focusOnError) {
          validation.focusTarget?.focus?.();
        }
      }
      updateSubmitState();
      return false;
    }

    const signature = createRepertorioSignature();
    if (signature === lastSavedSignature) {
      if (!autosave) {
        message.className = 'form-message success';
        message.textContent = 'Repertório salvo';
      }
      updateSubmitState();
      return true;
    }

    if (isAutosaving) {
      hasPendingAutosave = true;
      return false;
    }

    isAutosaving = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    try {
      const formData = new FormData(form);
      const musicasSnapshot = selectedMusicas.map((musica) => ({ ...musica }));
      const repertorioPayload = {
        nome: String(formData.get('nome') || '').trim(),
        data: String(formData.get('data') || '') || null,
        visibilidade: 'privado',
        permite_edicao_compartilhada: false,
      };

      if (currentRepertorio?.id) {
        const { data: updatedRepertorio, error: updateError } = await updateRepertorio(currentRepertorio.id, repertorioPayload);

        if (updateError) {
          throw updateError;
        }

        const { error: musicasError } = await replaceMusicasDoRepertorio(currentRepertorio.id, musicasSnapshot);

        if (musicasError) {
          throw musicasError;
        }

        currentRepertorio = updatedRepertorio || { ...currentRepertorio, ...repertorioPayload };
      } else {
        const { data: novoRepertorio, error: saveError } = await createRepertorioComMusicas(
          repertorioPayload,
          musicasSnapshot,
          [],
        );

        if (saveError) {
          throw saveError;
        }

        currentRepertorio = novoRepertorio;
      }

      lastSavedSignature = signature;
      clearCurrentRepertorioDraft();
      message.className = 'form-message success';
      message.textContent = 'Repertório salvo';
      return true;
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel salvar o repertorio.';

      if (focusOnError) {
        searchInput.focus();
      }

      return false;
    } finally {
      isAutosaving = false;
      updateSubmitState();

      if (hasPendingAutosave) {
        hasPendingAutosave = false;
        scheduleAutosave();
      }
    }
  }

  function validateRepertorioForSave() {
    if (!nomeInput.value.trim()) {
      return {
        valid: false,
        message: 'Informe o nome do repertorio.',
        focusTarget: nomeInput,
        showDuringAutosave: false,
      };
    }

    if (!currentRepertorio?.id && existingNames.has(normalizeText(nomeInput.value))) {
      return {
        valid: false,
        message: 'Ja existe um repertorio cadastrado com esse nome.',
        focusTarget: nomeInput,
        showDuringAutosave: true,
      };
    }

    if (!selectedMusicas.length) {
      return {
        valid: false,
        message: 'Inclua pelo menos uma musica antes de salvar o repertorio.',
        focusTarget: searchInput,
        showDuringAutosave: false,
      };
    }

    return { valid: true };
  }

  function createRepertorioSignature() {
    const formData = new FormData(form);

    return JSON.stringify({
      nome: String(formData.get('nome') || '').trim(),
      data: String(formData.get('data') || '') || null,
      musicas: selectedMusicas.map((musica, index) => ({
        id: musica.id,
        ordem: index + 1,
        tom: musica.tom || null,
        observacao: musica.observacao || null,
      })),
    });
  }
}

function createReadOnlyNotice(text, items = []) {
  const notice = document.createElement('section');
  notice.className = 'page-status role-notice';
  notice.innerHTML = `
    <p>${escapeHtml(text)}</p>
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
  return notice;
}

function sortMusicasByName(musicas) {
  return [...musicas].sort((a, b) => (
    formatMusicaName(a).localeCompare(formatMusicaName(b), 'pt-BR', { sensitivity: 'base' })
  ));
}

function matchesMusicaSearch(musica, query) {
  if (!query) return true;

  return normalizeText([
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
    getMusicaVersionName(musica),
    getField(musica, ['tags']),
  ].join(' ')).includes(query);
}

function formatMusicaName(musica) {
  const titulo = getField(musica, ['titulo', 'nome', 'title']);
  const artista = getField(musica, ['artista', 'autor', 'artist']);
  const versionName = getMusicaVersionName(musica);
  const displayTitle = versionName ? `${titulo} - Versao ${versionName}` : titulo;

  return artista && artista !== '-' ? `${displayTitle} - ${artista}` : displayTitle;
}

function getMusicaVersionName(musica) {
  if (!musica?.colaborador_nome || musica.colaborador_nome === '-') {
    return '';
  }

  return musica.colaborador_nome;
}

function getMusicaScopeLabel(musica) {
  if (musica?.visibility === MUSICA_VISIBILITY.PRIVADA) return 'Minha cifra';
  if (musica?.visibility === MUSICA_VISIBILITY.ORGANIZACAO) return 'Organizacao';
  if (musica?.visibility === MUSICA_VISIBILITY.COMPARTILHADA) return 'Compartilhada';
  return 'Comunidade';
}

async function prepareMusicaForRepertorio(musica, musicas, message = null) {
  if (!isCommunityMusica(musica)) {
    return musica;
  }

  const privateMusica = findPrivateMusicaWithSameTitle(musica, musicas);
  const shouldOverwrite = privateMusica
    ? window.confirm('Esse título já existe em seu acervo particular, deseja sobrescrever?')
    : false;

  try {
    const { data, error } = await ensurePrivateMusicaForRepertorio(
      musica.id,
      shouldOverwrite ? privateMusica.id : null,
    );

    if (error) {
      throw error;
    }

    upsertMusicaInCache(musicas, data);
    return data;
  } catch (error) {
    if (message) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel salvar a cifra em Minhas cifras.';
    }
    return null;
  }
}

function isCommunityMusica(musica) {
  return musica?.visibility === MUSICA_VISIBILITY.PUBLICA;
}

function findPrivateMusicaWithSameTitle(musica, musicas) {
  const title = normalizeText(getField(musica, ['titulo', 'nome', 'title']));

  if (!title) {
    return null;
  }

  return musicas.find((item) => (
    item?.visibility === MUSICA_VISIBILITY.PRIVADA
    && normalizeText(getField(item, ['titulo', 'nome', 'title'])) === title
  )) || null;
}

function upsertMusicaInCache(musicas, musica) {
  if (!musica?.id) return;

  const index = musicas.findIndex((item) => item.id === musica.id);
  if (index >= 0) {
    musicas[index] = musica;
    return;
  }

  musicas.push(musica);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function createRepertoriosBrowser(repertorios, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser repertorios-browser';
  const editableHint = options.canEdit
    ? 'Digite para buscar um repertorio existente. Para criar, use o botao abaixo.'
    : 'Digite um nome ou data para buscar repertorios.';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label class="repertorio-library-search">
        <span>${options.canEdit ? 'Buscar repertorio' : 'Buscar na lista'}</span>
        <input class="search-input" type="search" placeholder="${options.canEdit ? 'Nome ou data' : 'Nome, data ou tema'}" aria-describedby="repertorio-search-help">
      </label>
      <p class="form-hint" id="repertorio-search-help">${editableHint}</p>
      ${options.canEdit ? '<button class="button" type="button" data-action="create-repertorio">Criar novo repertorio</button>' : ''}
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const createButton = wrapper.querySelector('[data-action="create-repertorio"]');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;
  let currentResults = [];

  function getSearchValue() {
    return searchInput.value.trim();
  }

  function selectRepertorio(repertorio) {
    if (!options.onSelect) {
      window.location.href = getRepertorioUrl(repertorio);
      return;
    }

    if (createButton) createButton.hidden = true;
    options.onSelect(repertorio);
    searchInput.value = getField(repertorio, ['nome', 'titulo', 'name']);
    tableSlot.hidden = true;
  }

  function render() {
    const query = normalizeText(searchInput.value);
    currentResults = repertorios
      .filter((repertorio) => matchesRepertorioSearch(repertorio, query))
      .sort((a, b) => compareText(
        getField(a, ['nome', 'titulo', 'name']),
        getField(b, ['nome', 'titulo', 'name']),
      ));

    if (!repertorios.length) {
      tableSlot.replaceChildren(createStatus('Nenhum repertorio cadastrado ainda.'));
      return;
    }

    if (!currentResults.length) {
      tableSlot.replaceChildren(createStatus(options.canEdit
        ? 'Nenhum repertorio encontrado. Use "Criar novo repertorio" para iniciar um novo cadastro.'
        : 'Nenhum repertorio encontrado para esta busca.'));
      return;
    }

    tableSlot.replaceChildren(createRepertoriosTable(currentResults, {
      ...options,
      onSelect: options.onSelect ? selectRepertorio : null,
    }));
  }

  searchInput.addEventListener('input', () => {
    if (createButton) createButton.hidden = false;
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

  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    if (currentResults.length) {
      selectRepertorio(currentResults[0]);
      return;
    }

  });

  createButton?.addEventListener('click', () => {
    options.onCreateDraft?.(getSearchValue());
    tableSlot.hidden = true;
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

  render();
  return wrapper;
}

function createStatus(text) {
  const status = document.createElement('p');
  status.className = 'page-status';
  status.textContent = text;
  return status;
}

function matchesRepertorioSearch(repertorio, query) {
  if (!query) return true;

  return normalizeText([
    getField(repertorio, ['nome', 'titulo', 'name']),
    formatDate(getField(repertorio, ['data', 'date'])),
  ].join(' ')).includes(query);
}

function createRepertoriosTable(repertorios, options = {}) {
  const list = document.createElement('div');
  list.className = 'repertorio-results-list';

  repertorios.forEach((repertorio) => {
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);
    const data = formatDate(getField(repertorio, ['data', 'date']));
    const detailUrl = getRepertorioUrl(repertorio);
    const execucaoUrl = getRepertorioExecucaoUrl(repertorio);
    const card = document.createElement('article');

    card.className = 'repertorio-result-card';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="repertorio-result-main">
        <span class="repertorio-result-type">Repertorio</span>
        <h3>${escapeHtml(nome)}</h3>
        <p>${escapeHtml(data !== '-' ? data : 'Sem data definida')}</p>
      </div>
      <div class="repertorio-result-meta">
        <span>${options.onSelect ? 'Montagem' : 'Consulta'}</span>
        <small>${escapeHtml(data !== '-' ? `Data: ${data}` : 'Pronto para organizar')}</small>
      </div>
      <div class="repertorio-result-actions">
        <a class="button-link secondary" href="${escapeHtml(execucaoUrl)}">Executar</a>
        ${options.onSelect
          ? '<button class="nav-button" type="button" data-action="select-repertorio">Editar</button>'
          : `<a class="nav-button" href="${escapeHtml(detailUrl)}">Abrir</a>`}
      </div>
    `;

    if (options.onSelect) {
      const select = () => options.onSelect(repertorio);
      card.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        select();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest('a, button')) return;
        event.preventDefault();
        select();
      });
      card.querySelector('[data-action="select-repertorio"]')?.addEventListener('click', () => {
        select();
      });
    } else {
      card.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        window.location.href = detailUrl;
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target.closest('a, button')) return;
        event.preventDefault();
        window.location.href = detailUrl;
      });
    }

    list.append(card);
  });

  return list;
}

function getRepertorioUrl(repertorio) {
  return `/repertorios/detalhe?id=${encodeURIComponent(getField(repertorio, ['id']))}`;
}

function getRepertorioExecucaoUrl(repertorio) {
  return `/repertorios/execucao?id=${encodeURIComponent(getField(repertorio, ['id']))}&returnTo=${encodeURIComponent(getCurrentReturnTo())}`;
}

function getMusicaExecucaoUrl(musica, draftKey = '') {
  const returnParams = new URLSearchParams(window.location.search);
  if (draftKey) {
    returnParams.set('draft', draftKey);
  }
  const returnTo = `${window.location.pathname}${returnParams.toString() ? `?${returnParams.toString()}` : ''}`;
  return `/musicas/execucao?id=${encodeURIComponent(getField(musica, ['id']))}&returnTo=${encodeURIComponent(returnTo)}`;
}

function getCurrentReturnTo() {
  return `${window.location.pathname}${window.location.search || ''}`;
}

function readRepertorioDraftFromUrl() {
  const draftKey = new URLSearchParams(window.location.search).get('draft');
  if (!draftKey) return null;

  try {
    const stored = window.sessionStorage.getItem(`${REPERTORIO_DRAFT_PREFIX}${draftKey}`);
    return stored ? JSON.parse(stored) : null;
  } catch (_error) {
    return null;
  }
}

function clearCurrentRepertorioDraft() {
  const draftKey = new URLSearchParams(window.location.search).get('draft');
  if (!draftKey) return;

  try {
    window.sessionStorage.removeItem(`${REPERTORIO_DRAFT_PREFIX}${draftKey}`);
  } catch (_error) {
    // O rascunho temporario expira com a sessao mesmo quando nao puder ser removido.
  }
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function getField(record, names) {
  const fieldName = names.find((name) => record[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
