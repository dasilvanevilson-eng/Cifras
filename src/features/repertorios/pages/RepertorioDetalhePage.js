import { listMusicas } from '../../../services/musicasService.js';
import {
  addMusicaToRepertorio,
  deleteRepertorio,
  duplicateRepertorio,
  getRepertorioById,
  listMusicasDoRepertorio,
  removeMusicaDoRepertorio,
  updateOrdemMusicaRepertorio,
} from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';
import { addRecentItem } from '../../../utils/recentItems.js';

export async function RepertorioDetalhePage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const returnTo = params.get('returnTo') || '/repertorios';

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Repertorio nao informado.';
    return page;
  }

  try {
    const [{ data: repertorio, error: repertorioError }, musicasAssociadas, { data: musicas, error: musicasError }] = await Promise.all([
      getRepertorioById(id),
      loadMusicasDoRepertorio(id),
      listMusicas(),
    ]);

    if (repertorioError) throw repertorioError;
    if (musicasError) throw musicasError;

    addRecentItem({
      type: 'repertorio',
      label: getField(repertorio, ['nome', 'titulo', 'name']),
      detail: formatDate(getField(repertorio, ['data', 'date'])),
      url: `/repertorios/detalhe?id=${encodeURIComponent(id)}`,
    });

    page.replaceChildren(createRepertorioView({
      repertorio,
      musicasAssociadas,
      musicas: musicas || [],
      canEdit: canEditContent(session?.profile?.papel),
      returnTo,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

async function loadMusicasDoRepertorio(repertorioId) {
  const { data, error } = await listMusicasDoRepertorio(repertorioId);

  if (error) {
    throw error;
  }

  return data || [];
}

function createRepertorioView({ repertorio, musicasAssociadas, musicas, canEdit, returnTo }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'repertorio-detail-page';
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);

  wrapper.innerHTML = `
    <div class="page-actions">
      <a class="button-link secondary icon-action back-icon-action" href="${escapeHtml(returnTo || '/repertorios')}" aria-label="Voltar" title="Voltar">&larr;</a>
      <a class="button-link" href="/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}">Execucao</a>
    </div>
    <header class="song-header repertorio-header">
      <h1>${escapeHtml(nome)}</h1>
    </header>
    <div class="page-grid repertorio-detail-grid">
      <section class="editor-panel">
        <div class="form-slot"></div>
      </section>
      <section>
        <h2>Musicas do repertorio</h2>
        <div class="list-slot"></div>
      </section>
    </div>
  `;

  const formSlot = wrapper.querySelector('.form-slot');
  const listSlot = wrapper.querySelector('.list-slot');
  const editorPanel = wrapper.querySelector('.editor-panel');
  const actions = wrapper.querySelector('.page-actions');

  if (canEdit) {
    actions.append(createEditLink(repertorio.id));
    actions.append(createDuplicateButton(repertorio, musicasAssociadas));
    actions.append(createDeleteButton(repertorio.id, nome));
    formSlot.append(createAddMusicaForm({
      repertorioId: repertorio.id,
      musicas,
      musicasAssociadas,
      proximaOrdem: musicasAssociadas.length + 1,
    }));
  } else {
    editorPanel.remove();
  }

  listSlot.append(createMusicasList(normalizeOrder(musicasAssociadas), { canEdit }));

  return wrapper;
}

function createEditLink(repertorioId) {
  const link = document.createElement('a');
  link.className = 'button-link secondary';
  link.href = `/repertorios/editar?id=${encodeURIComponent(repertorioId)}`;
  link.textContent = 'Editar';
  return link;
}

function createDuplicateButton(repertorio, musicasAssociadas) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-button';
  button.textContent = 'Duplicar';

  button.addEventListener('click', async () => {
    const confirmed = window.confirm('Duplicar este repertorio com as mesmas musicas e ordem?');
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Duplicando...';

    const { data, error } = await duplicateRepertorio(repertorio, normalizeOrder(musicasAssociadas));

    if (error) {
      button.disabled = false;
      button.textContent = 'Duplicar';
      window.alert(error.message || 'Nao foi possivel duplicar o repertorio.');
      return;
    }

    window.location.href = `/repertorios/detalhe?id=${encodeURIComponent(data.id)}`;
  });

  return button;
}

function createDeleteButton(repertorioId, nome) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger-button';
  button.textContent = 'Excluir';

  button.addEventListener('click', async () => {
    const confirmed = window.confirm(`Excluir o repertorio "${nome}"? Esta acao tambem remove as associacoes de musicas deste repertorio.`);
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Excluindo...';

    const { error } = await deleteRepertorio(repertorioId);

    if (error) {
      button.disabled = false;
      button.textContent = 'Excluir';
      window.alert(error.message || 'Nao foi possivel excluir o repertorio.');
      return;
    }

    window.location.href = '/repertorios';
  });

  return button;
}

function createAddMusicaForm({ repertorioId, musicas, musicasAssociadas, proximaOrdem }) {
  const form = document.createElement('form');
  form.className = 'form add-repertorio-song-form';
  form.innerHTML = `
    <label>
      <input class="song-search-input" type="search" placeholder="Buscar por musica ou artista para acrescentar ao repertorio" autocomplete="off" aria-label="Buscar musica">
      <input name="musica_id" type="hidden" required>
    </label>
    <div class="song-search-results" hidden></div>
    <button class="button" type="submit">Adicionar ao repertorio</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const searchInput = form.querySelector('.song-search-input');
  const musicaIdInput = form.querySelector('[name="musica_id"]');
  const resultsSlot = form.querySelector('.song-search-results');
  const message = form.querySelector('.form-message');
  const button = form.querySelector('button');
  const musicasAdicionadas = new Set(
    musicasAssociadas
      .map((item) => item.musica_id)
      .filter(Boolean),
  );
  const musicasOrdenadas = sortMusicasByName(musicas);
  let isPointerInsideResults = false;

  function renderResults() {
    const query = normalizeText(searchInput.value);
    musicaIdInput.value = '';
    message.textContent = '';
    message.className = 'form-message';

    const filtered = musicasOrdenadas
      .filter((musica) => matchesMusicaSearch(musica, query))
      .slice(0, 60);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhuma musica encontrada.';
      resultsSlot.replaceChildren(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'song-search-list';

    filtered.forEach((musica) => {
      const item = document.createElement('button');
      const isAdded = musicasAdicionadas.has(musica.id);
      item.type = 'button';
      item.className = 'song-search-item';
      item.disabled = isAdded;
      item.innerHTML = `
        <strong>${escapeHtml(formatMusicaName(musica))}</strong>
        <span>${isAdded ? 'Ja esta neste repertorio' : `Tom: ${escapeHtml(getField(musica, ['tom', 'key']))}`}</span>
      `;

      item.addEventListener('click', () => {
        searchInput.value = formatMusicaName(musica);
        musicaIdInput.value = musica.id;
        resultsSlot.hidden = true;
        message.textContent = '';
        message.className = 'form-message';
      });

      list.append(item);
    });

    resultsSlot.replaceChildren(list);
  }

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

  renderResults();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const musicaId = String(formData.get('musica_id') || '');
    const musicaSelecionada = musicas.find((musica) => musica.id === musicaId);
    const tom = getField(musicaSelecionada || {}, ['tom', 'key']);

    if (!musicaSelecionada) {
      message.className = 'form-message error';
      message.textContent = 'Selecione uma musica da lista de busca.';
      searchInput.focus();
      resultsSlot.hidden = false;
      renderResults();
      return;
    }

    if (musicasAdicionadas.has(musicaId)) {
      message.className = 'form-message error';
      message.textContent = 'Esta musica ja esta no repertorio.';
      return;
    }

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Adicionando...';

    try {
      const { error } = await addMusicaToRepertorio(repertorioId, musicaId, proximaOrdem, tom !== '-' ? tom : null);

      if (error) {
        throw error;
      }

      window.location.reload();
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel adicionar a musica.';
      button.disabled = false;
    }
  });

  return form;
}

function createMusicasList(items, options = {}) {
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma musica adicionada ainda.';
    return empty;
  }

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Ordem</th>
        <th>Musica</th>
        ${options.canEdit ? '<th>Eliminar</th>' : ''}
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  items.forEach((item, index) => {
    const musica = item.musicas || {};
    const musicaExcluida = isMusicaExcluida(item);
    const tom = getField(item, ['tom']) !== '-' ? getField(item, ['tom']) : getField(musica, ['tom', 'key']);
    const musicaUrl = !musicaExcluida
      ? `/musicas/detalhe?id=${encodeURIComponent(item.musica_id)}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}&associationId=${encodeURIComponent(item.id)}&repertorioTom=${encodeURIComponent(tom)}`
      : null;
    const musicaNome = formatRepertorioMusicaTitle(item);
    const row = document.createElement('tr');
    row.className = musicaExcluida ? 'deleted-repertorio-song' : '';
    row.draggable = Boolean(options.canEdit);
    row.dataset.index = String(index);
    row.innerHTML = `
      <td>${escapeHtml(item.ordem || '-')}</td>
      <td>${musicaUrl
        ? `<a href="${escapeHtml(musicaUrl)}">${escapeHtml(musicaNome)}</a>`
        : `<span>${escapeHtml(musicaNome)}</span><small>Musica excluida do acervo</small>`}</td>
      ${options.canEdit ? '<td></td>' : ''}
    `;

    if (options.canEdit) {
      const actionsCell = row.querySelector('td:last-child');
      actionsCell.className = 'table-actions';
      actionsCell.append(createRemoveButton(item.id));
    }

    body.append(row);
  });

  if (options.canEdit) {
    setupDragReorder(body, items);
  }

  return table;
}

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function setupDragReorder(body, items) {
  let draggedIndex = null;

  body.addEventListener('dragstart', (event) => {
    const row = event.target.closest('tr');
    if (!row) return;

    draggedIndex = Number(row.dataset.index);
    row.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
  });

  body.addEventListener('dragend', (event) => {
    event.target.closest('tr')?.classList.remove('is-dragging');
    [...body.querySelectorAll('tr')].forEach((row) => row.classList.remove('is-drop-target'));
  });

  body.addEventListener('dragover', (event) => {
    event.preventDefault();
    const row = event.target.closest('tr');
    if (!row) return;

    [...body.querySelectorAll('tr')].forEach((item) => item.classList.remove('is-drop-target'));
    row.classList.add('is-drop-target');
  });

  body.addEventListener('drop', async (event) => {
    event.preventDefault();
    const row = event.target.closest('tr');
    if (!row || draggedIndex === null) return;

    const targetIndex = Number(row.dataset.index);
    [...body.querySelectorAll('tr')].forEach((item) => item.classList.remove('is-drop-target'));

    if (targetIndex === draggedIndex) return;

    const reordered = [...items];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    try {
      await saveNewOrder(reordered);
      window.location.reload();
    } catch (error) {
      window.alert(error.message || 'Nao foi possivel alterar a ordem.');
    }
  });
}

async function saveNewOrder(items) {
  const results = await Promise.all(items.map((item, index) => (
    updateOrdemMusicaRepertorio(item.id, index + 1)
  )));

  const failed = results.find((result) => result.error);

  if (failed) {
    throw failed.error;
  }
}

function createMoveButton(label, items, index, direction) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-button icon-button';
  button.textContent = direction < 0 ? '↑' : '↓';
  button.setAttribute('aria-label', label);
  button.title = label;

  const targetIndex = index + direction;
  const canMove = targetIndex >= 0 && targetIndex < items.length;
  button.disabled = !canMove;

  button.addEventListener('click', async () => {
    if (!canMove) return;

    const current = items[index];
    const target = items[targetIndex];

    button.disabled = true;
    button.textContent = '…';

    const { error } = await swapOrdemMusicasRepertorio(current.id, target.id);

    if (error) {
      button.disabled = false;
      button.textContent = direction < 0 ? '↑' : '↓';
      window.alert(error.message || 'Nao foi possivel alterar a ordem.');
      return;
    }

    window.location.reload();
  });

  return button;
}

function createRemoveButton(associationId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger-button icon-button trash-action';
  button.textContent = '×';
  button.setAttribute('aria-label', 'Remover musica');
  button.title = 'Remover';
  button.innerHTML = '&#128465;';

  button.addEventListener('click', async () => {
    const confirmed = window.confirm('Remover esta musica do repertorio?');
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = '…';

    const { error } = await removeMusicaDoRepertorio(associationId);
    button.innerHTML = '&#128465;';

    if (error) {
      button.disabled = false;
      button.textContent = '×';
      button.innerHTML = '&#128465;';
      window.alert(error.message || 'Nao foi possivel remover a musica.');
      return;
    }

    window.location.reload();
  });

  return button;
}

function isMusicaExcluida(item) {
  return Boolean(item?.musica_excluida_em || !item?.musica_id || !item?.musicas);
}

function formatRepertorioMusicaName(item) {
  if (isMusicaExcluida(item)) {
    const titulo = getField(item, ['musica_titulo']);
    const artista = getField(item, ['musica_artista']);
    const nome = artista && artista !== '-' ? `${titulo} - ${artista}` : titulo;
    return `${nome} (excluida)`;
  }

  return formatMusicaName(item.musicas || {});
}

function formatRepertorioMusicaTitle(item) {
  if (isMusicaExcluida(item)) {
    return `${getField(item, ['musica_titulo'])} (excluida)`;
  }

  return getField(item.musicas || {}, ['titulo', 'nome', 'title']);
}

function formatMusicaName(musica) {
  const titulo = getField(musica, ['titulo', 'nome', 'title']);
  const artista = getField(musica, ['artista', 'autor', 'artist']);
  return artista && artista !== '-' ? `${titulo} - ${artista}` : titulo;
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
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
