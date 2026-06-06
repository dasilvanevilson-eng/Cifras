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
  page.className = 'page repertorios-page';
  page.innerHTML = `
    <header class="repertorios-header">
      <div>
        <h1>Repertorios</h1>
        <p>Montagem, edicao e execucao dos repertorios do ministerio.</p>
      </div>
      <div class="repertorios-summary" aria-live="polite">
        <span><strong data-count="repertorios">0</strong> repertorios</span>
      </div>
    </header>
    <section class="repertorios-search-panel">
      <div class="list-slot">
        <div class="page-status">Carregando repertorios...</div>
      </div>
    </section>
    <section class="repertorios-form-panel">
      <div class="form-slot"></div>
    </section>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');
  const repertoriosCount = page.querySelector('[data-count="repertorios"]');
  let loadedRepertorios = [];

  async function renderForm(selectedRepertorio = null) {
    if (!canEdit) return;

    formSlot.innerHTML = '<p class="page-status">Carregando formulario...</p>';
    formSlot.replaceChildren(await createRepertorioUnifiedForm({
      existingRepertorios: loadedRepertorios,
      selectedRepertorio,
      onNew: () => renderForm(),
    }));
  }

  try {
    const { data, error } = await listRepertorios();

    if (error) {
      throw error;
    }

    loadedRepertorios = data || [];
    repertoriosCount.textContent = String(loadedRepertorios.length);

    if (!loadedRepertorios.length) {
      listSlot.replaceChildren(createRepertoriosBrowser([], { onSelect: renderForm }));
    } else {
      listSlot.replaceChildren(createRepertoriosBrowser(loadedRepertorios, { onSelect: renderForm }));
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

async function createRepertorioUnifiedForm({ existingRepertorios = [], selectedRepertorio = null, onNew } = {}) {
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
    onNew,
  }));
  return wrapper;
}

function createNewRepertorioComposer(musicas, users, existingRepertorios = [], options = {}) {
  const selectedRepertorio = options.selectedRepertorio || null;
  const isEditing = Boolean(selectedRepertorio?.id);
  const form = document.createElement('form');
  form.className = 'form new-repertorio-form';
  form.innerHTML = `
    <section class="repertorio-form-section repertorio-basic-fields">
      <div class="repertorio-form-heading">
        <h2>${isEditing ? 'Editar repertorio' : 'Novo repertorio'}</h2>
        <div class="repertorio-inline-actions"></div>
      </div>
      <div class="repertorio-title-date-grid">
        <label>
          Nome
          <input name="nome" type="text" required value="${escapeHtml(selectedRepertorio?.nome || '')}">
        </label>

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
        <h2>Historico de alteracoes</h2>
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

    selectedMusicas.forEach((musica, index) => {
      const row = document.createElement('article');
      row.className = 'selected-repertorio-song';
      row.draggable = true;
      row.dataset.index = String(index);
      row.title = 'Arraste para reposicionar';
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(formatMusicaName(musica))}</strong>
        </div>
        <label class="selected-repertorio-song-moment">
          <input type="text" maxlength="80" value="${escapeHtml(musica.observacao || '')}" placeholder="Entrada, louvor...">
        </label>
        <button class="danger-button icon-button" type="button" aria-label="Remover musica">&#128465;</button>
      `;

      row.addEventListener('dragstart', (event) => {
        draggedMusicaIndex = index;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        draggedMusicaIndex = null;
        row.classList.remove('is-dragging');
        selectedSlot.querySelectorAll('.selected-repertorio-song').forEach((item) => {
          item.classList.remove('is-drop-target');
        });
      });

      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (draggedMusicaIndex === null || draggedMusicaIndex === index) return;

        selectedSlot.querySelectorAll('.selected-repertorio-song').forEach((item) => {
          item.classList.remove('is-drop-target');
        });
        row.classList.add('is-drop-target');
      });

      row.addEventListener('drop', (event) => {
        event.preventDefault();
        if (draggedMusicaIndex === null || draggedMusicaIndex === index) return;

        const [draggedMusica] = selectedMusicas.splice(draggedMusicaIndex, 1);
        selectedMusicas.splice(index, 0, draggedMusica);
        draggedMusicaIndex = null;
        renderSelected();
      });

      row.querySelector('.danger-button').addEventListener('click', () => {
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
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label>
        Buscar repertorio
        <input class="search-input" type="search" placeholder="Nome ou data">
      </label>
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;
  let currentResults = [];

  function selectRepertorio(repertorio) {
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
      tableSlot.replaceChildren(createStatus('Nenhum repertorio encontrado para esta busca.'));
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
    if (event.key !== 'Enter' || !currentResults.length) return;

    event.preventDefault();
    selectRepertorio(currentResults[0]);
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
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nome</th>
        <th>Data</th>
        ${options.onSelect ? '<th>Acao</th>' : ''}
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  repertorios.forEach((repertorio) => {
    const row = document.createElement('tr');
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);

    row.className = options.onSelect ? 'clickable-row' : '';
    row.tabIndex = options.onSelect ? 0 : -1;
    row.innerHTML = `
      <td>${options.onSelect
        ? `<button class="link-button repertorio-select-link" type="button">${escapeHtml(nome)}</button>`
        : `<a href="${escapeHtml(getRepertorioUrl(repertorio))}">${escapeHtml(nome)}</a>`}</td>
      <td>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</td>
      ${options.onSelect ? '<td><button class="nav-button" type="button">Editar</button></td>' : ''}
    `;

    if (options.onSelect) {
      const select = () => options.onSelect(repertorio);
      row.addEventListener('click', select);
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        select();
      });
      row.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          select();
        });
      });
    }

    body.append(row);
  });

  return table;
}

function getRepertorioUrl(repertorio) {
  return `/repertorios/detalhe?id=${encodeURIComponent(getField(repertorio, ['id']))}`;
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
