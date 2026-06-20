import { RepertorioPrivacyFields, getRepertorioPrivacyValues } from '../components/RepertorioPrivacyFields.js';
import { listMusicas } from '../../../services/musicasService.js';
import { listShareableProfiles } from '../../../services/profilesService.js';
import {
  createRepertorioComMusicas,
  deleteRepertorio,
  duplicateRepertorio,
  listMusicasDoRepertorio,
  listRepertorioCompartilhamentos,
  listRepertorioHistorico,
  listRepertorios,
  replaceMusicasDoRepertorio,
  replaceRepertorioCompartilhamentos,
  updateRepertorio,
} from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';

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
          <p>${canEdit ? 'Digite o nome: se existir, selecione para editar; se nao existir, o formulario abaixo vira uma nova inclusao.' : 'Pesquise por nome ou data para abrir ou executar.'}</p>
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
  let pendingNewRepertorioName = '';

  async function renderForm(selectedRepertorio = null, options = {}) {
    if (!canEdit) return;

    formSlot.innerHTML = '<p class="page-status">Carregando formulario...</p>';
    formSlot.replaceChildren(await createRepertorioUnifiedForm({
      existingRepertorios: loadedRepertorios,
      selectedRepertorio,
      initialName: selectedRepertorio ? '' : options.initialName || pendingNewRepertorioName,
      onNew: () => {
        pendingNewRepertorioName = '';
        return renderForm();
      },
    }));
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
    await renderForm();
  } else {
    formSlot.append(createReadOnlyNotice(
      'No momento seu acesso e restrito nesta opcao.',
      [
        'Consultar todos os repertorios;',
        'Incluir e editar novos repertorios;',
        'Alterar facilmente a sequencia das musicas;',
        'Usar os controles de execucao para ajustar tom, fonte, tema, capo e rolagem automatica.',
        'Definir regras de privacidade do repertorio criado;',
        'Consultar historico de alteracoes.',
      ],
    ));
  }

  return page;
}

async function createRepertorioUnifiedForm({ existingRepertorios = [], selectedRepertorio = null, initialName = '', onNew } = {}) {
  const wrapper = document.createElement('section');
  wrapper.className = 'new-repertorio-panel';
  wrapper.innerHTML = '<p class="page-status">Carregando musicas...</p>';

  const [
    { data: musicas, error },
    { data: users, error: usersError },
    { data: musicasAssociadas, error: musicasAssociadasError },
    { data: compartilhamentos, error: compartilhamentosError },
    { data: historico, error: historicoError },
  ] = await Promise.all([
    listMusicas(),
    listShareableProfiles(),
    ...(selectedRepertorio ? [
      listMusicasDoRepertorio(selectedRepertorio.id),
      listRepertorioCompartilhamentos(selectedRepertorio.id),
      listRepertorioHistorico(selectedRepertorio.id),
    ] : [
      Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
    ]),
  ]);

  if (error) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar as musicas.')}</p>`;
    return wrapper;
  }
  if (usersError) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(usersError.message || 'Nao foi possivel carregar os usuarios.')}</p>`;
    return wrapper;
  }
  if (musicasAssociadasError) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(musicasAssociadasError.message || 'Nao foi possivel carregar as musicas do repertorio.')}</p>`;
    return wrapper;
  }
  if (compartilhamentosError) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(compartilhamentosError.message || 'Nao foi possivel carregar os compartilhamentos.')}</p>`;
    return wrapper;
  }
  if (historicoError) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(historicoError.message || 'Nao foi possivel carregar o historico.')}</p>`;
    return wrapper;
  }

  wrapper.replaceChildren(createNewRepertorioComposer(musicas || [], users || [], existingRepertorios, {
    selectedRepertorio,
    musicasAssociadas: musicasAssociadas || [],
    compartilhamentos: compartilhamentos || [],
    historico: historico || [],
    initialName,
    onNew,
  }));
  return wrapper;
}

function createNewRepertorioComposer(musicas, users, existingRepertorios = [], options = {}) {
  const selectedRepertorio = options.selectedRepertorio || null;
  const isEditing = Boolean(selectedRepertorio?.id);
  const initialName = selectedRepertorio?.nome || options.initialName || '';
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
        <input name="nome" type="hidden" required value="${escapeHtml(initialName)}">

        <label>
          Data
          <input name="data" type="date" value="${escapeHtml(selectedRepertorio?.data || '')}">
        </label>
      </div>
      <label class="repertorio-song-search-field">
        Buscar musica
        <input class="song-search-input" type="search" placeholder="Buscar por musica ou artista" autocomplete="off">
      </label>
      <div class="song-search-results" hidden></div>
      <div class="selected-repertorio-songs"></div>
    </section>

    <section class="repertorio-form-section repertorio-music-fields">
    </section>

    <div class="repertorio-save-bar">
      <button class="button" type="submit" disabled>${isEditing ? 'Salvar alteracoes' : 'Salvar repertorio'}</button>
      <p class="form-message" aria-live="polite"></p>
    </div>
    <section class="repertorio-history-panel" hidden>
      <div class="repertorio-history-dialog" role="dialog" aria-modal="false" aria-label="Historico de alteracoes">
        <div class="repertorio-history-header">
          <h2>Historico de alteracoes</h2>
          <button class="nav-button" type="button" data-action="close-history">Fechar</button>
        </div>
        <div class="history-slot"></div>
      </div>
    </section>
  `;

  const nomeInput = form.querySelector('[name="nome"]');
  form.querySelector('.repertorio-title-date-grid').append(RepertorioPrivacyFields({
    users,
    initialValues: {
      visibilidade: selectedRepertorio?.visibilidade || 'publico',
      permite_edicao_compartilhada: Boolean(selectedRepertorio?.permite_edicao_compartilhada),
      compartilhado_com: (options.compartilhamentos || []).map((item) => item.user_id),
    },
  }));
  const searchInput = form.querySelector('.song-search-input');
  const resultsSlot = form.querySelector('.song-search-results');
  const selectedSlot = form.querySelector('.selected-repertorio-songs');
  const submitButton = form.querySelector('button[type="submit"]');
  const message = form.querySelector('.form-message');
  const selectedMusicas = (options.musicasAssociadas || [])
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

  renderInlineActions();

  function updateSubmitState() {
    submitButton.disabled = !nomeInput.value.trim();
  }

  function renderResults() {
    const query = normalizeText(searchInput.value);
    const selectedIds = new Set(selectedMusicas.map((musica) => musica.id));
    const filtered = sortedMusicas
      .filter((musica) => !selectedIds.has(musica.id))
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
        <span>Tom: ${escapeHtml(getField(musica, ['tom', 'key']))}</span>
      `;

      item.addEventListener('click', () => {
        selectedMusicas.push({
          ...musica,
          observacao: '',
        });
        searchInput.value = '';
        message.textContent = '';
        message.className = 'form-message';
        renderSelected();
        renderResults();
        resultsSlot.hidden = false;
        searchInput.focus();
        updateSubmitState();
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
        </div>
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
      });

      row.querySelector('.selected-repertorio-remove').addEventListener('click', () => {
        selectedMusicas.splice(index, 1);
        renderSelected();
        renderResults();
        updateSubmitState();
      });
      row.querySelector('.selected-repertorio-song-moment input').addEventListener('input', (event) => {
        selectedMusicas[index].observacao = event.target.value.trim();
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

  nomeInput.addEventListener('input', updateSubmitState);

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

    if (!nomeInput.value.trim()) {
      message.className = 'form-message error';
      message.textContent = 'Informe o nome do repertorio.';
      nomeInput.focus();
      return;
    }

    if (existingNames.has(normalizeText(nomeInput.value))) {
      message.className = 'form-message error';
      message.textContent = 'Ja existe um repertorio cadastrado com esse nome.';
      nomeInput.focus();
      return;
    }

    if (!selectedMusicas.length) {
      message.className = 'form-message error';
      message.textContent = 'Inclua pelo menos uma musica antes de salvar o repertorio.';
      selectedSlot.innerHTML = '<p class="page-status error">Inclua pelo menos uma musica antes de salvar.</p>';
      searchInput.focus();
      return;
    }

    submitButton.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    const formData = new FormData(form);
    const privacyValues = getRepertorioPrivacyValues(form);
    if (privacyValues.repertorio.visibilidade === 'seletivo' && !privacyValues.compartilhadoCom.length) {
      message.className = 'form-message error';
      message.textContent = 'Selecione pelo menos um usuario para o compartilhamento seletivo.';
      updateSubmitState();
      return;
    }

    if (isEditing) {
      const { error: updateError } = await updateRepertorio(selectedRepertorio.id, {
        nome: String(formData.get('nome') || '').trim(),
        data: String(formData.get('data') || '') || null,
        ...privacyValues.repertorio,
      });

      if (updateError) {
        message.className = 'form-message error';
        message.textContent = updateError.message || 'Nao foi possivel salvar o repertorio.';
        updateSubmitState();
        return;
      }

      const { error: musicasError } = await replaceMusicasDoRepertorio(selectedRepertorio.id, selectedMusicas);

      if (musicasError) {
        message.className = 'form-message error';
        message.textContent = musicasError.message || 'Nao foi possivel salvar as musicas do repertorio.';
        updateSubmitState();
        return;
      }

      const { error: compartilhamentoError } = await replaceRepertorioCompartilhamentos(selectedRepertorio.id, privacyValues.compartilhadoCom);

      if (compartilhamentoError) {
        message.className = 'form-message error';
        message.textContent = compartilhamentoError.message || 'Nao foi possivel salvar o compartilhamento.';
        updateSubmitState();
        return;
      }

      message.className = 'form-message success';
      message.textContent = 'Repertorio atualizado com sucesso.';
      window.location.href = '/repertorios';
      return;
    }

    const { error: saveError } = await createRepertorioComMusicas({
      nome: String(formData.get('nome') || '').trim(),
      data: String(formData.get('data') || '') || null,
      ...privacyValues.repertorio,
    }, selectedMusicas, privacyValues.compartilhadoCom);

    if (saveError) {
      message.className = 'form-message error';
      message.textContent = saveError.message || 'Nao foi possivel salvar o repertorio.';
      updateSubmitState();
      return;
    }

    message.className = 'form-message success';
    message.textContent = 'Repertorio salvo com sucesso.';
    window.location.reload();
  });

  renderSelected();
  renderResults();
  updateSubmitState();

  return form;

  function renderInlineActions() {
    if (!isEditing) return;

    const actions = form.querySelector('.repertorio-inline-actions');
    actions.innerHTML = `
      <button class="button-link secondary" type="button" data-action="new">Novo</button>
      <a class="button-link" href="/repertorios/execucao?id=${encodeURIComponent(selectedRepertorio.id)}">Execucao</a>
      <button class="nav-button" type="button" data-action="duplicate">Duplicar</button>
      <button class="nav-button" type="button" data-action="history">Historico</button>
      <button class="danger-button" type="button" data-action="delete">Excluir</button>
    `;

    actions.querySelector('[data-action="new"]').addEventListener('click', () => {
      if (options.onNew) options.onNew();
    });

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

    actions.querySelector('[data-action="history"]').addEventListener('click', () => {
      const panel = form.querySelector('.repertorio-history-panel');
      const isOpening = panel.hidden;
      panel.hidden = !isOpening;
      actions.querySelector('[data-action="history"]').textContent = isOpening ? 'Ocultar historico' : 'Historico';
    });

    form.querySelector('[data-action="close-history"]').addEventListener('click', closeHistoryPanel);

    form.querySelector('.repertorio-history-panel').addEventListener('click', (event) => {
      if (event.target !== event.currentTarget) return;

      closeHistoryPanel();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      closeHistoryPanel();
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

    form.querySelector('.history-slot').append(createHistoryList(options.historico || []));

    function closeHistoryPanel() {
      const panel = form.querySelector('.repertorio-history-panel');
      if (!panel || panel.hidden) return;

      panel.hidden = true;
      actions.querySelector('[data-action="history"]').textContent = 'Historico';
    }
  }
}

function createHistoryList(items = []) {
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma alteracao registrada ainda.';
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'repertorio-history-list';

  items.slice(0, 80).forEach((item) => {
    const row = document.createElement('article');
    row.className = 'repertorio-history-item';
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.acao || 'Alteracao')}</strong>
        <span>${escapeHtml(formatHistoryDetails(item.detalhes))}</span>
      </div>
      <small>${escapeHtml([item.usuario_nome || 'Usuario', formatDateTime(item.created_at)].filter(Boolean).join(' - '))}</small>
    `;
    list.append(row);
  });

  return list;
}

function formatHistoryDetails(details) {
  if (!details || typeof details !== 'object') {
    return '';
  }

  const values = [
    details.musica,
    details.usuario,
    details.nome_novo && details.nome_anterior !== details.nome_novo ? `Nome: ${details.nome_novo}` : '',
    details.visibilidade_nova && details.visibilidade_anterior !== details.visibilidade_nova ? `Privacidade: ${details.visibilidade_nova}` : '',
    details.ordem_nova && details.ordem_anterior !== details.ordem_nova ? `Ordem: ${details.ordem_nova}` : '',
    details.tom_novo && details.tom_anterior !== details.tom_novo ? `Tom: ${details.tom_novo}` : '',
    details.observacao_nova && details.observacao_anterior !== details.observacao_nova ? `Momento: ${details.observacao_nova}` : '',
  ].filter(Boolean);

  return values.join(' | ');
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
    getField(musica, ['tags']),
  ].join(' ')).includes(query);
}

function formatMusicaName(musica) {
  const titulo = getField(musica, ['titulo', 'nome', 'title']);
  const artista = getField(musica, ['artista', 'autor', 'artist']);
  return artista && artista !== '-' ? `${titulo} - ${artista}` : titulo;
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
    ? 'Digite um nome para buscar. Se nenhum repertorio existir com esse nome, ele sera preparado como novo repertorio.'
    : 'Digite um nome ou data para buscar repertorios.';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label class="repertorio-library-search">
        <span>${options.canEdit ? 'Nome do repertorio' : 'Buscar na lista'}</span>
        <input class="search-input" type="search" placeholder="${options.canEdit ? 'Digite o nome do repertorio' : 'Nome, data ou tema'}" aria-describedby="repertorio-search-help">
      </label>
      <p class="form-hint" id="repertorio-search-help">${editableHint}</p>
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;
  let currentResults = [];
  let createDraftTimer = null;
  let lastDraftName = '';

  function getSearchValue() {
    return searchInput.value.trim();
  }

  function scheduleCreateDraft() {
    if (!options.onCreateDraft) return;

    window.clearTimeout(createDraftTimer);
    createDraftTimer = window.setTimeout(() => {
      const value = getSearchValue();
      const exactMatch = findExactRepertorio(value);

      if (!value || exactMatch || normalizeText(value) === normalizeText(lastDraftName)) return;

      lastDraftName = value;
      options.onCreateDraft(value);
    }, 220);
  }

  function findExactRepertorio(value) {
    const query = normalizeText(value);
    if (!query) return null;

    return repertorios.find((repertorio) => normalizeText(getField(repertorio, ['nome', 'titulo', 'name'])) === query) || null;
  }

  function selectRepertorio(repertorio) {
    window.clearTimeout(createDraftTimer);
    lastDraftName = '';
    if (!options.onSelect) {
      window.location.href = getRepertorioUrl(repertorio);
      return;
    }

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
        ? 'Nenhum repertorio encontrado. O formulario abaixo sera preparado para incluir este nome.'
        : 'Nenhum repertorio encontrado para esta busca.'));
      return;
    }

    tableSlot.replaceChildren(createRepertoriosTable(currentResults, {
      ...options,
      onSelect: options.onSelect ? selectRepertorio : null,
    }));
  }

  searchInput.addEventListener('input', () => {
    render();
    tableSlot.hidden = false;
    scheduleCreateDraft();
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

    if (options.onCreateDraft && getSearchValue()) {
      window.clearTimeout(createDraftTimer);
      lastDraftName = getSearchValue();
      options.onCreateDraft(getSearchValue());
      tableSlot.hidden = true;
    }
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
  return `/repertorios/execucao?id=${encodeURIComponent(getField(repertorio, ['id']))}`;
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

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
